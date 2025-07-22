type MethodGuardRouteHandler = {
	get: (callback: RouteHandler) => MethodGuardRouteHandler;
	post: (callback: RouteHandler) => MethodGuardRouteHandler;
	patch: (callback: RouteHandler) => MethodGuardRouteHandler;
	put: (callback: RouteHandler) => MethodGuardRouteHandler;
	delete: (callback: RouteHandler) => MethodGuardRouteHandler;
	(args: RouteParams):
		| RouteResponse
		| Promise<RouteResponse>;
};

function api(method: string, handler: RouteHandler) {
	const handlers: Record<string, RouteHandler> = { [method]: handler };

	const guard: MethodGuardRouteHandler = function (
		args: RouteParams,
	):
		| RouteResponse
		| Promise<RouteResponse> {
		if (handlers[args.request.method.toLowerCase()] != null) {
			return handlers[args.request.method.toLowerCase()](args);
		}

		return new Response(null, { status: 405 });
	};

	guard.get = (handler: RouteHandler): MethodGuardRouteHandler => {
		handlers.get = handler;

		return guard;
	};

	guard.post = (handler: RouteHandler): MethodGuardRouteHandler => {
		handlers.post = handler;

		return guard;
	};

	guard.patch = (handler: RouteHandler): MethodGuardRouteHandler => {
		handlers.patch = handler;

		return guard;
	};

	guard.put = (handler: RouteHandler): MethodGuardRouteHandler => {
		handlers.put = handler;

		return guard;
	};

	guard.delete = (handler: RouteHandler): MethodGuardRouteHandler => {
		handlers.delete = handler;

		return guard;
	};

	return guard;
}

export default {
	get(handler: RouteHandler): MethodGuardRouteHandler {
		return api("get", handler);
	},
	post(handler: RouteHandler): MethodGuardRouteHandler {
		return api("post", handler);
	},
	patch(handler: RouteHandler): MethodGuardRouteHandler {
		return api("patch", handler);
	},
	put(handler: RouteHandler): MethodGuardRouteHandler {
		return api("put", handler);
	},
	delete(handler: RouteHandler): MethodGuardRouteHandler {
		return api("delete", handler);
	},
} as {
	get: (callback: RouteHandler) => MethodGuardRouteHandler;
	post: (callback: RouteHandler) => MethodGuardRouteHandler;
	patch: (callback: RouteHandler) => MethodGuardRouteHandler;
	put: (callback: RouteHandler) => MethodGuardRouteHandler;
	delete: (callback: RouteHandler) => MethodGuardRouteHandler;
};
