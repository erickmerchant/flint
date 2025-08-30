export type FlintConfig = {
  input: string;
  output: string;
  routes: Array<FlintRoute>;
  notFound?: FlintRouteCallback;
  resolve: (url: string) => string;
  etags?: Record<string, string>;
};

export type FlintApp = {
  route: (
    pathname: string | URLPattern | FlintRouteCallback,
    callback?: FlintRouteCallback,
    cache?: FlintCacheItem,
  ) => FlintApp;
  file: (
    pathname: string | URLPattern,
    callback?: FlintRouteCallback,
    cache?: FlintCacheItem,
  ) => FlintApp;
  run: () => void;
  config: () => FlintConfig;
};

export type FlintParams = Record<string, string | undefined>;

export type FlintRouteResponse =
  | Uint8Array<ArrayBufferLike>
  | string
  | Response;

export type FlintRouteContext = {
  request: Request;
  params: FlintParams;
  pathname: string;
  input: string;
  output: string;
  sourcemap: boolean;
  resolve: (url: string) => string;
};

export type FlintRouteCallback = (
  context: FlintRouteContext,
) =>
  | FlintRouteResponse
  | Promise<FlintRouteResponse>;

export type FlintRoute = {
  pattern: string | URLPattern;
  fingerprint: boolean;
  callback: FlintRouteCallback;
  cache?: FlintCacheItem;
};

export type FlintCacheItem =
  | Array<string>
  | ((dir: string) => Array<string> | Promise<Array<string>>);
