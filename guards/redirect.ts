type Location =
	| string
	| URL
	| ((args: RouteParams) => string | URL | Promise<string | URL>);

function redirect(status: number, location: Location): RouteHandler {
	return async (args: RouteParams) =>
		new Response(null, {
			status: status,
			headers: {
				Location: `${
					typeof location === "function" ? await location(args) : location
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
