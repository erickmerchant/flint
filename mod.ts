import dev from "./dev.ts";
import build from "./build.ts";

export default function (input: string, output: string): App {
	const config: Config = {
		input: input ?? "public",
		output: output ?? "dist",
		cache: [],
		routes: [],
		plugins: [],
		resolve: (key: string) => key,
	};

	const app: App = {
		cache(...items: Array<CacheItem>): App {
			config.cache.push(...items);

			return app;
		},
		route(
			pattern: URLPattern | string | RouteCallback,
			callback?: RouteCallback | string,
		): App {
			if (callback == undefined) {
				if (typeof pattern === "function" || typeof pattern === "string") {
					config.notFound = pattern;
				}
			} else if (typeof pattern !== "function") {
				pattern = pattern instanceof URLPattern
					? pattern
					: new URLPattern({ pathname: pattern });

				config.routes.push({ pattern, callback });
			}

			return app;
		},
		use(
			pattern: URLPattern | string,
			callback?: PluginCallback | string,
		): App {
			pattern = pattern instanceof URLPattern
				? pattern
				: new URLPattern({ pathname: pattern });

			config.plugins.push({ pattern, callback });

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
