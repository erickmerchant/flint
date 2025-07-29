type Config = {
	input: string;
	output: string;
	routes: Array<Route>;
	plugins: Array<Plugin>;
	notFound?: RouteCallback;
	cache: Array<CacheItem>;
	resolve: (url: string) => string;
};

type App = {
	cache: (...items: Array<CacheItem>) => App;
	route: (
		pattern: URLPattern | string | RouteCallback,
		callback?: RouteCallback,
	) => App;
	use: (
		pattern: URLPattern | string,
		callback?: PluginCallback,
	) => App;
	run: () => void;
	config: () => Config;
};

type Params = Record<string, string | undefined>;

type RouteResponse =
	| Uint8Array<ArrayBufferLike>
	| string
	| Response;

type RouteContext = {
	request: Request;
	params: Params;
	pathname: string;
	input: string;
	output: string;
	resolve: (url: string) => string;
};

type RouteCallback = (
	context: RouteContext,
) =>
	| RouteResponse
	| Promise<RouteResponse>;

type Route = {
	pattern: URLPattern;
	callback: RouteCallback;
};

type PluginResponse =
	| Uint8Array<ArrayBufferLike>
	| string;

type PluginContext = {
	params: Params;
	pathname: string;
	input: string;
	output: string;
	resolve: (url: string) => string;
};

type PluginCallback = (
	context: PluginContext,
) =>
	| PluginResponse
	| Promise<PluginResponse>;

type Plugin = {
	pattern: URLPattern;
	callback?: PluginCallback;
};

type CacheItem =
	| string
	| Array<string>
	| (() => string | Array<string>)
	| (() => Promise<string | Array<string>>);
