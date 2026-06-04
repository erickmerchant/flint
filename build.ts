import type { FlintConfig, FlintRoute } from "./mod.ts";
import * as Path from "@std/path";
import * as Fs from "@std/fs";
import rewrite from "./rewrite.ts";
import os from "node:os";
import { toUint8Array } from "./utils.ts";
import * as ETag from "@std/http/etag";
import { encodeBase32 } from "@std/encoding/base32";
import { crypto } from "@std/crypto";

export default async function (
  config: FlintConfig,
): Promise<{ urls: Record<string, string>; etags: Record<string, string> }> {
  const urls: Record<string, string> = {};
  const etags: Record<string, string> = {};

  config.urls = urls;

  const distDir = Path.join(Deno.cwd(), config.dist);
  const publicDir = Path.join(Deno.cwd(), config.src);

  await Deno.writeTextFile(
    Path.join(distDir, "builder.ts"),
    `
		import {onmessage} from "@flint/framework/build";
		import app from "${
      Path.relative(distDir, Path.join(Deno.cwd(), "flint.ts"))
    }";

		self.onmessage = onmessage(app.config())
	`,
  );

  const routeItems: Map<FlintRoute, Array<string>> = new Map();

  for (
    const route of config.routes.toSorted((a, b) =>
      a.fingerprint === b.fingerprint ? 0 : a.fingerprint ? -1 : 1
    )
  ) {
    if (route.cache) {
      const pathnames: Array<string> = await (typeof route.cache === "function"
        ? route.cache(publicDir)
        : route.cache);

      routeItems.set(route, pathnames);
    }
  }

  for (const [route, items] of routeItems) {
    const cacheResultPromises = [];

    for (let cpus = os.cpus().length; cpus > 0; cpus--) {
      let pathname = items.shift();

      if (!pathname) continue;

      const { resolve, promise } = Promise.withResolvers();
      const builder = new Worker(
        new URL(`file:///${Path.join(distDir, "builder.ts")}`).href,
        {
          type: "module",
        },
      );

      builder.postMessage({
        index: route.index,
        pathname,
        urls,
      });

      builder.onmessage = (e: MessageEvent<string>) => {
        if (route.fingerprint) {
          urls[pathname!] = e.data;
        } else {
          etags[pathname!] = e.data;
        }

        if (items.length) {
          pathname = items.shift()!;

          builder.postMessage({
            index: route.index,
            pathname,
            urls,
          });
        } else {
          builder.terminate();

          resolve(true);
        }
      };

      cacheResultPromises.push(promise);
    }

    await Promise.all(cacheResultPromises);
  }

  if (config.notFound) {
    const result = await config.notFound({
      request: new Request("file://404.html"),
      params: {},
      pathname: "404.html",
      src: config.src,
      dist: config.dist,
      urls: config.urls,
      sourcemap: false,
    });

    if (!(result instanceof Response)) {
      const path = Path.join(distDir, "files/404.html");

      await Fs.ensureDir(Path.dirname(path));

      const uint8Array = await toUint8Array(result);

      const rewritten = await rewrite(uint8Array, config);

      const str = new TextDecoder().decode(rewritten);

      await Deno.writeTextFile(
        path,
        str,
      );
    }
  }

  await Deno.writeTextFile(
    Path.join(distDir, "serve.ts"),
    `
		import serve from "@flint/framework/serve";
		import app from "${
      Path.relative(distDir, Path.join(Deno.cwd(), "flint.ts"))
    }";

		const urls : Record<string, string> = ${JSON.stringify(urls)};
		const etags : Record<string, string> = ${JSON.stringify(etags)};
		const config = app.config();

		config.urls = urls;
		config.etags = etags;

		const fetch = serve(config);

		export default { fetch }
	`,
  );

  return { urls, etags };
}

export function onmessage(
  config: FlintConfig,
): (e: MessageEvent) => Promise<void> {
  return async (e: MessageEvent) => {
    let { index, pathname, urls }: {
      index: number;
      pathname: string;
      urls: Record<string, string>;
    } = e.data;

    config.urls = urls;

    const route = config.routes.find((r) => r.index === index);
    const distDir = Path.join(Deno.cwd(), config.dist);
    let match: boolean | URLPatternResult | null = false;

    if (!route) {
      return;
    }

    if (typeof route.pattern === "string") {
      match = route.pattern === pathname;
    } else {
      match = route.pattern.exec(`file://${pathname}`);
    }

    if (match) {
      const request = new Request(`file://${pathname}`);
      const result = await route.handler({
        request,
        params: match === true ? {} : (match.pathname.groups ?? {}),
        pathname,
        src: config.src,
        dist: config.dist,
        urls: config.urls,
        sourcemap: false,
      });

      if (result instanceof Response) return;

      let unint8Array = await toUint8Array(result);

      if (pathname.endsWith("/")) {
        pathname += "index.html";
      }

      const buffer = await crypto.subtle.digest("SHA-256", unint8Array);
      const hash = encodeBase32(buffer).substring(0, 8);

      if (route.fingerprint) {
        pathname = Path.format({
          root: "/",
          dir: Path.dirname(pathname),
          ext: Path.extname(pathname),
          name: `${Path.basename(pathname, Path.extname(pathname))}-${hash}`,
        });
      }

      const filepath = Path.join(distDir, "files", pathname);

      await Fs.ensureDir(Path.dirname(filepath));

      if (filepath.endsWith(".html")) {
        unint8Array = await rewrite(unint8Array, config);
      }

      const etag = await ETag.eTag(unint8Array, { weak: true });

      if (route.fingerprint) {
        postMessage(pathname);
      } else {
        postMessage(etag);
      }

      await Deno.writeFile(filepath, unint8Array);
    }
  };
}
