import { HTMLRewriter } from "html-rewriter-wasm";

export default async function (
  html: Uint8Array<ArrayBuffer>,
  urls: Record<string, string>,
): Promise<string> {
  const decoder = new TextDecoder();

  let output = "";
  const rewriter = new HTMLRewriter((outputChunk) => {
    output += decoder.decode(outputChunk);
  });

  rewriter.on("[href]", {
    element(el) {
      let value = el.getAttribute("href");

      if (value) {
        value = urls[value] ?? value;

        if (value) el.setAttribute("href", value);
      }
    },
  });

  rewriter.on("[src]", {
    element(el) {
      let value = el.getAttribute("src");

      if (value) {
        value = urls[value] ?? value;

        if (value) el.setAttribute("src", value);
      }
    },
  });

  rewriter.on("[srcset]", {
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

    return output;
  } finally {
    rewriter.free(); // Remember to free memory
  }
}
