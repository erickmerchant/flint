import type { FlintConfig } from "./types.ts";
import * as Path from "@std/path";
import { contentType } from "@std/media-types";

const fingerprintURLPattern = new URLPattern({
  pathname: "*-([A-Za-z0-9_-]{16}).*",
});

export default function (
  config: FlintConfig,
): (req: Request) => Promise<Response> {
  const distDir = Path.join(Deno.cwd(), config.output);

  return async function (req: Request): Promise<Response> {
    const url = new URL(req.url);

    try {
      const headers: Record<string, string> = {};
      const hasFingerprint = fingerprintURLPattern.test(url);

      if (hasFingerprint) {
        headers["Cache-Control"] = "public, max-age=31536000, immutable";
      }

      let pathname = url.pathname;

      if (pathname.endsWith("/")) {
        pathname += "index.html";
      }

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

      const result = await Deno.readFile(
        Path.join(Deno.cwd(), config.output, "files", pathname),
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
        const match = route.pattern.exec(url);

        if (match) {
          const result = await route.callback({
            request: req,
            params: match.pathname.groups ?? {},
            pathname: url.pathname,
            input: config.input,
            output: config.output,
            resolve: config.resolve,
            sourcemap: false,
          });

          if (result instanceof Response) return result;

          const type = url.pathname.endsWith("/")
            ? "text/html"
            : (contentType(Path.extname(url.pathname)) ?? "text/plain");

          return new Response(result, {
            status: 200,
            headers: {
              "Content-Type": type,
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
        const result = await Deno.readTextFile(
          Path.join(distDir, "files/404.html"),
        ).catch(() => {
          return notFound({
            request: req,
            params: {},
            pathname: url.pathname,
            input: config.input,
            output: config.output,
            resolve: config.resolve,
            sourcemap: false,
          });
        });

        if (result instanceof Response) return result;

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
