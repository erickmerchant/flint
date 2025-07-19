import * as Path from "@std/path";

export default async function (
	{ pathname, input }: RouteParams,
): Promise<Uint8Array<ArrayBufferLike>> {
	const cmd = new Deno.Command(Deno.execPath(), {
		args: [
			"bundle",
			"--platform=browser",
			"--minify",
			Path.join(Deno.cwd(), input, pathname),
		],
		cwd: Deno.cwd(),
		stdin: "piped",
		stdout: "piped",
	});

	const code = await cmd.spawn().output();

	return code.stdout;
}
