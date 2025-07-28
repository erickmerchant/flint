type Value = string | number | boolean | null | ValueMap | ValueArray;
interface ValueMap extends Record<string, Value> {}
interface ValueArray extends Array<Value> {}

export default function (
	callback: (context: RouteContext) => Value | Promise<Value>,
): RouteCallback {
	return async (
		context: RouteContext,
	): Promise<RouteResponse> => {
		let result = await callback(context);

		if (result instanceof Response) {
			return result;
		}

		if (result instanceof Uint8Array) {
			result = new TextDecoder().decode(result);
		}

		return new Response(JSON.stringify(result));
	};
}
