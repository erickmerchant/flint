import * as Path from "@std/path";
import * as LightningCSS from "lightningcss";

export default async function (
	{ request, input }: RouteContext,
	resolve: RouteResolve,
): Promise<Uint8Array<ArrayBufferLike>> {
	const pathname = new URL(request.url).pathname;
	const content = await Deno.readFile(Path.join(Deno.cwd(), input, pathname));
	const { code } = LightningCSS.transform({
		filename: pathname,
		code: content,
		minify: true,
		sourceMap: false,
		visitor: {
			Url(url) {
				return {
					...url,
					url: resolve(Path.resolve(pathname, url.url)),
				};
			},
		},
	});

	return code;
}
