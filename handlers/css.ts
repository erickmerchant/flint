import type { FlintRouteContext, FlintRouteResponse } from "../types.ts";

import * as Path from "@std/path";
import * as LightningCSS from "lightningcss";
import { encodeBase64 } from "@std/encoding/base64";

export default function (
  { src, pathname, resolve, sourcemap }: FlintRouteContext,
): FlintRouteResponse {
  const filename = Path.join(Deno.cwd(), src, pathname);

  const { code, map } = LightningCSS.bundle({
    filename,
    minify: true,
    sourceMap: sourcemap,
    visitor: {
      Url(url) {
        return {
          ...url,
          url: resolve(Path.resolve(pathname, url.url)),
        };
      },
    },
  });

  if (sourcemap) {
    let encodedMap = "";

    if (map) {
      const decoder = new TextDecoder();

      encodedMap = encodeBase64(decoder.decode(map));
    }

    return code + "\n/*# sourceMappingURL=data:application/json;base64," +
      encodedMap + " */";
  }

  return code.toString();
}
