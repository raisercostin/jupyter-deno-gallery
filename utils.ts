//import pl from "npm:nodejs-polars";
//import { document } from "jsr:@ry/jupyter-helper";
import * as csv from "jsr:@std/csv";

export async function readAllCells2(filePath: string) {
  const file = await Deno.readTextFile(filePath);
  const rows = await csv.parse(file, { separator: "\t", lazyQuotes:true });
  return rows;
}
export async function readAllCells(filePath: string) {
  const file = await Deno.readTextFile(filePath);
  return file.split("\n").map(line => line === "" ? [""] : line.split("\t"));
}

/**Row/columns are 0 based */
export function extractRegion(rows:unknown[], option:{startRow:number, startCol:number, height?:number, width?:number, endRow?:number, endCol?:number}) {
  const endRow = option.endRow || option.startRow+(option.height??1)
  const endCol = option.endCol || option.startCol+(option.width??1)
  const region = rows.slice(option.startRow, endRow+1).map(row => (row as any).slice(option.startCol,endCol+1));
  return region;
}
export function isEven(n: number): boolean {
  if (n % 2 != 0) {
    return false
  }
  return true;
}
