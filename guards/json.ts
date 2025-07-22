export default function (callback: (args: RouteParams) => any): RouteHandler {
	return async (args: RouteParams) => {
		let result = await callback(args);

		if (result instanceof Response) {
			return result;
		}

		if (result instanceof Uint8Array) {
			result = new TextDecoder().decode(result);
		}

		return new Response(JSON.stringify(result));
	};
}
