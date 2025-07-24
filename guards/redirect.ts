type Location =
	| string
	| URL
	| ((
		context: RouteContext,
		resolve: RouteResolve,
	) => string | URL | Promise<string | URL>);

type InitMethod = (location: Location) => RouteHandler;

function redirect(status: number, location: Location): RouteHandler {
	return async (context: RouteContext, resolve: RouteResolve) =>
		new Response(null, {
			status: status,
			headers: {
				Location: `${
					typeof location === "function"
						? await location(context, resolve)
						: location
				}`,
			},
		});
}

function initMethod(status: number): InitMethod {
	return (
		location: Location,
	): RouteHandler => {
		return redirect(status, location);
	};
}

export default {
	temporary: initMethod(307),
	permanent: initMethod(308),
} as {
	temporary: InitMethod;
	permanent: InitMethod;
};
