import type {
  FlintApp,
  FlintCacheItem,
  FlintConfig,
  FlintRouteCallback,
} from "./types.ts";
import dev from "./dev.ts";
import build from "./build.ts";
import filePlugin from "./handlers/file.ts";

export default function (input: string, output: string): FlintApp {
  const config: FlintConfig = {
    input: input ?? "public",
    output: output ?? "dist",
    routes: [],
    resolve: (key: string) => key,
  };

  const app: FlintApp = {
    route(
      pathname: string | FlintRouteCallback,
      callback?: FlintRouteCallback,
      cache?: FlintCacheItem,
    ): FlintApp {
      if (typeof pathname === "function" && callback == null) {
        config.notFound = pathname;
      } else if (typeof pathname !== "function" && callback != null) {
        const pattern = new URLPattern({ pathname });

        if (cache == null) {
          cache = [pathname];
        }

        config.routes.push({ pattern, callback, fingerprint: false, cache });
      }

      return app;
    },
    file(
      pathname: string,
      callback?: FlintRouteCallback,
      cache?: FlintCacheItem,
    ): FlintApp {
      if (callback == null) callback = filePlugin;

      const pattern = new URLPattern({ pathname });

      if (cache == null) {
        cache = {
          [pathname]: (pathname) => [pathname],
        };
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
