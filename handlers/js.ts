import type { FlintRouteContext, FlintRouteResponse } from "../mod.ts";
import * as Path from "@std/path";
import * as Fs from "@std/fs";

export default async function (
  { pathname, src, sourcemap }: FlintRouteContext,
): Promise<FlintRouteResponse> {
  let filename = Path.join(Deno.cwd(), src, pathname);

  if (!await Fs.exists(filename)) {
    filename = Path.normalize(Path.format({
      root: "/",
      dir: Path.join(Deno.cwd(), src, Path.dirname(pathname)),
      ext: ".ts",
      name: Path.basename(pathname, Path.extname(pathname)),
    }));
  }

  const bundle = await Deno.bundle({
    entrypoints: [filename],
    sourcemap: sourcemap ? "inline" : undefined,
    platform: "browser",
    minify: true,
    write: false,
  });

  let result;

  if (bundle.outputFiles) {
    const [file] = bundle.outputFiles;

    result = file.text();
  }

  return result ?? "";
}
