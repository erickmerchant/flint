import type {
  FlintRouteContext,
  FlintRouteHandler,
  FlintRouteResponse,
} from "../mod.ts";

type Value = string | number | boolean | null | ValueMap | ValueArray;
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

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  };
}
