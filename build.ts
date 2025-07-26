import * as Path from "@std/path";
import * as Fs from "@std/fs";
import { encodeBase64Url } from "@std/encoding/base64url";
import { crypto } from "@std/crypto";

export default async function (config: Config) {
	const urls: Record<string, string> = {};

	config.resolve = (key: string) => urls[key];

	const distDir = Path.join(Deno.cwd(), config.output);
	const publicDir = Path.join(Deno.cwd(), config.input);

	await Fs.emptyDir(distDir);

	await Fs.ensureDir(distDir);

	const files = await Array.fromAsync(
		Fs.expandGlob(Path.join(publicDir, "**/*")),
	);

	for (let { path: pathname } of files) {
		pathname = pathname.substring(publicDir.length);

		for (const plugin of config.plugins) {
			const match = plugin.pattern.exec(`file://${pathname}`);

			if (match) {
				let result = await plugin.callback?.({
					params: match?.pathname?.groups,
					pathname,
					input: config.input,
					output: config.output,
					resolve: config.resolve,
				}) ??
					await Deno.readFile(Path.join(Deno.cwd(), config.input, pathname));

				if (result instanceof Response) break;

				if (typeof result === "string") {
					result = new TextEncoder().encode(result);
				}

				if (pathname.endsWith("/")) {
					pathname += "index.html";
				}

				const buffer = await crypto.subtle.digest("SHA-256", result);
				const fingerprint = encodeBase64Url(buffer).substring(0, 16);
				const withFingerprint = Path.format({
					root: "/",
					dir: Path.dirname(pathname),
					ext: Path.extname(pathname),
					name: `${
						Path.basename(pathname, Path.extname(pathname))
					}-${fingerprint}`,
				});

				urls[pathname] = withFingerprint;

				pathname = Path.join(distDir, "files", withFingerprint);

				await Fs.ensureDir(Path.dirname(pathname));

				await Deno.writeFile(pathname, result);

				break;
			}
		}
	}

	const items: Array<string> = [];

	for (let item of config.cache) {
		item = typeof item === "function" ? await item() : item;
		item = Array.isArray(item) ? item : [item];

		items.push(...item.map((pathname) => {
			return pathname;
		}));
	}

	for (let pathname of items) {
		for (const route of config.routes) {
			const match = route.pattern.exec(`file://${pathname}`);

			if (match) {
				const request = new Request(`file://${pathname}`);
				let result = await route.callback({
					request,
					params: match?.pathname?.groups,
					pathname,
					input: config.input,
					output: config.output,
					resolve: config.resolve,
				});

				if (result instanceof Response) break;

				if (typeof result === "string") {
					result = new TextEncoder().encode(result);
				}

				if (pathname.endsWith("/")) {
					pathname += "index.html";
				}

				pathname = Path.join(distDir, "files", pathname);

				await Fs.ensureDir(Path.dirname(pathname));

				await Deno.writeFile(pathname, result);

				break;
			}
		}
	}

	if (config.notFound) {
		let result = await config.notFound({
			request: new Request("file://404.html"),
			params: {},
			pathname: "404.html",
			input: config.input,
			output: config.output,
			resolve: config.resolve,
		});

		if (!(result instanceof Response)) {
			const path = Path.join(distDir, "files/404.html");

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

		const urls : Record<string, string> = ${JSON.stringify(urls)};
		const config = app.config();

		config.resolve = (key: string) => urls[key];

		const fetch = serve(config)

		export default {
			fetch(req: Request) {
				return fetch(req);
			}
		}
	`,
	);
}
