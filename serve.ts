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

		const response: Response | undefined = await serveDir(req, {
			fsRoot: Path.join(distDir, config.input),
			headers,
			quiet: true,
		});

		if (response.status === 404 && !hasFingerprint) {
			for (const route of config.routes) {
				const pattern = route.pattern instanceof URLPattern
					? route.pattern
					: new URLPattern({ pathname: route.pattern });
				const match = pattern.exec(url);

				if (match) {
					const result = await route.handler({
						pathname: url.pathname,
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

		if (response.status === 404 && config.notFound != null) {
			const notFound = config.notFound;
			const result = await Deno.readTextFile(
				Path.join(distDir, config.input, "404.html"),
			).catch(() =>
				notFound({
					pathname: url.pathname,
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

		return response;
	};
}
