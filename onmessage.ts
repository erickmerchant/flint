import type { FlintConfig } from "@flint/framework";
import * as Path from "@std/path";
import * as Fs from "@std/fs";
import { encodeBase64Url } from "@std/encoding/base64url";
import { crypto } from "@std/crypto";

export default (config: FlintConfig) => async (e: MessageEvent) => {
  let { index, pathname, urls }: {
    index: number;
    pathname: string;
    urls: Record<string, string>;
  } = e.data;

  config.resolve = (key: string) => urls[key];

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
      resolve: config.resolve,
      sourcemap: false,
    });

    if (result instanceof Response) return;

    if (typeof result === "string") {
      result = new TextEncoder().encode(result);
    }

    if (pathname.endsWith("/")) {
      pathname += "index.html";
    }

    const buffer = await crypto.subtle.digest("SHA-256", result);
    const hash = encodeBase64Url(buffer).substring(0, 16);

    if (route.fingerprint) {
      pathname = Path.format({
        root: "/",
        dir: Path.dirname(pathname),
        ext: Path.extname(pathname),
        name: `${Path.basename(pathname, Path.extname(pathname))}-${hash}`,
      });

      postMessage(pathname);
    } else {
      postMessage(`W/"${hash}"`);
    }

    pathname = Path.join(distDir, "files", pathname);

    await Fs.ensureDir(Path.dirname(pathname));

    await Deno.writeFile(pathname, result);
  }
  self.close();
};
