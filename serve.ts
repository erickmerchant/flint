import * as Path from "@std/path";
import { contentType } from "@std/media-types";
import { serveDir } from "@std/http/file-server";

const fingerprintURLPattern = new URLPattern({
	pathname: "*-([A-Za-z0-9_-]{16}).*",
});

export default function (
	config: Config,
): (req: Request) => Promise<Response> {
	const distDir = Path.join(Deno.cwd(), config.output);

	return async function (req: Request): Promise<Response> {
		const url = new URL(req.url);
		const headers: Array<string> = [];
		const hasFingerprint = fingerprintURLPattern.test(url);

		if (hasFingerprint) {
			headers.push("Cache-Control: public, max-age=31536000, immutable");
		}

		try {
			const result = req.method === "GET"
				? await serveDir(req, {
					fsRoot: Path.join(distDir, "files"),
					headers,
					quiet: true,
				})
				: null;

			if (result && result.status !== 404) return result;

			if (!hasFingerprint) {
				for (const route of config.routes) {
					const match = route.pattern.exec(url);

					if (match) {
						const callback = typeof route.callback === "function"
							? route.callback
							: (await import(Path.join(Deno.cwd(), route.callback))).default;
						const result = await callback({
							request: req,
							params: match.pathname.groups,
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
								"Content-Type": type,
							},
						});
					}
				}
			}
		} catch (e) {
			console.error(e);
		}

		try {
			if (config.notFound != null) {
				const notFound = config.notFound;
				const result = await Deno.readTextFile(
					Path.join(distDir, "files/404.html"),
				).catch(async () => {
					const callback = typeof notFound === "function"
						? notFound
						: (await import(Path.join(Deno.cwd(), notFound))).default;

					return callback({
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
						"Content-Type": "text/html",
					},
				});
			}
		} catch (e) {
			console.error(e);
		}

		return new Response("Not Found", { status: 404 });
	};
}
