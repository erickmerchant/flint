import dev from "./dev.ts";
import build from "./build.ts";

export default function (input?: string): App {
	const config: Config = {
		input: input ?? "public",
		output: "dist",
		cache: [],
		routes: [],
	};

	const app: App = {
		cache(...items: Array<CacheItem>): App {
			config.cache.push(...items);

			return app;
		},
		route(pattern: RoutePattern | RouteHandler, handler?: RouteHandler): App {
			if (typeof pattern === "function") {
				config.notFound = pattern;
			} else if (handler != null) {
				config.routes.push({ pattern, handler });
			}

			return app;
		},
		output(output: string): App {
			config.output = output;

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
		config(): Config {
			return config;
		},
	};

	return app;
}
