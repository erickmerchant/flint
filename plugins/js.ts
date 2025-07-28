import * as Path from "@std/path";

export default async function (
	{ pathname, input }: PluginContext,
): Promise<PluginResponse> {
	const filename = Path.join(Deno.cwd(), input, pathname);
	const cmd = new Deno.Command(Deno.execPath(), {
		args: [
			"bundle",
			"--platform=browser",
			"--minify",
			"--quiet",
			filename,
		],
		cwd: Deno.cwd(),
		stdin: "piped",
		stdout: "piped",
	});
	const code = await cmd.spawn().output();

	return code.stdout;
}
