import type { FlintCacheItem, FlintRouteHandler } from "../mod.ts";
import { glob, pattern as p } from "@flint/framework";
import sharp from "sharp";
import * as Path from "@std/path";
import * as Fs from "@std/fs";

export type FlintImageMeta = {
  height: number;
  width: number;
  name: string;
};

export type FlintImageSizes = Record<
  string,
  { height: number } | { width: number }
>;

export async function list(
  pathname: string,
): Promise<Array<FlintImageMeta>> {
  const ext = Path.extname(pathname);
  const imagePromises = [];
  let i = 0;

  for await (
    const { name, path } of Fs.expandGlob(pathname)
  ) {
    imagePromises.push(
      sharp(path)
        .metadata()
        .then((metadata) => ({
          height: metadata.height,
          width: metadata.width,
          name: Path.basename(name, ext),
          index: i++,
        })),
    );
  }

  let images: Array<FlintImageMeta> = await Promise.all(imagePromises);
  const orders = new Uint32Array(images.length);

  globalThis.crypto.getRandomValues(orders);

  images = Object.keys(images).sort((a, b) => orders[+a] - orders[+b]).map((
    k,
  ) => images[+k]);

  return images;
}

export default function (
  pattern: URLPattern,
  sizes: FlintImageSizes,
): [string | URLPattern, FlintRouteHandler, FlintCacheItem] {
  const path = pattern.pathname;
  const ext = Path.extname(path);
  const basename = Path.basename(path, ext);
  const dirname = Path.dirname(path);

  return [
    p`${dirname === "/" ? "" : dirname}/${basename}/:size${ext}`,
    ({ params }) => {
      if (
        params.name && params.size &&
        sizes[params.size as keyof typeof sizes] != null
      ) {
        const settings = sizes[params.size as keyof typeof sizes];

        let img = sharp(`media/images/${params.name}.jpeg`);

        if ("height" in settings || "width" in settings) {
          img = img.resize(settings);
        }

        img = img.jpeg({
          quality: 80,
          progressive: true,
          force: true,
        });

        return img.toBuffer() as Promise<Uint8Array<ArrayBuffer>>;
      }

      throw Error("not found");
    },
    glob(pattern, (
      _,
      { name },
    ) =>
      Object
        .keys(sizes)
        .map((
          size,
        ) => [
          `/media/images/${name}/${size}.jpeg`,
        ])
        .flat()),
  ];
}
