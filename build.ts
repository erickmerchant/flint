import * as Path from "@std/path";
import * as Fs from "@std/fs";
import { encodeBase32 } from "@std/encoding/base32";
import { crypto } from "@std/crypto";

export default async function (config: Config) {
	config.urls = {};

	const distDir = Path.join(Deno.cwd(), config.output);
	const publicDir = Path.join(Deno.cwd(), config.input);

	await Fs.emptyDir(distDir);

	await Fs.ensureDir(distDir);

	const items: Array<{ fingerprint: boolean; path: string }> =
		(await Array.fromAsync(
			Fs.expandGlob(Path.join(publicDir, "**/*")),
		)).map(({ path }) => {
			return { fingerprint: true, path: path.substring(publicDir.length) };
		});

	for (let item of config.cache) {
		item = typeof item === "function" ? await item() : item;
		item = Array.isArray(item) ? item : [item];

		items.push(...item.map((path) => {
			return { fingerprint: false, path };
		}));
	}

	for (let { fingerprint, path } of items) {
		for (const route of config.routes) {
			const pattern = route.pattern instanceof URLPattern
				? route.pattern
				: new URLPattern({ pathname: route.pattern });
			const match = pattern.exec(`file://${path}`);

			if (match) {
				let result = await route.handler({
					pathname: path,
					params: match?.pathname?.groups,
					urls: config.urls,
					input: config.input,
					output: config.output,
				});

				if (result instanceof Response) break;

				if (typeof result === "string") {
					result = new TextEncoder().encode(result);
				}

				if (path.endsWith("/")) {
					path += "index.html";
				}

				if (fingerprint) {
					const buffer = await crypto.subtle.digest("SHA-256", result);
					const fingerprint = encodeBase32(buffer).substring(0, 8);
					const withFingerprint = Path.format({
						root: "/",
						dir: Path.dirname(path),
						ext: Path.extname(path),
						name: `${Path.basename(path, Path.extname(path))}-${fingerprint}`,
					});

					config.urls[path] = withFingerprint;

					path = withFingerprint;
				}

				path = Path.join(distDir, config.input, path);

				await Fs.ensureDir(Path.dirname(path));

				await Deno.writeFile(path, result);

				break;
			}
		}
	}

	if (config.notFound) {
		let result = await config.notFound({
			pathname: "",
			params: {},
			urls: config.urls,
			input: config.input,
			output: config.output,
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
		import serve from "@flint/framework/serve";
		import app from "${
			Path.relative(distDir, Path.join(Deno.cwd(), "flint.ts"))
		}";

		const urls = ${JSON.stringify(config.urls)};
		const fetch = serve({...app.config(), urls})

		export default {
			fetch(req: Request) {
				return fetch(req);
			}
		}
	`,
	);
}
