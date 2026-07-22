import * as Fs from "@std/fs";
import * as Path from "@std/path";
import { parseArgs } from "@std/cli/parse-args";
import build from "./build.ts";
import filePlugin from "./handlers/file.ts";
import watch from "./watch.ts";
import serve from "./serve.ts";

export type FlintConfig = {
  src: string;
  dist: string;
  routes: Array<FlintRoute>;
  notFound?: FlintRouteHandler;
  urls: Record<string, string>;
  etags?: Record<string, string>;
};

export type FlintParams = Record<string, string | undefined>;

export type FlintRouteResponse =
  | ReadableStream<Uint8Array<ArrayBuffer>>
  | Uint8Array<ArrayBuffer>
  | string
  | { toString(): string }
  | Response;

export type FlintRouteContext = {
  request: Request;
  params: FlintParams;
  pathname: string;
  src: string;
  dist: string;
  sourcemap: boolean;
  urls: Record<string, string>;
};

export type FlintRouteHandler = (context: FlintRouteContext) =>
  | FlintRouteResponse
  | Promise<FlintRouteResponse>;

export type FlintRoute = {
  index: number;
  pattern: string | URLPattern;
  fingerprint: boolean;
  handler: FlintRouteHandler;
  cache?: FlintCacheItem;
};

export type FlintCacheItem =
  | Array<string>
  | ((dir: string) => Array<string> | Promise<Array<string>>);

type App = {
  route: (
    pattern: string | URLPattern | FlintRouteHandler,
    handler?: FlintRouteHandler,
    cache?: FlintCacheItem,
  ) => App;
  file: (
    pattern: string | URLPattern,
    handler?: FlintRouteHandler,
    cache?: FlintCacheItem,
  ) => App;
  run: () => void;
  config: () => FlintConfig;
};

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

			window.addEventListener("beforeunload", () => {
			  esrc.close();
			});
    </script>
    `;

export function pattern(
  strs: TemplateStringsArray,
  ...vars: Array<string>
): URLPattern {
  let str = "";

  for (let i = 0; i < strs.length; i++) {
    str += strs[i];

    if (vars[i]) {
      str += vars[i];
    }
  }

  return new URLPattern({ pathname: str });
}

export function glob(
  pattern: URLPattern,
  handler: (
    path: string,
    params: FlintParams,
  ) => string | Array<string> | Promise<string | Array<string>>,
): (dir: string) => Promise<Array<string>> | Array<string> {
  return async (publicDir: string) => {
    const items = [];

    for await (const { path } of Fs.expandGlob(Path.join(publicDir, "**/*"))) {
      const subpath = path.substring(publicDir.length);
      const match = pattern.exec(`file://${subpath}`);

      if (match) {
        items.push(
          ...([] as Array<string>).concat(
            await handler(subpath, match.pathname.groups ?? {}),
          ),
        );
      }
    }

    return items;
  };
}

export default function (dist?: string, src?: string): App {
  const flags = parseArgs(Deno.args, {
    boolean: ["build"],
    string: ["port"],
  });
  const config: FlintConfig = {
    src: src ?? ".",
    dist: dist ?? "dist",
    routes: [],
    urls: {},
  };
  let index = 0;

  const app: App = {
    route(
      pattern: string | URLPattern | FlintRouteHandler,
      handler?: FlintRouteHandler,
      cache?: FlintCacheItem,
    ): App {
      if (typeof pattern === "function" && handler == null) {
        config.notFound = pattern;
      } else if (typeof pattern !== "function") {
        if (cache == null && !(pattern instanceof URLPattern)) {
          cache = [pattern];
        }

        handler ??= filePlugin;

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
    ): App {
      if (typeof pattern !== "function") {
        handler ??= filePlugin;

        if (cache == null) {
          if (pattern instanceof URLPattern) {
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

      if (flags.build) await build(config);

      if (flags.port) {
        const fetch = serve(config);

        Deno.serve({ port: +flags.port }, async (req: Request) => {
          const url = new URL(req.url);

          if (url.pathname === "/_watch") {
            return watch(config.dist);
          }

          const response = await fetch(req);

          if (response.headers.get("content-type") !== "text/html") {
            return response;
          }

          const blob = await response.blob();
          const decompressed = blob.stream()
            .pipeThrough(new DecompressionStream("brotli"));

          let body = await new Response(decompressed).text();

          body += watchScript;

          const compressed = new Blob([body]).stream()
            .pipeThrough(new CompressionStream("brotli"));

          return new Response(compressed, {
            status: response.status,
            headers: response.headers,
          });
        });
      }
    },
    config(): FlintConfig {
      return config;
    },
  };

  return app;
}
