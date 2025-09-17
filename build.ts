import type { FlintConfig, FlintRoute } from "./types.ts";
import * as Path from "@std/path";
import * as Fs from "@std/fs";

export default async function (config: FlintConfig) {
  const urls: Record<string, string> = {};
  const etags: Record<string, string> = {};

  config.resolve = (key: string) => urls[key];

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
        new URL(Path.join(distDir, "builder.ts"), import.meta.url).href,
        {
          type: "module",
        },
      );

      builder.postMessage({
        routeIndex: config.routes.findIndex((r) => r === route),
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
    Path.join(distDir, "serve.ts"),
    `
		import serve from "@flint/framework/serve";
		import app from "${
      Path.relative(distDir, Path.join(Deno.cwd(), "flint.ts"))
    }";

		const urls : Record<string, string> = ${JSON.stringify(urls)};
		const etags : Record<string, string> = ${JSON.stringify(etags)};
		const config = app.config();

		config.resolve = (key: string) => urls[key];
		config.etags = etags;

		const fetch = serve(config);

		export default {
			fetch(req: Request) {
				return fetch(req);
			}
		}
	`,
  );
}
