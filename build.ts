import type { FlintConfig } from "./types.ts";
import * as Path from "@std/path";
import * as Fs from "@std/fs";
import { encodeBase64Url } from "@std/encoding/base64url";
import { crypto } from "@std/crypto";

export default async function (config: FlintConfig) {
  const urls: Record<string, string> = {};
  const etags: Record<string, string> = {};

  config.resolve = (key: string) => urls[key];

  const distDir = Path.join(Deno.cwd(), config.output);
  const publicDir = Path.join(Deno.cwd(), config.input);

  await Fs.emptyDir(distDir);

  await Fs.ensureDir(distDir);

  const routeItems = new Map();

  for (
    const route of config.routes.toSorted((a, b) =>
      a.fingerprint === b.fingerprint ? 0 : a.fingerprint ? -1 : 1
    )
  ) {
    const items: Array<string> = [];

    if (route.cache) {
      let item = route.cache;

      item = typeof item === "function" ? await item() : item;
      item = Array.isArray(item) ? item : [item];

      for (const pathname of item) {
        if (route.fingerprint && /[\:\*\(\{]/.test(pathname)) {
          for await (
            const { path } of Fs.expandGlob(
              Path.join(publicDir, "**/*"),
            )
          ) {
            const match = route.pattern.exec(`file://${pathname}`);

            if (match) {
              items.push(path.substring(publicDir.length));
            }
          }
        } else {
          items.push(pathname);
        }
      }
    }

    routeItems.set(route, items);
  }

  for (const [route, items] of routeItems) {
    for (let pathname of items) {
      const match = route.pattern.exec(`file://${pathname}`);

      if (match) {
        const request = new Request(`file://${pathname}`);
        let result = await route.callback({
          request,
          params: match?.pathname?.groups ?? {},
          pathname,
          input: config.input,
          output: config.output,
          resolve: config.resolve,
        });

        if (result instanceof Response) continue;

        if (typeof result === "string") {
          result = new TextEncoder().encode(result);
        }

        if (pathname.endsWith("/")) {
          pathname += "index.html";
        }

        const buffer = await crypto.subtle.digest("SHA-256", result);
        const hash = encodeBase64Url(buffer).substring(0, 16);

        if (route.fingerprint) {
          urls[pathname] = Path.format({
            root: "/",
            dir: Path.dirname(pathname),
            ext: Path.extname(pathname),
            name: `${Path.basename(pathname, Path.extname(pathname))}-${hash}`,
          });

          pathname = urls[pathname];
        } else {
          etags[pathname] = `W/"${hash}"`;
        }

        pathname = Path.join(distDir, "files", pathname);

        await Fs.ensureDir(Path.dirname(pathname));

        await Deno.writeFile(pathname, result);

        continue;
      }
    }
  }

  if (config.notFound) {
    let result = await config.notFound({
      request: new Request("file://404.html"),
      params: {},
      pathname: "404.html",
      input: config.input,
      output: config.output,
      resolve: config.resolve,
      sourcemap: false,
    });

    if (!(result instanceof Response)) {
      const path = Path.join(distDir, "files/404.html");

      await Fs.ensureDir(Path.dirname(path));

      if (typeof result === "string") {
        result = new TextEncoder().encode(result);
      }
      await Deno.writeFile(
        path,
        result,
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

		config.resolve = (key: string) => urls[key];
		config.etags = etags;

		const fetch = serve(config);

		export default {
			fetch(req: Request) {
				return fetch(req);
			}
		}
	`,
  );
}
