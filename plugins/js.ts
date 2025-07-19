export default async function (
	{ pathname }: RouteParams,
): Promise<Uint8Array<ArrayBufferLike>> {
	const cmd = new Deno.Command(Deno.execPath(), {
		args: ["bundle", "--platform=browser", "--minify", pathname],
		cwd: Deno.cwd(),
		stdin: "piped",
		stdout: "piped",
	});

	const code = await cmd.spawn().output();

	return code.stdout;
}
