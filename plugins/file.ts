import * as Path from "@std/path";

export default function (
	{ pathname, input }: RouteParams,
): Promise<Uint8Array<ArrayBuffer>> {
	return Deno.readFile(Path.join(Deno.cwd(), input, pathname));
}
