import type {
  FlintApp,
  FlintCacheItem,
  FlintConfig,
  FlintParams,
  FlintRouteCallback,
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
  callback: (
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
          ...await callback(subpath, match.pathname.groups ?? {}),
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

  const app: FlintApp = {
    route(
      pattern: string | URLPattern | FlintRouteCallback,
      callback?: FlintRouteCallback,
      cache?: FlintCacheItem,
    ): FlintApp {
      if (typeof pattern === "function" && callback == null) {
        config.notFound = pattern;
      } else if (typeof pattern !== "function" && callback != null) {
        if (cache == null && !(pattern instanceof URLPattern)) {
          cache = [pattern];
        }

        config.routes.push({ pattern, callback, fingerprint: false, cache });
      }

      return app;
    },
    file(
      pattern: string | URLPattern,
      callback?: FlintRouteCallback,
      cache?: FlintCacheItem,
    ): FlintApp {
      if (callback == null) callback = filePlugin;

      if (cache == null) {
        if ((pattern instanceof URLPattern)) {
          cache = glob(pattern, (pathname: string) => [pathname]);
        } else {
          cache = [pattern];
        }
      }

      config.routes.push({ pattern, callback, fingerprint: true, cache });

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
  FlintRouteCallback,
  FlintRouteContext,
  FlintRouteResponse,
} from "./types.ts";
