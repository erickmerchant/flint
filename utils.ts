export async function toUint8Array(
  result:
    | ReadableStream<Uint8Array<ArrayBuffer>>
    | Uint8Array<ArrayBuffer>
    | string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (result instanceof ReadableStream) {
    const reader = result.getReader();

    const values = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      values.push(...value);
    }

    result = new Uint8Array(values);
  }

  if (typeof result === "string") {
    result = new TextEncoder().encode(result);
  }

  return result;
}
