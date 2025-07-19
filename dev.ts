import * as Path from "@std/path";
import * as Fs from "@std/fs";
import { debounce } from "@std/async/debounce";
import { contentType } from "@std/media-types";

export default async function (config: Config) {
	config.urls = new Proxy({}, {
		get(_, key) {
			return key;
		},
	});

	const distDir = Path.join(Deno.cwd(), config.output);

	await Fs.emptyDir(distDir);

	await Fs.ensureDir(distDir);

	Deno.serve(
		{
			port: Deno.args[1] ? +Deno.args[1] : 3000,
		},
		async (req) => {
			const url = new URL(req.url);

			if (url.pathname === "/_watch") {
				let watcher: Deno.FsWatcher;
				const result = new ReadableStream({
					async start(controller) {
						const enqueue = debounce(() => {
							controller.enqueue(
								new TextEncoder().encode(
									`data: "change"\r\n\r\n`,
								),
							);
						}, 500);

						watcher = Deno.watchFs(Deno.cwd());

						for await (const _e of watcher) {
							enqueue();
						}
					},
					cancel() {
						watcher.close();
					},
				});

				return new Response(result, {
					headers: {
						"Content-Type": "text/event-stream",
					},
				});
			}

			try {
				for (const route of config.routes) {
					const pattern = route.pattern instanceof URLPattern
						? route.pattern
						: new URLPattern({ pathname: route.pattern });
					const match = pattern.exec(url);

					if (match == null) continue;

					let result = await route.handler({
						pathname: url.pathname,
						params: match.pathname.groups,
						urls: config.urls,
						input: config.input,
						output: config.output,
					});

					if (result instanceof Response) {
						return result;
					}

					const type = url.pathname.endsWith("/")
						? "text/html"
						: (contentType(Path.extname(url.pathname)) ?? "text/plain");

					if (type === "text/html") {
						if (result instanceof Uint8Array) {
							result = new TextDecoder().decode(result);
						}

						if (type === "text/html") {
							result += `<script type="module">
										let esrc = new EventSource("/_watch");

										esrc.addEventListener("message", (e) => {
												window.location.reload()
										});
									</script>
									`;
						}
					}

					return new Response(result, {
						status: 200,
						headers: {
							"Content-Type": type,
						},
					});
				}
			} catch (e) {
				console.error(e);

				if (config.notFound) {
					const result = await config.notFound({
						pathname: url.pathname,
						params: {},
						input: config.input,
						output: config.output,
						urls: config.urls,
					});

					if (result instanceof Response) {
						return result;
					}

					return new Response(result, {
						status: 404,
						headers: {
							"Content-Type": "text/html",
						},
					});
				}
			}

			return new Response("Not Found", { status: 404 });
		},
	);
}
