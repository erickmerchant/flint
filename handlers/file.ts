import type { FlintRouteContext, FlintRouteResponse } from "../mod.ts";
import * as Path from "@std/path";

export default async function filePlugin(
  { input, pathname }: FlintRouteContext,
): Promise<FlintRouteResponse> {
  const filename = Path.join(Deno.cwd(), input, pathname);

  return await Deno.readFile(filename);
}
