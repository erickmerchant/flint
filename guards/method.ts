type MethodGuardMethod = (callback: RouteHandler) => MethodGuardRouteHandler;

type MethodGuardMethods = {
	get: MethodGuardMethod;
	post: MethodGuardMethod;
	patch: MethodGuardMethod;
	put: MethodGuardMethod;
	delete: MethodGuardMethod;
};

type MethodGuardRouteHandler = MethodGuardMethods & {
	(context: RouteContext, resolve: RouteResolve):
		| RouteResponse
		| Promise<RouteResponse>;
};

function api(method: string, handler: RouteHandler) {
	const handlers: Record<string, RouteHandler> = { [method]: handler };

	const guard: MethodGuardRouteHandler = function (
		context: RouteContext,
		resolve: RouteResolve,
	):
		| RouteResponse
		| Promise<RouteResponse> {
		if (handlers[context.request.method.toLowerCase()] != null) {
			return handlers[context.request.method.toLowerCase()](context, resolve);
		}

		return new Response(null, { status: 405 });
	};

	function getMethod(
		guard: MethodGuardRouteHandler,
		handlers: Record<string, RouteHandler>,
		m: string,
	): MethodGuardMethod {
		return (handler: RouteHandler): MethodGuardRouteHandler => {
			handlers[m] = handler;

			return guard;
		};
	}

	guard.get = getMethod(guard, handlers, "get");
	guard.post = getMethod(guard, handlers, "post");
	guard.patch = getMethod(guard, handlers, "patch");
	guard.put = getMethod(guard, handlers, "put");
	guard.delete = getMethod(guard, handlers, "delete");

	return guard;
}

function initMethod(m: string): MethodGuardMethod {
	return (handler: RouteHandler): MethodGuardRouteHandler => {
		return api(m, handler);
	};
}

export default {
	get: initMethod("get"),
	post: initMethod("post"),
	patch: initMethod("patch"),
	put: initMethod("put"),
	delete: initMethod("delete"),
} as MethodGuardMethods;
