import type { FlintRouteContext, FlintRouteResponse } from "../types.ts";

import * as Path from "@std/path";
import * as LightningCSS from "lightningcss";

export default function (
  { input, pathname, resolve }: FlintRouteContext,
): FlintRouteResponse {
  const filename = Path.join(Deno.cwd(), input, pathname);

  const { code } = LightningCSS.bundle({
    filename,
    minify: true,
    sourceMap: false,
    visitor: {
      Url(url) {
        return {
          ...url,
          url: resolve(Path.resolve(pathname, url.url)),
        };
      },
    },
  });

  return code;
}
