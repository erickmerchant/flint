import type { FlintConfig } from "./mod.ts";
import * as Path from "@std/path";
import * as ETag from "@std/http/etag";
import { contentType } from "@std/media-types";
import rewrite from "./rewrite.ts";

const fingerprintURLPattern = new URLPattern({
  pathname: "*-([A-Z2-7]{8}).*",
});

export default function (
  config: FlintConfig,
): (req: Request) => Promise<Response> {
  const distDir = Path.join(Deno.cwd(), config.dist);

  return async function (req: Request): Promise<Response> {
    const url = new URL(req.url);

    try {
      const headers: Record<string, string> = {};
      const hasFingerprint = fingerprintURLPattern.test(url);

      if (hasFingerprint) {
        headers["Cache-Control"] = "public, max-age=31536000, immutable";
      }

      let pathname = url.pathname;

      if (
        config.etags != null &&
        config.etags[pathname]
      ) {
        const ifNoneMatch = req.headers.get("If-None-Match");

        if (
          ifNoneMatch &&
          ifNoneMatch == config.etags[pathname]
        ) {
          return new Response(null, { status: 304 });
        } else {
          headers.ETag = config.etags[pathname];
        }
      }

      if (pathname.endsWith("/")) {
        pathname += "index.html";
      }

      const result = await Deno.readFile(
        Path.join(Deno.cwd(), config.dist, "files", pathname),
      );
      const type = contentType(Path.extname(pathname)) ?? "text/plain";

      headers["Content-Type"] = type;

      return new Response(result, {
        status: 200,
        headers,
      });
    } catch (_) {
      //
    }

    try {
      for (const route of config.routes) {
        let match: boolean | URLPatternResult | null = false;

        if (typeof route.pattern === "string") {
          match = route.pattern === url.pathname;
        } else {
          match = route.pattern.exec(url);
        }

        if (match) {
          let result = await route.handler({
            request: req,
            params: match === true ? {} : (match.pathname.groups ?? {}),
            pathname: url.pathname,
            src: config.src,
            dist: config.dist,
            urls: config.urls,
            sourcemap: false,
            splitting: false,
          });

          if (result instanceof Response) return result;

          const type = url.pathname.endsWith("/")
            ? "text/html"
            : (contentType(Path.extname(url.pathname)) ?? "text/plain");

          if (typeof result === "string") {
            result = new TextEncoder().encode(result);
          }

          const etag = await ETag.eTag(result, { weak: true });

          const ifNoneMatch = req.headers.get("If-None-Match");

          if (
            ifNoneMatch &&
            ifNoneMatch == etag
          ) {
            return new Response(null, { status: 304 });
          }

          if (type === "text/html") {
            result = await rewrite(result, config.urls);
          }

          return new Response(result, {
            status: 200,
            headers: {
              "Content-Type": type,
              "Etag": etag,
            },
          });
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      if (config.notFound != null) {
        const notFound = config.notFound;
        let result = await Deno.readTextFile(
          Path.join(distDir, "files/404.html"),
        ).catch(() => {
          return notFound({
            request: req,
            params: {},
            pathname: url.pathname,
            src: config.src,
            dist: config.dist,
            urls: config.urls,
            sourcemap: false,
            splitting: false,
          });
        });

        if (result instanceof Response) return result;

        if (typeof result === "string") {
          result = new TextEncoder().encode(result);
        }

        result = await rewrite(result, config.urls);

        return new Response(result, {
          status: 404,
          headers: {
            "Content-Type": "text/html",
          },
        });
      }
    } catch (e) {
      console.error(e);
    }

    return new Response("Not Found", { status: 404 });
  };
}
