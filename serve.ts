import type { FlintConfig } from "./mod.ts";
import * as Path from "@std/path";
import * as ETag from "@std/http/etag";
import { contentType } from "@std/media-types";
import rewrite from "./rewrite.ts";
import { toUint8Array } from "./utils.ts";

const fingerprintURLPattern = new URLPattern({
  pathname: "*-([A-Z2-7]{8}).*",
});

export default function (
  config: FlintConfig,
): (req: Request) => Promise<Response> {
  const distDir = Path.join(Deno.cwd(), config.dist);
  let notFoundResult: Uint8Array<ArrayBuffer>;

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

      const result = (await Deno.open(
        Path.join(Deno.cwd(), config.dist, "files", pathname),
        { read: true },
      )).readable;
      const type = contentType(Path.extname(pathname)) ?? "text/plain";

      headers["Content-Type"] = type;

      return new Response(result, {
        status: 200,
        headers,
      });
    } catch (_e) {
      // console.error(_e);
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
          const result = await route.handler({
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

          let unint8Array = await toUint8Array(result);

          if (type === "text/html") {
            unint8Array = await rewrite(
              unint8Array,
              url.pathname,
              config,
              false,
            );
          }

          const etag = await ETag.eTag(unint8Array, { weak: true });

          const ifNoneMatch = req.headers.get("If-None-Match");

          if (!ETag.ifNoneMatch(ifNoneMatch, etag)) {
            return new Response(null, { status: 304 });
          }

          return new Response(unint8Array, {
            status: 200,
            headers: {
              "Content-Type": type,
              "Etag": etag,
            },
          });
        }
      }
    } catch (_e) {
      // console.error(_e);
    }

    if (config.notFound != null) {
      try {
        const notFound = config.notFound;

        if (!notFoundResult) {
          const result = await (Deno.readTextFile(
            Path.join(distDir, "files/404.html"),
          ).catch(() =>
            notFound({
              request: req,
              params: {},
              pathname: url.pathname,
              src: config.src,
              dist: config.dist,
              urls: config.urls,
              sourcemap: false,
              splitting: false,
            })
          ));

          if (result instanceof Response) return result;

          let unint8Array = await toUint8Array(result);

          unint8Array = await rewrite(
            unint8Array,
            "/404.html",
            config,
            false,
          );

          notFoundResult = unint8Array;
        }

        return new Response(notFoundResult, {
          status: 404,
          headers: {
            "Content-Type": "text/html",
          },
        });
      } catch (_e) {
        // console.error(_e);
      }
    }

    return new Response("Not Found", { status: 404 });
  };
}
