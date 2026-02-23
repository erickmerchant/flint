import type { FlintRouteContext, FlintRouteResponse } from "../mod.ts";

import * as Path from "@std/path";
import * as Fs from "@std/fs";

export default async function (
  { pathname, src, sourcemap, dist, splitting }: FlintRouteContext,
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
    outputDir: Path.join(dist, "files", Path.dirname(pathname)),
    codeSplitting: splitting,
  });

  let result;

  for (const file of bundle.outputFiles!) {
    if (!result) {
      result = file.text();
    } else {
      await Fs.ensureDir(Path.join(dist, "files", Path.dirname(pathname)));

      await Deno.writeTextFile(file.path, file.text());
    }
  }

  return result ?? "";
}
