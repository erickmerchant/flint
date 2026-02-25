import type { FlintConfig, FlintRoute } from "./mod.ts";
import * as Path from "@std/path";
import * as Fs from "@std/fs";
import rewrite from "./rewrite.ts";

export default async function (config: FlintConfig) {
  const urls: Record<string, string> = {};
  const etags: Record<string, string> = {};

  config.urls = urls;

  const distDir = Path.join(Deno.cwd(), config.dist);
  const publicDir = Path.join(Deno.cwd(), config.src);

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
      urls: config.urls,
      sourcemap: false,
      splitting: true,
    });

    if (!(result instanceof Response)) {
      const path = Path.join(distDir, "files/404.html");

      await Fs.ensureDir(Path.dirname(path));

      if (typeof result === "string") {
        result = new TextEncoder().encode(result);
      }

      result = await rewrite(result, "/404.html", config, true);

      await Deno.writeTextFile(
        path,
        result,
      );
    }
  }

  await Deno.writeTextFile(
    Path.join(distDir, "serve.ts"),
    `
		import serve from "@flint/framework/serve";
		import app from "${
      Path.relative(distDir, Path.join(Deno.cwd(), "flint.ts"))
    }";

		const urls : Record<string, string> = ${JSON.stringify(urls)};
		const etags : Record<string, string> = ${JSON.stringify(etags)};
		const config = app.config();

		config.urls = urls;
		config.etags = etags;

		const fetch = serve(config);

		export default {
			async fetch(req: Request) {
			  return fetch(req);
			}
		}
	`,
  );

  return { urls, etags };
}
