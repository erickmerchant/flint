type App = {
	cache: (item: CacheItem) => App;
	route: (pattern: RoutePattern | RouteHandler, handler?: RouteHandler) => App;
	output: (output: string) => App;
	run: () => void;
	config: () => Config;
};

type URLCollection = Record<string, string>;

type RouteParams = {
	pathname: string;
	params?: any;
	urls: URLCollection;
	input: string;
	output: string;
};

type RoutePattern = URLPattern | string;

type RouteHandler = (
	args: RouteParams,
) =>
	| Uint8Array<ArrayBufferLike>
	| string
	| Response
	| null
	| Promise<
		| Uint8Array<ArrayBufferLike>
		| string
		| Response
		| null
	>;

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
	urls: URLCollection;
	cache: Array<CacheItem>;
};
