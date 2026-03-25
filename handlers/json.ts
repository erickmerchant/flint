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

export default function (
  handler: (context: FlintRouteContext) => Value | Promise<Value>,
): FlintRouteHandler {
  return async (
    context: FlintRouteContext,
  ): Promise<FlintRouteResponse> => {
    let result = await handler(context);

    if (result instanceof Response) {
      result.headers.set("Content-Type", "application/json");

      return result;
    }

    if (result instanceof Uint8Array) {
      result = new TextDecoder().decode(result);
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
  };
}
