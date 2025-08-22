type FlintConfig = {
  input: string;
  output: string;
  routes: Array<FlintRoute>;
  notFound?: FlintRouteCallback;
  resolve: (url: string) => string;
  etags?: Record<string, string>;
};

type FlintApp = {
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
  fingerprint: boolean;
  callback: FlintRouteCallback;
  cache?: FlintCacheItem;
};

type FlintCacheItem =
  | false
  | string
  | Array<string>
  | (() => string | Array<string>)
  | (() => Promise<string | Array<string>>);
