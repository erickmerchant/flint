type App = {
	cache: (...items: Array<CacheItem>) => App;
	route: (pattern: RoutePattern | RouteHandler, handler?: RouteHandler) => App;
	output: (output: string) => App;
	run: () => void;
	config: () => Config;
};

type URLCollection = Record<string, string>;

type RouteResponse =
	| Uint8Array<ArrayBufferLike>
	| string
	| Response;

type RouteContext = {
	request: Request;
	params: any;
	input: string;
	output: string;
};
type RouteResolve = (url: string) => string;

type RoutePattern = URLPattern | string;

type RouteHandler = (
	context: RouteContext,
	resolve: RouteResolve,
) =>
	| RouteResponse
	| Promise<RouteResponse>;

type Route = {
	pattern: RoutePattern;
	handler: RouteHandler;
};

type CacheItem =
	| string
	| Array<string>
	| (() => string | Array<string>)
	| (() => Promise<string | Array<string>>);

type Config = {
	input: string;
	output: string;
	routes: Array<Route>;
	notFound?: RouteHandler;
	cache: Array<CacheItem>;
};
