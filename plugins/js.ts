import * as Path from "@std/path";
import * as Fs from "@std/fs";

export default async function (
	{ pathname, input, output }: RouteParams,
): Promise<Uint8Array<ArrayBufferLike> | null> {
	const outPath = Path.join(Deno.cwd(), output, input, pathname);

	const distFile: Uint8Array<ArrayBufferLike> | null = await Deno.readFile(
		outPath,
	).catch(() => null);

	if (distFile != null) {
		return distFile;
	}

	const tempDirPath = await Deno.makeTempDir();

	const cmd = new Deno.Command(Deno.execPath(), {
		args: [
			"bundle",
			"--platform=browser",
			"--code-splitting",
			"--outdir=" + tempDirPath,
			"--minify",
			"--quiet",
			Path.join(Deno.cwd(), input, pathname),
		],
		cwd: Deno.cwd(),
		stdin: "piped",
		stdout: "piped",
	});

	await cmd.spawn().output();

	let result: Uint8Array<ArrayBufferLike> | null = null;

	for await (const tempFile of Deno.readDir(tempDirPath)) {
		if (tempFile.name === Path.basename(pathname)) {
			result = await Deno.readFile(Path.join(tempDirPath, tempFile.name));
		} else {
			await Fs.ensureDir(
				Path.join(Deno.cwd(), output, input, Path.dirname(pathname)),
			);

			await Deno.copyFile(
				Path.join(tempDirPath, tempFile.name),
				Path.join(
					Deno.cwd(),
					output,
					input,
					Path.dirname(pathname),
					tempFile.name,
				),
			);
		}
	}

	return result;
}
