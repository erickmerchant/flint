import type { FlintConfig } from "./mod.ts";
import { HTMLRewriter } from "html-rewriter-wasm";
import * as Path from "@std/path";

export default async function (
  html: Uint8Array<ArrayBuffer>,
  { urls }: FlintConfig,
): Promise<Uint8Array<ArrayBuffer>> {
  const decoder = new TextDecoder();

  let output = "";
  const rewriter = new HTMLRewriter((outputChunk) => {
    output += decoder.decode(outputChunk);
  });

  rewriter.on("link[rel='preload'][href]", {
    element(el) {
      let value = el.getAttribute("href");

      if (value) {
        value = urls[value] ?? value;

        el.setAttribute("href", value);
      }
    },
  });

  rewriter.on("link[rel='stylesheet'][href]", {
    element(el) {
      let value = el.getAttribute("href");
      const url = new URL(`file:///${value}`);

      value = url.pathname;

      value = Path.format({
        dir: Path.dirname(value),
        name: Path.basename(value, Path.extname(value)),
        ext: ".css",
      });

      if (value.startsWith("//")) value = value.substring(1);

      value = urls[value] ?? value;

      if (value) el.setAttribute("href", value);
    },
  });

  rewriter.on("link:not([rel='stylesheet'])[href]", {
    element(el) {
      let value = el.getAttribute("href");

      if (value?.startsWith("http://") || value?.startsWith("https://")) return;

      const url = new URL(`file:///${value}`);

      value = url.pathname;

      value = urls[value] ?? value;

      if (value) el.setAttribute("href", value);
    },
  });

  rewriter.on("script[src]", {
    element(el) {
      let value = el.getAttribute("src");
      const url = new URL(`file:///${value}`);

      value = url.pathname;

      value = Path.format({
        dir: Path.dirname(value),
        name: Path.basename(value, Path.extname(value)),
        ext: ".js",
      });

      if (value.startsWith("//")) value = value.substring(1);

      value = urls[value] ?? value;

      if (value) el.setAttribute("src", value);
    },
  });

  rewriter.on("img[src]", {
    element(el) {
      let value = el.getAttribute("src");

      if (value) {
        value = urls[value] ?? value;

        if (value) el.setAttribute("src", value);
      }
    },
  });

  rewriter.on("source[srcset]", {
    element(el) {
      const value = el.getAttribute("srcset");

      if (value) {
        el.setAttribute(
          "srcset",
          value.split(",").map((src: string) => {
            src = src.trim();

            let [path, ...desc] = src.split(" ");

            if (path) {
              path = urls[path] ?? path;

              return [path, ...desc].join(" ");
            }

            return src;
          }).join(","),
        );
      }
    },
  });

  try {
    await rewriter.write(html);
    await rewriter.end();

    const result = new TextEncoder().encode(output);

    return result;
  } finally {
    rewriter.free();
  }
}
