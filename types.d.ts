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
		pattern: URLPattern | RouteCallback,
		callback: RouteCallback,
	) => App;
	use: (
		pattern: URLPattern,
		callback?: PluginCallback,
	) => App;
	run: () => void;
	config: () => Config;
};

type Params = Record<string, string | undefined>;

type RouteCallbackResponse =
	| Uint8Array<ArrayBufferLike>
	| string
	| Response;

type RouteCallbackContext = {
	request: Request;
	params?: Params;
	pathname: string;
	input: string;
	output: string;
	resolve: (url: string) => string;
};

type RouteCallback = (
	context: RouteCallbackContext,
) =>
	| RouteCallbackResponse
	| Promise<RouteCallbackResponse>;

type Route = {
	pattern: URLPattern;
	callback: RouteCallback;
};

type PluginCallbackResponse =
	| Uint8Array<ArrayBufferLike>
	| string;

type PluginCallbackContext = {
	params?: Params;
	pathname: string;
	input: string;
	output: string;
	resolve: (url: string) => string;
};

type PluginCallback = (
	context: PluginCallbackContext,
) =>
	| PluginCallbackResponse
	| Promise<PluginCallbackResponse>;

type Plugin = {
	pattern: URLPattern;
	callback?: PluginCallback;
};

type CacheItem =
	| string
	| Array<string>
	| (() => string | Array<string>)
	| (() => Promise<string | Array<string>>);
