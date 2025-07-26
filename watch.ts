import * as Path from "@std/path";
import { debounce } from "@std/async/debounce";

export default function (output: string): Response {
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
					!p.startsWith(Path.join(Deno.cwd(), output))
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
