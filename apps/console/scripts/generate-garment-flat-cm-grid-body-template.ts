import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gridRigSvgPointToBodyTemplatePreserveAspect } from "../src/app/(main)/development/fitting/lib/rig/gridModelRigExtract";
import { tPath } from "../src/app/(main)/development/fitting/lib/pathUtils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontSilhouettePath = path.join(
  __dirname,
  "../public/fitting-models/grid-body-silhouette-path-source.svg"
);
const backSilhouettePath = path.join(
  __dirname,
  "../public/fitting-models/grid-body-back-silhouette-path-source.svg"
);
const destPath = path.join(
  __dirname,
  "../src/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingGridBodyTemplate.generated.ts"
);

function extractPathDs(svgPath: string): string[] {
  const raw = fs.readFileSync(svgPath, "utf8");
  const re = /<path\b[^>]*\bd\s*=\s*"([^"]+)"/gi;
  const ds: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) ds.push(m[1]!);
  return ds;
}

function extractSvgViewBox(svgPath: string): { w: number; h: number } {
  const raw = fs.readFileSync(svgPath, "utf8");
  const m = raw.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!m) throw new Error(`${svgPath}: no viewBox`);
  const parts = m[1]!.trim().split(/\s+/).map(Number);
  if (parts.length < 4 || parts.some((x) => Number.isNaN(x))) throw new Error(`${svgPath}: bad viewBox`);
  return { w: parts[2]!, h: parts[3]! };
}

const frontDs = extractPathDs(frontSilhouettePath);
const nFront = frontDs.length;
if (nFront < 1) throw new Error(`${frontSilhouettePath}: no <path d> found`);

const backDs = extractPathDs(backSilhouettePath);
const nBack = backDs.length;
if (nBack < 1) throw new Error(`${backSilhouettePath}: no <path d> found`);

const frontVb = extractSvgViewBox(frontSilhouettePath);
const backVb = extractSvgViewBox(backSilhouettePath);

const outFront = frontDs.map((d) =>
  tPath(d, (x, y) => gridRigSvgPointToBodyTemplatePreserveAspect(frontVb.w, frontVb.h, x, y))
);

/** 背面は専用 asset（viewBox は前面と同系の 391×518 等）。cover 変換のみ前面と同一関数で統一する */
const outBack = backDs.map((d) =>
  tPath(d, (x, y) => gridRigSvgPointToBodyTemplatePreserveAspect(backVb.w, backVb.h, x, y))
);

fs.writeFileSync(
  destPath,
  [
    `/** 自動生成: npx tsx scripts/generate-garment-flat-cm-grid-body-template.ts`,
    ` * 前面 ${nFront} 本・viewBox ${frontVb.w}×${frontVb.h}／背面 ${nBack} 本・viewBox ${backVb.w}×${backVb.h} */`,
    `export const BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_TEMPLATE: string[] = ${JSON.stringify(outFront)};`,
    `/** 格子背面ボディ（grid-body-back-silhouette-path-source.svg） */`,
    `export const BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_BACK_TEMPLATE: string[] = ${JSON.stringify(outBack)};`,
    "",
  ].join("\n")
);
console.log("wrote", destPath, "front", outFront.length, "back", outBack.length, "paths");
