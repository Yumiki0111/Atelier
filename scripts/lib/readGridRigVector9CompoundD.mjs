import fs from "node:fs";
import path from "node:path";

/**
 * `grid-rig-vector9.svg`（= Vector (9).svg）から stroke-only の compound path `d` を 1 本だけ取り出す。
 * `gridModelRigExtract.extractStrokeOnlyPathDsFromSvgMarkup` と同じ判定。
 */
export function extractStrokeCompoundDFromGridRigSvgMarkup(svg) {
  const out = [];
  const re = /<path\b([^/]*)\/>/gi;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const attrs = m[1];
    if (!/\bstroke\s*=/.test(attrs)) continue;
    if (/\bfill\s*=/.test(attrs) && !/\bfill\s*=\s*["']none["']/i.test(attrs)) continue;
    const dm = /\bd\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (dm) out.push(dm[1]);
  }
  if (out.length !== 1) {
    throw new Error(`grid-rig-vector9.svg: stroke-only path は 1 本想定, 実際 ${out.length}`);
  }
  return out[0];
}

export function readGridRigCompoundDFromRepo(repoRoot) {
  const p = path.join(repoRoot, "apps/console/public/fitting-models/grid-rig-vector9.svg");
  const svg = fs.readFileSync(p, "utf8");
  return extractStrokeCompoundDFromGridRigSvgMarkup(svg);
}
