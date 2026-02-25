import type { FlintConfig } from "./mod.ts";
import { HTMLRewriter } from "html-rewriter-wasm";
import * as Path from "@std/path";
import * as Fs from "@std/fs";

export default async function (
  html: Uint8Array<ArrayBuffer>,
  path: string,
  { urls, dist }: FlintConfig,
  inlining: boolean,
): Promise<string> {
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
    async element(el) {
      let value = el.getAttribute("href");
      const url = new URL(`file:///${value}`);
      const inline = inlining && url.searchParams.has("inline");

      value = url.pathname;

      value = Path.format({
        dir: Path.dirname(value),
        name: Path.basename(value, Path.extname(value)),
        ext: ".css",
      });

      if (value.startsWith("//")) value = value.substring(1);

      value = urls[value] ?? value;

      if (inline) {
        el.after(
          `<style>${await Deno.readTextFile(
            Path.join(Deno.cwd(), dist, "files", value),
          )}</style>`,
          { html: true },
        );

        el.remove();
      } else {
        if (value) el.setAttribute("href", value);
      }
    },
  });

  rewriter.on("script[src]", {
    async element(el) {
      let value = el.getAttribute("src");
      const url = new URL(`file:///${value}`);
      const inline = inlining && url.searchParams.has("inline");

      value = url.pathname;

      value = Path.format({
        dir: Path.dirname(value),
        name: Path.basename(value, Path.extname(value)),
        ext: ".js",
      });

      if (value.startsWith("//")) value = value.substring(1);

      value = urls[value] ?? value;

      if (inline) {
        el.append(
          await Deno.readTextFile(Path.join(Deno.cwd(), dist, "files", value)),
          { html: true },
        );

        el.removeAttribute("src");

        const imports: Record<string, string> = {};

        for await (
          let { path: u } of Fs.expandGlob(
            Path.join(Deno.cwd(), dist, "files/**/*.js"),
          )
        ) {
          u = `/${Path.relative(Path.join(Deno.cwd(), dist, "files"), u)}`;

          imports[
            Path.join(
              Path.dirname(path),
              `./${Path.relative(Path.dirname(value), u)}`,
            )
          ] = u;
        }

        el.before(
          `<script type="importmap">${JSON.stringify({ imports })}</script>`,
          { html: true },
        );
      } else {
        if (value) el.setAttribute("src", value);
      }
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

    return output;
  } finally {
    rewriter.free(); // Remember to free memory
  }
}
