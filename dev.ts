import * as Path from "@std/path";
import { contentType } from "@std/media-types";
import watch from "./watch.ts";

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

export default function (config: Config) {
	const fetch = async (req: Request): Promise<Response> => {
		const url = new URL(req.url);

		try {
			for (const route of config.routes) {
				const match = route.pattern.exec(url);

				if (match) {
					const result = await route.callback({
						request: req,
						params: match.pathname.groups ?? {},
						pathname: url.pathname,
						input: config.input,
						output: config.output,
						resolve: config.resolve,
					});

					if (result instanceof Response) return result;

					const type = url.pathname.endsWith("/")
						? "text/html"
						: (contentType(Path.extname(url.pathname)) ?? "text/plain");

					return new Response(result, {
						status: 200,
						headers: {
							"Cache-Control": "no-store",
							"Content-Type": type,
						},
					});
				}
			}

			for (const plugin of config.plugins) {
				const match = plugin.pattern.exec(url);

				if (match) {
					const callback: PluginCallback = typeof plugin.callback === "function"
						? plugin.callback
						: () =>
							Deno.readFile(
								Path.join(Deno.cwd(), config.input, url.pathname),
							);
					const result = await callback({
						params: match?.pathname?.groups ?? {},
						pathname: url.pathname,
						input: config.input,
						output: config.output,
						resolve: config.resolve,
					});

					if (result instanceof Response) return result;

					const type = url.pathname.endsWith("/")
						? "text/html"
						: (contentType(Path.extname(url.pathname)) ?? "text/plain");

					return new Response(result, {
						status: 200,
						headers: {
							"Cache-Control": "no-store",
							"Content-Type": type,
						},
					});
				}
			}
		} catch (e) {
			console.error(e);
		}

		try {
			if (config.notFound != null) {
				const notFound = config.notFound;
				const result = await Deno.readTextFile(
					Path.join(Deno.cwd(), config.input, "404.html"),
				).catch(() => {
					return notFound({
						request: req,
						params: {},
						pathname: url.pathname,
						input: config.input,
						output: config.output,
						resolve: config.resolve,
					});
				});

				if (result instanceof Response) return result;

				return new Response(result, {
					status: 404,
					headers: {
						"Cache-Control": "no-store",
						"Content-Type": "text/html",
					},
				});
			}
		} catch (e) {
			console.error(e);
		}

		return new Response("Not Found", { status: 404 });
	};

	Deno.serve(
		{
			port: Deno.args[1] ? +Deno.args[1] : 3000,
		},
		async (req) => {
			const url = new URL(req.url);

			if (url.pathname === "/_watch") {
				return watch(config.output);
			}

			const response = await fetch(req);

			response.headers.set("cache-control", "no-store");

			if (response.headers.get("content-type") !== "text/html") {
				return response;
			}

			let body = await response.text();

			body += watchScript;

			return new Response(body, {
				status: response.status,
				headers: response.headers,
			});
		},
	);
}
