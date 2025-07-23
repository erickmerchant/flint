export default function (
	callback: (context: RouteContext, resolve: RouteResolve) => any,
): RouteHandler {
	return async (context: RouteContext, resolve: RouteResolve) => {
		let result = await callback(context, resolve);

		if (result instanceof Response) {
			return result;
		}

		if (result instanceof Uint8Array) {
			result = new TextDecoder().decode(result);
		}

		return new Response(JSON.stringify(result));
	};
}
