import type {
  FlintApp,
  FlintConfig,
  FlintParams,
  FlintRouteHandler,
  FlintRouteParams,
} from "./types.ts";
import dev from "./dev.ts";
import build from "./build.ts";
import filePlugin from "./handlers/file.ts";
import * as Fs from "@std/fs";
import * as Path from "@std/path";

export function pattern(
  strs: TemplateStringsArray,
  ..._vars: Array<never>
): URLPattern {
  if (strs.length === 1) {
    return new URLPattern({ pathname: strs[0] });
  }

  throw Error("Invalid URLPattern");
}

export function glob(
  pattern: URLPattern,
  handler: (
    path: string,
    params: FlintParams,
  ) => Array<string> | Promise<string>,
): (dir: string) => Promise<Array<string>> | Array<string> {
  return async (publicDir: string) => {
    const items = [];

    for await (
      const { path } of Fs.expandGlob(
        Path.join(publicDir, "**/*"),
      )
    ) {
      const subpath = path.substring(publicDir.length);
      const match = pattern.exec(`file://${subpath}`);

      if (match) {
        items.push(
          ...await handler(subpath, match.pathname.groups ?? {}),
        );
      }
    }

    return items;
  };
}

export default function (src: string, dist: string): FlintApp {
  const config: FlintConfig = {
    src: src ?? "src",
    dist: dist ?? "dist",
    routes: [],
    resolve: (key: string) => key,
  };
  let index = 0;

  const app: FlintApp = {
    route(
      pattern: string | URLPattern | FlintRouteHandler,
      params?: FlintRouteParams,
    ): FlintApp {
      if (typeof pattern === "function" && params == null) {
        config.notFound = pattern;
      } else if (typeof pattern !== "function" && params != null) {
        let {
          handler,
          cache,
          once,
        } = params;

        if (handler) {
          if (cache == null && !(pattern instanceof URLPattern)) {
            cache = [pattern];
          }

          config.routes.push({
            index: index++,
            pattern,
            handler,
            fingerprint: false,
            once: once ?? false,
            cache,
          });
        }
      }

      return app;
    },
    file(pattern: string | URLPattern, params?: FlintRouteParams): FlintApp {
      if (typeof pattern !== "function") {
        const handler = params?.handler ?? filePlugin;
        const once = params?.once ?? false;
        let cache = params?.cache;

        if (cache == null) {
          if ((pattern instanceof URLPattern)) {
            cache = glob(pattern, (pathname: string) => [pathname]);
          } else {
            cache = [pattern];
          }
        }

        config.routes.push({
          index: index++,
          pattern,
          handler,
          fingerprint: true,
          once: once,
          cache,
        });
      }

      return app;
    },
    run() {
      if (Deno.args?.[0] === "dev") {
        dev(config);
      }

      if (Deno.args?.[0] === "build") {
        build(config);
      }
    },
    config(): FlintConfig {
      return config;
    },
  };

  return app;
}

export type {
  FlintApp,
  FlintCacheItem,
  FlintConfig,
  FlintParams,
  FlintRoute,
  FlintRouteContext,
  FlintRouteHandler,
  FlintRouteResponse,
} from "./types.ts";
