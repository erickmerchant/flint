import type { FlintConfig, FlintRoute } from "./types.ts";
import * as Path from "@std/path";
import * as Fs from "@std/fs";
import { parseArgs } from "@std/cli/parse-args";

export default async function (config: FlintConfig) {
  const flags = parseArgs(Deno.args, {
    boolean: ["dev"],
  });

  const urls: Record<string, string> = {};
  const etags: Record<string, string> = {};

  config.resolve = (key: string) => urls[key] ?? key;

  if (flags.dev) {
    config.routes = config.routes.filter((r) => r.once);
  }

  const distDir = Path.join(Deno.cwd(), config.dist);
  const publicDir = Path.join(Deno.cwd(), config.src);

  await Fs.emptyDir(distDir);

  await Fs.ensureDir(distDir);

  await Deno.writeTextFile(
    Path.join(distDir, "builder.ts"),
    `
		import onmessage from "@flint/framework/onmessage";
		import app from "${
      Path.relative(distDir, Path.join(Deno.cwd(), "flint.ts"))
    }";

		self.onmessage = onmessage(app.config())
	`,
  );

  const routeItems = new Map<FlintRoute, Array<string>>();
  const routeItemsPromises: Array<Promise<boolean>> = [];

  for (
    const route of config.routes.toSorted((a, b) =>
      a.fingerprint === b.fingerprint ? 0 : a.fingerprint ? -1 : 1
    )
  ) {
    if (route.cache) {
      const cachePromise = typeof route.cache === "function"
        ? route.cache(publicDir)
        : route.cache;
      const routeItemResult: Array<string> = [];

      routeItems.set(route, routeItemResult);

      routeItemsPromises.push(
        Promise.resolve(cachePromise).then((result) => {
          routeItemResult.push(...result);

          return true;
        }),
      );
    }
  }

  await Promise.all(routeItemsPromises);

  for (const [route, items] of routeItems) {
    const cacheResultPromises = [];
    for (const pathname of items) {
      const { resolve, promise } = Promise.withResolvers();
      const builder = new Worker(
        new URL(`file:///${Path.join(distDir, "builder.ts")}`).href,
        {
          type: "module",
        },
      );

      builder.postMessage({
        index: route.index,
        pathname,
        urls,
      });

      builder.onmessage = (e: MessageEvent<string>) => {
        if (route.fingerprint) {
          urls[pathname] = e.data;
        } else {
          etags[pathname] = e.data;
        }

        resolve(true);
      };

      cacheResultPromises.push(promise);
    }

    await Promise.all(cacheResultPromises);
  }

  if (config.notFound) {
    let result = await config.notFound({
      request: new Request("file://404.html"),
      params: {},
      pathname: "404.html",
      src: config.src,
      dist: config.dist,
      resolve: config.resolve,
      sourcemap: false,
    });

    if (!(result instanceof Response)) {
      const path = Path.join(distDir, "files/404.html");

      await Fs.ensureDir(Path.dirname(path));

      if (typeof result === "string") {
        result = new TextEncoder().encode(result);
      }
      await Deno.writeFile(
        path,
        result,
      );
    }
  }

  await Deno.writeTextFile(
    Path.join(distDir, flags.dev ? "dev-serve.ts" : "serve.ts"),
    `
		import serve from "@flint/framework/serve";
		import app from "${
      Path.relative(distDir, Path.join(Deno.cwd(), "flint.ts"))
    }";


    ${
      flags.dev
        ? `import watch from "@flint/framework/watch";

      const watchScript = \`<script type="module">
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
    \`;`
        : ""
    }

		const urls : Record<string, string> = ${JSON.stringify(urls)};
		const etags : Record<string, string> = ${JSON.stringify(etags)};
		const config = app.config();

		config.resolve = (key: string) => urls[key] ?? key;
		config.etags = etags;

		const fetch = serve(config);

		export default {
			async fetch(req: Request) {
		${
      flags.dev
        ? `const url = new URL(req.url);

			      if (url.pathname === "/_watch") {
			        return watch(config.dist);
			      }

			      const response = await fetch(req);

			      if (response.headers.get("content-type") !== "text/html") {
			        return response;
			      }

			      let body = await response.text();

			      body += watchScript;

			      return new Response(body, {
			        status: response.status,
			        headers: response.headers,
			      });`
        : "return fetch(req);"
    }
			}
		}
	`,
  );

  return { urls, etags };
}
