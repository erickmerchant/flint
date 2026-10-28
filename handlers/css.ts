import type { FlintRouteContext, FlintRouteResponse } from "../mod.ts";
import * as Path from "@std/path";
import * as LightningCSS from "lightningcss";
import { encodeBase64 } from "@std/encoding/base64";

export default async function (
  { pathname, config }: FlintRouteContext,
): Promise<FlintRouteResponse> {
  const filename = Path.join(Deno.cwd(), config.src, pathname);
  const { code, map } = await LightningCSS.bundleAsync({
    filename,
    minify: true,
    sourceMap: config.dev,
    visitor: {
      Url(url) {
        const path = Path.resolve(Path.dirname(pathname), url.url);

        return {
          ...url,
          url: config.urls[path] ?? path,
        };
      },
    },
    resolver: {
      read(filePath) {
        if (filePath.startsWith("file://")) {
          filePath = filePath.substring("file://".length);
        }

        return Deno.readTextFile(filePath);
      },
      resolve(specifier, from) {
        if (/^https?:/.test(specifier)) {
          return specifier;
        }

        if (
          !specifier.startsWith("/") && !specifier.startsWith("./") &&
          !specifier.startsWith("../")
        ) {
          try {
            const res = import.meta.resolve(specifier);

            return res;
          } catch (_e) {
            //
          }
        }

        return Path.resolve(Path.dirname(from), specifier);
      },
    },
  });

  if (config.dev) {
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
