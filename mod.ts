import type {
  FlintApp,
  FlintCacheItem,
  FlintConfig,
  FlintParams,
  FlintRouteHandler,
} from "./types.ts";
import * as Fs from "@std/fs";
import * as Path from "@std/path";
import { parseArgs } from "@std/cli/parse-args";
import build from "./build.ts";
import filePlugin from "./handlers/file.ts";
import watch from "./watch.ts";
import serve from "./serve.ts";

const watchScript = `<script type="module">
			let esrc = new EventSource("/_watch");
			let inError = false;

			esrc.addEventListener("message", () => {
					inError = false;

					window.location.reload();
			});

			esrc.addEventListener("error", () => {
				inError = true;
			});

			esrc.addEventListener("open", () => {
				if (inError) {
					window.location.reload();
				}
			});
    </script>
    `;

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
  let fetch;

  const flags = parseArgs(Deno.args, {
    boolean: ["build", "dev"],
  });

  const app: FlintApp = {
    route(
      pattern: string | URLPattern | FlintRouteHandler,
      handler?: FlintRouteHandler,
      cache?: FlintCacheItem,
    ): FlintApp {
      if (typeof pattern === "function" && handler == null) {
        config.notFound = pattern;
      } else if (typeof pattern !== "function" && handler != null) {
        if (cache == null && !(pattern instanceof URLPattern)) {
          cache = [pattern];
        }

        config.routes.push({
          index: index++,
          pattern,
          handler,
          fingerprint: false,
          cache,
        });
      }

      return app;
    },
    file(
      pattern: string | URLPattern,
      handler?: FlintRouteHandler,
      cache?: FlintCacheItem,
    ): FlintApp {
      if (typeof pattern !== "function") {
        handler ??= filePlugin;

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
          cache,
        });
      }

      return app;
    },
    async run() {
      const distDir = Path.join(Deno.cwd(), config.dist);

      await Fs.emptyDir(distDir);

      await Fs.ensureDir(distDir);

      if (flags.build) build(config);
    },
    config(): FlintConfig {
      return config;
    },
  };

  if (flags.dev) {
    app.fetch = async (req: Request) => {
      const url = new URL(req.url);

      if (url.pathname === "/_watch") {
        return watch(config.dist);
      }

      fetch ??= serve(config);

      const response = await fetch(req);

      if (response.headers.get("content-type") !== "text/html") {
        return response;
      }

      let body = await response.text();

      body += watchScript;

      return new Response(body, {
        status: response.status,
        headers: response.headers,
      });
    };
  }

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
