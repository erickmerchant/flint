type Location =
  | string
  | URL
  | ((
    context: FlintRouteContext,
  ) => string | URL | Promise<string | URL>);

type Init = (location: Location) => FlintRouteCallback;

function init(status: number): Init {
  return (
    location: Location,
  ): FlintRouteCallback => {
    return async (
      context: FlintRouteContext,
    ): Promise<FlintRouteResponse> =>
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
