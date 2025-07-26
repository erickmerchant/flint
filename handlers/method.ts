type Init = (callback: RouteCallback) => MethodRouteCallback;

type InitGroup = {
	get: Init;
	post: Init;
	patch: Init;
	put: Init;
	delete: Init;
};

type MethodRouteCallback = InitGroup & RouteCallback;

function init(methodName: string): Init {
	return (callback: RouteCallback): MethodRouteCallback => {
		const callbacks: Record<string, RouteCallback> = { [methodName]: callback };

		const guard: MethodRouteCallback = function (
			context: RouteCallbackContext,
		):
			| RouteCallbackResponse
			| Promise<RouteCallbackResponse> {
			if (callbacks[context.request.method.toLowerCase()] != null) {
				return callbacks[context.request.method.toLowerCase()](context);
			}

			return new Response(null, { status: 405 });
		};

		function init(methodName: string): Init {
			return (callback: RouteCallback): MethodRouteCallback => {
				callbacks[methodName] = callback;

				return guard;
			};
		}

		guard.get = init("get");
		guard.post = init("post");
		guard.patch = init("patch");
		guard.put = init("put");
		guard.delete = init("delete");

		return guard;
	};
}

export default {
	get: init("get"),
	post: init("post"),
	patch: init("patch"),
	put: init("put"),
	delete: init("delete"),
} as InitGroup;
