import type { FlintRouteContext, FlintRouteResponse } from "../mod.ts";
import * as Path from "@std/path";
import * as LightningCSS from "lightningcss";
import { encodeBase64 } from "@std/encoding/base64";

const links: Map<string, string> = new Map();

try {
  const text = Deno.readTextFileSync(Path.join(Deno.cwd(), "deno.json"));
  const json = JSON.parse(text);

  for (const l of json.links ?? []) {
    const text = Deno.readTextFileSync(Path.join(Deno.cwd(), l, "deno.json"));
    const json = JSON.parse(text);

    if (json.name) {
      links.set(json.name, Path.join(Deno.cwd(), l));
    }
  }
} catch (_e) {
  // console.error(_e);
}

const currentVersions: Map<string, string> = new Map();

try {
  const text = Deno.readTextFileSync(Path.join(Deno.cwd(), "deno.lock"));
  const json = JSON.parse(text);

  for (const [s, v] of Object.entries(json.specifiers ?? {})) {
    currentVersions.set(s, v as string);
  }
} catch (_e) {
  // console.error(_e);
}

export default async function (
  { src, pathname, urls, sourcemap }: FlintRouteContext,
): Promise<FlintRouteResponse> {
  const filename = Path.join(Deno.cwd(), src, pathname);
  const { code, map } = await LightningCSS.bundleAsync({
    filename,
    minify: true,
    sourceMap: sourcemap,
    visitor: {
      Url(url) {
        const path = Path.resolve(Path.dirname(pathname), url.url);

        return {
          ...url,
          url: urls[path] ?? path,
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
          const split = specifier.split("/");
          const fileIndex = specifier.startsWith("@") ? 2 : 1;
          const name = split.slice(0, fileIndex).join("/");
          const file = split.slice(fileIndex).join("/");

          try {
            const res = import.meta.resolve(specifier);

            return res;
          } catch (_e) {
            const link = links.get(name);

            if (link) {
              return Path.join(link, file);
            }
          }
        }

        return Path.resolve(Path.dirname(from), specifier);
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
