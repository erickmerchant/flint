export type FlintConfig = {
  src: string;
  dist: string;
  routes: Array<FlintRoute>;
  notFound?: FlintRouteHandler;
  resolve: (url: string) => string;
  etags?: Record<string, string>;
};

export type FlintRouteParams = {
  handler?: FlintRouteHandler;
  cache?: FlintCacheItem;
};

export type FlintApp = {
  route: (
    pattern: string | URLPattern | FlintRouteHandler,
    handler?: FlintRouteHandler,
    cache?: FlintCacheItem,
  ) => FlintApp;
  file: (
    pattern: string | URLPattern,
    handler?: FlintRouteHandler,
    cache?: FlintCacheItem,
  ) => FlintApp;
  run: () => void;
  config: () => FlintConfig;
  fetch: (request: Request) => Promise<Response> | Response;
};

export type FlintParams = Record<string, string | undefined>;

export type FlintRouteResponse =
  | Uint8Array<ArrayBuffer>
  | string
  | Response;

export type FlintRouteContext = {
  request: Request;
  params: FlintParams;
  pathname: string;
  src: string;
  dist: string;
  sourcemap: boolean;
  resolve: (url: string) => string;
};

export type FlintRouteHandler = (
  context: FlintRouteContext,
) =>
  | FlintRouteResponse
  | Promise<FlintRouteResponse>;

export type FlintRoute = {
  index: number;
  pattern: string | URLPattern;
  fingerprint: boolean;
  handler: FlintRouteHandler;
  cache?: FlintCacheItem;
};

export type FlintCacheItem =
  | Array<string>
  | ((dir: string) => Array<string> | Promise<Array<string>>);
