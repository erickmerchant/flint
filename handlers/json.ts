import type {
  FlintRouteContext,
  FlintRouteHandler,
  FlintRouteResponse,
} from "../mod.ts";
import * as ETag from "@std/http/etag";

type Value =
  | string
  | number
  | boolean
  | null
  | ValueMap
  | ValueArray
  | Response;

interface ValueMap extends Record<string, Value> {}
interface ValueArray extends Array<Value> {}

type Init = (handler: JsonRouteHandler) => JsonRouteAPI;

type InitGroup = {
  get: Init;
  post: Init;
  patch: Init;
  put: Init;
  delete: Init;
};

type JsonRouteAPI = InitGroup & FlintRouteHandler;

type JsonRouteHandler = (
  context: FlintRouteContext,
) => Response | Value | Promise<Value>;

function init(methodName: string): Init {
  return (handler: JsonRouteHandler): JsonRouteAPI => {
    const handlers: Record<string, JsonRouteHandler> = {
      [methodName]: handler,
    };

    const guard: JsonRouteAPI = async function (
      context: FlintRouteContext,
    ): Promise<FlintRouteResponse> {
      const method = context.request.method.toLowerCase();

      // @todo support If-Match 412 Precondition Failed

      if (handlers[method] != null) {
        let result = await handlers[method](context);

        if (result instanceof Response) {
          result.headers.set("Content-Type", "application/json");

          return result;
        }

        result = JSON.stringify(result);

        const etag = await ETag.eTag(result, { weak: true });

        const ifNoneMatch = context.request.headers.get("If-None-Match");

        if (!ETag.ifNoneMatch(ifNoneMatch, etag)) {
          return new Response(null, { status: 304 });
        }

        return new Response(result, {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Etag": etag,
          },
        });
      }

      return new Response(null, { status: 405 });
    };

    function init(methodName: string): Init {
      return (handler: JsonRouteHandler): JsonRouteAPI => {
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
