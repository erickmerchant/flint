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
    pathanme: string | FlintRouteCallback,
    callback?: FlintRouteCallback,
    cache?: boolean | FlintCacheItem,
  ) => FlintApp;
  file: (
    pathanme: string,
    callback?: FlintRouteCallback,
    cache?: boolean | FlintCacheItem,
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
  resolve: (url: string) => string;
};

export type FlintRouteCallback = (
  context: FlintRouteContext,
) =>
  | FlintRouteResponse
  | Promise<FlintRouteResponse>;

export type FlintRoute = {
  pattern: URLPattern;
  fingerprint: boolean;
  callback: FlintRouteCallback;
  cache?: FlintCacheItem;
};

export type FlintCacheItem =
  | false
  | string
  | Array<string>
  | (() => string | Array<string>)
  | (() => Promise<string | Array<string>>);
