//import pl from "npm:nodejs-polars";
//import { document } from "jsr:@ry/jupyter-helper";
import * as csv from "jsr:@std/csv";
import * as vega from "npm:vega";
import * as vegalite from "npm:vega-lite";

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

export async function displayVega(plot: any, option: { width?: number, height?: number } | 'svg') {
//  const vlSpec = plot.toSpec();
  const baseSpec = plot.toSpec();
  // Override spec dimensions when rendering as image
  const vlSpec = option === 'svg'
    ? baseSpec
    : { ...baseSpec, width: option.width, height: option.height };
  const compiled = vegalite.compile(vlSpec).spec;
  const view = await new vega.View(vega.parse(compiled), { renderer: "svg" }).runAsync();
  if (option === 'svg') {
    const svgOutput = await view.toSVG();
    return await Deno.jupyter.display({ "image/svg+xml": svgOutput }, { raw: true });
  } else {
    // Optionally set desired width/height if not specified in the spec
    const canvas = await view.toCanvas();
    const webpOutput = canvas.toDataURL("image/webp", 1.0);
    await Deno.jupyter.display({ "image/webp": webpOutput }, { raw: true });
  }
}
