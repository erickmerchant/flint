import * as Path from "@std/path";

export default function (
	{ request, input }: RouteContext,
): Promise<Uint8Array<ArrayBuffer>> {
	const pathname = new URL(request.url).pathname;
	return Deno.readFile(Path.join(Deno.cwd(), input, pathname));
}
