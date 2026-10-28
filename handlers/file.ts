import type { FlintRouteContext, FlintRouteResponse } from "../mod.ts";
import * as Path from "@std/path";

export default async function fileHandler(
  { pathname, config }: FlintRouteContext,
): Promise<FlintRouteResponse> {
  const filename = Path.join(Deno.cwd(), config.src, pathname);

  return (await Deno.open(filename, { read: true })).readable;
}
