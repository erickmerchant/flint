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
  once?: boolean;
};

export type FlintApp = {
  route: (
    pattern: string | URLPattern | FlintRouteHandler,
    params?: FlintRouteParams,
  ) => FlintApp;
  file: (
    pattern: string | URLPattern,
    params?: FlintRouteParams,
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
  once: boolean;
  handler: FlintRouteHandler;
  cache?: FlintCacheItem;
};

export type FlintCacheItem =
  | Array<string>
  | ((dir: string) => Array<string> | Promise<Array<string>>);
