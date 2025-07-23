type Location =
	| string
	| URL
	| ((
		context: RouteContext,
		resolve: RouteResolve,
	) => string | URL | Promise<string | URL>);

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

export default {
	temporary(
		location: Location,
	): RouteHandler {
		return redirect(307, location);
	},
	permanent(
		location: Location,
	): RouteHandler {
		return redirect(308, location);
	},
} as {
	temporary(location: Location): RouteHandler;
	permanent(location: Location): RouteHandler;
};
