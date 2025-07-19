import * as Path from "@std/path";
import * as Fs from "@std/fs";
import { contentType } from "@std/media-types";
import { encodeBase64Url } from "@std/encoding/base64url";
import { crypto } from "@std/crypto";

export default async function (config: Config) {
	config.urls = {};

	const distDir = Path.join(Deno.cwd(), config.output);
	const publicDir = Path.join(Deno.cwd(), config.input);

	await Fs.emptyDir(distDir);

	await Fs.ensureDir(distDir);

	const files: Array<string> = (await Array.fromAsync(
		Fs.expandGlob(Path.join(publicDir, "**/*")),
	)).map(({ path }) => path.substring(publicDir.length));

	for (const cache of config.cache) {
		const item: string | Array<string> = typeof cache === "function"
			? await cache()
			: cache;

		files.push(...(Array.isArray(item) ? item : [item]));
	}

	for (let file of files) {
		for (const route of config.routes) {
			const pattern = route.pattern instanceof URLPattern
				? route.pattern
				: new URLPattern({ pathname: route.pattern });
			const match = pattern.exec(`file://${file}`);

			if (match) {
				let result = await route.handler({
					pathname: file,
					params: match?.pathname?.groups,
					urls: config.urls,
					input: config.input,
				});

				if (result instanceof Response) break;

				if (typeof result === "string") {
					result = new TextEncoder().encode(result);
				}

				const type = file.endsWith("/")
					? "text/html"
					: (contentType(Path.extname(file)) ?? "text/plain");

				if (file.endsWith("/")) {
					file += "index.html";
				}

				if (type !== "text/html" && type !== "application/rss+xml") {
					const buffer = await crypto.subtle.digest("SHA-256", result);
					const fingerprint = encodeBase64Url(buffer);
					const withFingerprint = Path.format({
						root: "/",
						dir: Path.dirname(file),
						ext: `.${fingerprint}${Path.extname(file)}`,
						name: Path.basename(file, Path.extname(file)),
					});

					config.urls[file] = withFingerprint;

					file = withFingerprint;
				}

				file = Path.join(distDir, config.input, file);

				await Fs.ensureDir(Path.dirname(file));

				await Deno.writeFile(file, result);
			}
		}
	}

	if (config.notFound) {
		let result = await config.notFound({
			pathname: "",
			params: {},
			urls: config.urls,
			input: config.input,
		});

		if (!(result instanceof Response)) {
			const path = Path.join(distDir, config.input, "404.html");

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
		import * as Path from "@std/path";
		import serve from "@flint/framework/serve.ts";

		const { default: app } = await import(Path.join(Deno.cwd(), "flint.ts"));
		const urls = ${JSON.stringify(config.urls)};

		const handler = serve({...app.config(), urls})

		export default {
			fetch(req: Request) {
				return handler(req);
			}
		}
	`,
	);
}
