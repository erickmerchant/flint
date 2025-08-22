import * as Path from "@std/path";
import * as Fs from "@std/fs";

export default async function (
  { pathname, input }: FlintRouteContext,
): Promise<FlintRouteResponse> {
  let filename = Path.join(Deno.cwd(), input, pathname);

  if (!await Fs.exists(filename)) {
    filename = Path.normalize(Path.format({
      root: "/",
      dir: Path.join(Deno.cwd(), input, Path.dirname(pathname)),
      ext: ".ts",
      name: Path.basename(pathname, Path.extname(pathname)),
    }));
  }

  const cmd = new Deno.Command(Deno.execPath(), {
    args: [
      "bundle",
      "--platform=browser",
      "--minify",
      "--quiet",
      filename,
    ],
    cwd: Deno.cwd(),
    stdin: "piped",
    stdout: "piped",
  });
  const code = await cmd.spawn().output();

  return code.stdout;
}
