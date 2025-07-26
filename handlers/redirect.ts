type Location =
	| string
	| URL
	| ((
		context: RouteCallbackContext,
	) => string | URL | Promise<string | URL>);

type Init = (location: Location) => RouteCallback;

function init(status: number): Init {
	return (
		location: Location,
	): RouteCallback => {
		return async (
			context: RouteCallbackContext,
		): Promise<RouteCallbackResponse> =>
			new Response(null, {
				status: status,
				headers: {
					Location: `${
						typeof location === "function" ? await location(context) : location
					}`,
				},
			});
	};
}

export default {
	temporary: init(307),
	permanent: init(308),
} as {
	temporary: Init;
	permanent: Init;
};
