import * as Path from "@std/path";
import { contentType } from "@std/media-types";
import { serveDir } from "@std/http/file-server";

const fingerprintURLPattern = new URLPattern({
	pathname: "*-([A-Z0-9]{0,8}).*",
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
					const pattern = route.pattern instanceof URLPattern
						? route.pattern
						: new URLPattern({ pathname: route.pattern });
					const match = pattern.exec(url);

					if (match) {
						const result = await route.handler({
							request: req,
							params: match.pathname.groups,
							urls: config.urls,
							input: config.input,
							output: config.output,
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

			if (config.notFound != null) {
				const notFound = config.notFound;
				const result = await Deno.readTextFile(
					Path.join(distDir, config.input, "404.html"),
				).catch(() =>
					notFound({
						request: req,
						params: {},
						urls: config.urls,
						input: config.input,
						output: config.output,
					})
				);

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

			return new Response("Server Error", { status: 500 });
		}

		return new Response("Not Found", { status: 404 });
	};
}
