import type { FlintRouteContext, FlintRouteResponse } from "../mod.ts";
import * as Path from "@std/path";
import * as Fs from "@std/fs";
import { minify } from "terser";

export default async function (
  { pathname, config }: FlintRouteContext,
): Promise<FlintRouteResponse> {
  let filename = Path.join(Deno.cwd(), config.src, pathname);

  if (!await Fs.exists(filename)) {
    filename = Path.normalize(Path.format({
      root: "/",
      dir: Path.join(Deno.cwd(), config.src, Path.dirname(pathname)),
      ext: ".ts",
      name: Path.basename(pathname, Path.extname(pathname)),
    }));
  }

  const bundle = await Deno.bundle({
    entrypoints: [filename],
    sourcemap: config.dev ? "inline" : undefined,
    platform: "browser",
    minify: false,
    write: false,
  });

  let result;

  if (bundle.outputFiles) {
    const [file] = bundle.outputFiles;

    result = file.text();

    const minified = await minify(result, {
      module: true,
      ecma: 2025,
      sourceMap: config.dev
        ? { filename, content: "inline", url: "inline" }
        : undefined,
    });

    result = minified.code;
  }

  return result ?? "";
}
