import type { FlintConfig } from "./mod.ts";
import * as ETag from "@std/http/etag";
import * as Path from "@std/path";
import * as Fs from "@std/fs";
import { encodeBase32 } from "@std/encoding/base32";
import { crypto } from "@std/crypto";
import rewrite from "./rewrite.ts";

export default (config: FlintConfig) => async (e: MessageEvent) => {
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
    self.close();

    return;
  }

  if (typeof route.pattern === "string") {
    match = route.pattern === pathname;
  } else {
    match = route.pattern.exec(`file://${pathname}`);
  }

  if (match) {
    const request = new Request(`file://${pathname}`);
    let result = await route.handler({
      request,
      params: match === true ? {} : (match.pathname.groups ?? {}),
      pathname,
      src: config.src,
      dist: config.dist,
      urls: config.urls,
      sourcemap: false,
      splitting: true,
    });

    if (result instanceof Response) return;

    if (typeof result === "string") {
      result = new TextEncoder().encode(result);
    }

    if (pathname.endsWith("/")) {
      pathname += "index.html";
    }

    const etag = await ETag.eTag(result, { weak: true });
    const buffer = await crypto.subtle.digest("SHA-256", result);
    const hash = encodeBase32(buffer).substring(0, 8);

    if (route.fingerprint) {
      pathname = Path.format({
        root: "/",
        dir: Path.dirname(pathname),
        ext: Path.extname(pathname),
        name: `${Path.basename(pathname, Path.extname(pathname))}-${hash}`,
      });

      postMessage(pathname);
    } else {
      postMessage(etag);
    }

    const filepath = Path.join(distDir, "files", pathname);

    await Fs.ensureDir(Path.dirname(filepath));

    if (filepath.endsWith(".html")) {
      result = await rewrite(result, pathname, config, true);

      result = new TextEncoder().encode(result);
    }

    await Deno.writeFile(filepath, result);
  }
  self.close();
};
