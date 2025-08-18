type FlintConfig = {
  input: string;
  output: string;
  routes: Array<FlintRoute>;
  plugins: Array<FlintPlugin>;
  notFound?: FlintRouteCallback;
  cache: Array<FlintCacheItem>;
  resolve: (url: string) => string;
  etags?: Record<string, string>;
};

type FlintApp = {
  cache: (...items: Array<FlintCacheItem>) => FlintApp;
  route: (
    pattern: URLPattern | string | FlintRouteCallback,
    callback?: FlintRouteCallback,
  ) => FlintApp;
  use: (
    pattern: URLPattern | string,
    callback?: FlintPluginCallback,
  ) => FlintApp;
  run: () => void;
  config: () => FlintConfig;
};

type FlintParams = Record<string, string | undefined>;

type FlintRouteResponse =
  | Uint8Array<ArrayBufferLike>
  | string
  | Response;

type FlintRouteContext = {
  request: Request;
  params: FlintParams;
  pathname: string;
  input: string;
  output: string;
  resolve: (url: string) => string;
};

type FlintRouteCallback = (
  context: FlintRouteContext,
) =>
  | FlintRouteResponse
  | Promise<FlintRouteResponse>;

type FlintRoute = {
  pattern: URLPattern;
  callback: FlintRouteCallback;
};

type FlintPluginResponse =
  | Uint8Array<ArrayBufferLike>
  | string;

type FlintPluginContext = {
  params: FlintParams;
  pathname: string;
  input: string;
  output: string;
  resolve: (url: string) => string;
};

type FlintPluginCallback = (
  context: FlintPluginContext,
) =>
  | FlintPluginResponse
  | Promise<FlintPluginResponse>;

type FlintPlugin = {
  pattern: URLPattern;
  callback?: FlintPluginCallback;
};

type FlintCacheItem =
  | string
  | Array<string>
  | (() => string | Array<string>)
  | (() => Promise<string | Array<string>>);
