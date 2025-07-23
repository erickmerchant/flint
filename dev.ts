import * as Path from "@std/path";
import * as Fs from "@std/fs";
import { debounce } from "@std/async/debounce";
import serve from "./serve.ts";

export default async function (config: Config) {
	const resolve = (key: string) => key;

	const distDir = Path.join(Deno.cwd(), config.output);

	await Fs.emptyDir(distDir);

	await Fs.ensureDir(distDir);

	const fetch = serve(config, resolve);

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

						for await (const e of watcher) {
							const paths = e.paths.filter((p) =>
								!p.startsWith(Path.join(Deno.cwd(), config.output))
							);

							if (!paths.length) continue;

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

			const response = await fetch(req);

			response.headers.set("cache-control", "no-store");

			if (response.headers.get("content-type") !== "text/html") {
				return response;
			}

			let body = await response.text();

			body += `<script type="module">
				let esrc = new EventSource("/_watch");

				esrc.addEventListener("message", (e) => {
						window.location.reload()
				});
			</script>
			`;

			return new Response(body, {
				status: response.status,
				headers: response.headers,
			});
		},
	);
}
