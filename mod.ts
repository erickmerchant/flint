import "./types.d.ts";
import * as Path from "@std/path";
import dev from "./dev.ts";
import build from "./build.ts";

async function filePlugin(
  { input, pathname }: FlintRouteContext,
): Promise<FlintRouteResponse> {
  const filename = Path.join(Deno.cwd(), input, pathname);

  return await Deno.readFile(filename);
}

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
      cache?: boolean | FlintCacheItem,
    ): FlintApp {
      if (typeof pathname === "function" && callback == null) {
        config.notFound = pathname;
      } else if (typeof pathname !== "function" && callback != null) {
        const pattern = new URLPattern({ pathname });

        if (cache == null) cache = !/[\:\*\(\{]/.test(pathname);

        if (cache) {
          if (cache === true) {
            cache = pathname;
          }
        }

        config.routes.push({ pattern, callback, fingerprint: false, cache });
      }

      return app;
    },
    file(
      pathname: string,
      callback?: FlintRouteCallback,
      cache?: boolean | FlintCacheItem,
    ): FlintApp {
      if (callback == null) callback = filePlugin;

      const pattern = new URLPattern({ pathname });

      if (cache == null) cache = !/[\:]/.test(pathname);

      if (cache) {
        if (cache === true) {
          cache = pathname;
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
