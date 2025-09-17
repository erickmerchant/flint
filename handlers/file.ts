import type { FlintRouteContext, FlintRouteResponse } from "../mod.ts";
import * as Path from "@std/path";

export default async function filePlugin(
  { src, pathname }: FlintRouteContext,
): Promise<FlintRouteResponse> {
  const filename = Path.join(Deno.cwd(), src, pathname);

  return await Deno.readFile(filename);
}
