import * as Path from "@std/path";
import * as Fs from "@std/fs";

export default async function (
	{ request, input, output }: RouteContext,
): Promise<Uint8Array<ArrayBufferLike>> {
	const pathname = new URL(request.url).pathname;
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

	const result = await Deno.readFile(Path.join(tempDirPath, pathname));

	for await (const tempFile of Deno.readDir(tempDirPath)) {
		if (tempFile.name !== Path.basename(pathname)) {
			await Fs.ensureDir(
				Path.join(Deno.cwd(), output, "files", Path.dirname(pathname)),
			);

			await Deno.copyFile(
				Path.join(tempDirPath, tempFile.name),
				Path.join(
					Deno.cwd(),
					output,
					"files",
					Path.dirname(pathname),
					tempFile.name,
				),
			);
		}
	}

	return result;
}
