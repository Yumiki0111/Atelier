import { SVG_NUMBER_PATTERN } from "./tokenize";
import { getPathPoints } from "./extractPoints";

/** 複数 path の d をまとめた bounding box */
export function getPathsBBox(pathDs: string[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let hasAny = false;
  for (const d of pathDs) {
    const pts = getPathPoints(d);
    for (const [x, y] of pts) {
      hasAny = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!hasAny) return null;
  return { minX, minY, maxX, maxY };
}

export function pathToPoints(d: string): [number, number][] {
  const pts: [number, number][] = [];
  const re = new RegExp(String.raw`([MLHVZz])|(${SVG_NUMBER_PATTERN})`, "gi");
  const toks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) toks.push(m[0]);
  let i = 0,
    cx = 0,
    cy = 0;
  while (i < toks.length) {
    const c = toks[i];
    i++;
    if (c === "M" || c === "L") {
      cx = +toks[i]!;
      cy = +toks[i + 1]!;
      i += 2;
      pts.push([cx, cy]);
    } else if (c === "H") {
      cx = +toks[i]!;
      i += 1;
      pts.push([cx, cy]);
    } else if (c === "V") {
      cy = +toks[i]!;
      i += 1;
      pts.push([cx, cy]);
    }
  }
  return pts;
}
