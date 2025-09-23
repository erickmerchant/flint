import type {
  FlintRouteContext,
  FlintRouteHandler,
  FlintRouteResponse,
} from "../types.ts";

type Init = (handler: FlintRouteHandler) => MethodRouteHandler;

type InitGroup = {
  get: Init;
  post: Init;
  patch: Init;
  put: Init;
  delete: Init;
};

type MethodRouteHandler = InitGroup & FlintRouteHandler;

function init(methodName: string): Init {
  return (handler: FlintRouteHandler): MethodRouteHandler => {
    const handlers: Record<string, FlintRouteHandler> = {
      [methodName]: handler,
    };

    const guard: MethodRouteHandler = function (
      context: FlintRouteContext,
    ):
      | FlintRouteResponse
      | Promise<FlintRouteResponse> {
      if (handlers[context.request.method.toLowerCase()] != null) {
        return handlers[context.request.method.toLowerCase()](context);
      }

      return new Response(null, { status: 405 });
    };

    function init(methodName: string): Init {
      return (handler: FlintRouteHandler): MethodRouteHandler => {
        handlers[methodName] = handler;

        return guard;
      };
    }

    guard.get = init("get");
    guard.post = init("post");
    guard.patch = init("patch");
    guard.put = init("put");
    guard.delete = init("delete");

    return guard;
  };
}

export default {
  get: init("get"),
  post: init("post"),
  patch: init("patch"),
  put: init("put"),
  delete: init("delete"),
} as InitGroup;
