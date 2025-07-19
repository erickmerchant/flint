type URLCollection = Record<string, string>;

type RouteParams = {
	pathname: string;
	params?: any;
	urls: URLCollection;
	input: string;
};

type RoutePattern = URLPattern | string;

type RouteHandler = (
	args: RouteParams,
) =>
	| Uint8Array<ArrayBufferLike>
	| string
	| Response
	| Promise<
		| Uint8Array<ArrayBufferLike>
		| string
		| Response
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
