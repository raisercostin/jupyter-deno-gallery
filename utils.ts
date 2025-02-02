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
export type Format = { format: "png" | "jpeg" | "webp" | "svg", width?: number, height?: number, filename?:string}

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
    return Deno.jupyter.display({ ["image/"+option.format]: encodeBase64(content) }, { raw: true });
  }
}


export async function cachedFetch(filePath: string, url: string): Promise<string> {
  try {
    // Check if the file exists locally
    await Deno.stat(filePath);
    console.log("Reading from local cache:", filePath);
  } catch {
    // File does not exist, fetch and stream it to disk
    console.log("Fetching from:", url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    // Open file for writing
    const file = await Deno.open(filePath, { write: true, create: true });
    // Stream response body to the file
    await response.body?.pipeTo(file.writable);
    console.log("Cached locally:", filePath);
  }
  // Read and return the content
  return await Deno.readTextFile(filePath);
}
