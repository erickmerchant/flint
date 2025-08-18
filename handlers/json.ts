type Value = string | number | boolean | null | ValueMap | ValueArray;
interface ValueMap extends Record<string, Value> {}
interface ValueArray extends Array<Value> {}

export default function (
  callback: (context: FlintRouteContext) => Value | Promise<Value>,
): FlintRouteCallback {
  return async (
    context: FlintRouteContext,
  ): Promise<FlintRouteResponse> => {
    let result = await callback(context);

    if (result instanceof Response) {
      return result;
    }

    if (result instanceof Uint8Array) {
      result = new TextDecoder().decode(result);
    }

    return new Response(JSON.stringify(result));
  };
}
