export async function toUint8Array(
  result:
    | ReadableStream<Uint8Array<ArrayBuffer>>
    | Uint8Array<ArrayBuffer>
    | string
    | { toString(): string },
): Promise<Uint8Array<ArrayBuffer>> {
  if (result instanceof Uint8Array) {
    return result;
  }

  if (result instanceof ReadableStream) {
    const reader = result.getReader();

    const values = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      values.push(...value);
    }

    return new Uint8Array(values);
  }

  return new TextEncoder().encode(result?.toString?.() ?? result);
}
