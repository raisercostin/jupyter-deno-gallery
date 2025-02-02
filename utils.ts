//import pl from "npm:nodejs-polars";
//import { document } from "jsr:@ry/jupyter-helper";
import * as csv from "jsr:@std/csv";
import * as vega from "npm:vega";
import * as vegalite from "npm:vega-lite";
import { encodeBase64 } from "jsr:@std/encoding/base64";
import * as skia from "https://deno.land/x/skia_canvas@0.5.8/mod.ts";

export async function readAllCells2(filePath: string) {
  const file = await Deno.readTextFile(filePath);
  const rows = await csv.parse(file, { separator: "\t", lazyQuotes: true });
  return rows;
}
export async function readAllCells(filePath: string) {
  const file = await Deno.readTextFile(filePath);
  return file.split("\n").map(line => line === "" ? [""] : line.split("\t"));
}

/**Row/columns are 0 based */
export function extractRegion(rows: unknown[], option: { startRow: number, startCol: number, height?: number, width?: number, endRow?: number, endCol?: number }) {
  const endRow = option.endRow || option.startRow + (option.height ?? 1)
  const endCol = option.endCol || option.startCol + (option.width ?? 1)
  const region = rows.slice(option.startRow, endRow + 1).map(row => (row as any).slice(option.startCol, endCol + 1));
  return region;
}
export function isEven(n: number): boolean {
  if (n % 2 != 0) {
    return false
  }
  return true;
}
export type Format = { format: "png" | "jpeg" | "webp" | "svg", width?: number, height?: number, display?: "binary"|"dataUrl", filename?:string}

export async function displayVega(plot: any, option: Format) {
  const baseSpec/*:TopLevelSpec*/ = plot.toSpec();
  let finalWidth = option?.width ?? baseSpec.width
  let finalHeight = option?.height ?? baseSpec.height
  if(option.width && !option.height){
    finalHeight = Math.floor(finalWidth * baseSpec.height / baseSpec.width)
  }
  if(!option.width && option.height){
    finalWidth = Math.floor(finalHeight * baseSpec.width / baseSpec.height)
  }
  const vlSpec = { ...baseSpec, width: finalWidth, height: finalHeight };
  const compiled = vegalite.compile(vlSpec).spec;
  const outFilename = option.filename==null? null: option.filename.endsWith("." + option.format)? option.filename : option.filename + "." + option.format
// console.log(baseSpec)
  if (option.format==null || option.format === "svg") {
    //const view = await new vega.View(vega.parse(compiled), { renderer: "svg" }).runAsync();
    const view = await new vega.View(vega.parse(compiled)).runAsync();
    const svgOutput = await view.toSVG();
    const encoder = new TextEncoder();
    const content = encoder.encode(svgOutput)
    if(outFilename){
      Deno.writeFile(outFilename, content)
    }
    return Deno.jupyter.display({ "image/svg+xml": svgOutput }, { raw: true });
  } else {
    const scaleInCanvas = 1
    const canvas = new skia.Canvas(finalWidth, finalHeight);
    // Provide the canvas directly via the 'canvas' option.
    const quality = 100;
    const view = await new vega.View(vega.parse(compiled), { renderer: "canvas" })
      .toCanvas(scaleInCanvas, { externalContext: canvas.getContext("2d") })
    const content = canvas.encode(option.format, quality);
    if(outFilename){
      Deno.writeFile(outFilename, content)
    }
    //const format: skia.ImageFormat = "png"
    //canvas.save("image2.png", format, quality);
    //await Deno.jupyter.image("image2.png")

    //works for png and jpg
    //return await Deno.jupyter.image(canvas.encode(format, quality))

    //lower level works also for webp
    if(option.display==="dataUrl"){
      const content2 = canvas.toDataURL(option.format,quality)
      // console.log("content",content2);
      // data:image/png;base64
      return Deno.jupyter.display({ ["data:image/"+option.format+";base64"]: encodeBase64(content) }, { raw: true })
    }
    return Deno.jupyter.display({ ["image/"+option.format]: encodeBase64(content) }, { raw: true });

    //also via npm sharp package might work
    //import sharp from "npm:sharp";
    //const data = canvas.encode(format, quality);
    //const buffer = await sharp(data).webp().toBuffer();
    //await Deno.jupyter.display({ "image/webp": buffer }, { raw: true });
    //or as in https://stackoverflow.com/questions/61329237/problem-with-canvas-using-vega-with-nodejs-server-side-only
    //const view = await new vega.View(vega.parse(templateObject), {renderer: 'none'});
    // view.toSVG().then(async function (svg) {
    //await sharp(Buffer.from(svg)).toFormat('png').toFile('fileName.png')

    // const data = Deno.readFileSync("./cat.jpg");
    // await Deno.jupyter.image(data);
    // return await Deno.jupyter.image("image2.png");
    // const webpOutput = canvas.toDataURL(format, quality);
    //await Deno.jupyter.display({ "image/webp": webpOutput }, { raw: true });
  }
}
