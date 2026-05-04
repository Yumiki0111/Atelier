#!/usr/bin/env node
/**
 * 正本 `apps/console/public/fitting-models/grid-rig-vector9.svg`（Vector (9).svg）から
 * `GRID_MODEL_RIG_STROKE_COMPOUND_D` を読み、`gridModelRigExtract.ts` の export を上書きする。
 *
 *   node scripts/sync-grid-model-rig-d.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGridRigCompoundDFromRepo } from "./lib/readGridRigVector9CompoundD.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const d = readGridRigCompoundDFromRepo(repoRoot);
const tsPath = path.join(
  repoRoot,
  "apps/console/src/app/(main)/development/fitting/lib/gridModelRigExtract.ts"
);
let ts = fs.readFileSync(tsPath, "utf8");
const marker = /export const GRID_MODEL_RIG_STROKE_COMPOUND_D =\s*\n\s*"[^"]*";/;
if (!marker.test(ts)) {
  console.error("sync-grid-model-rig-d: gridModelRigExtract.ts の GRID_MODEL_RIG_STROKE_COMPOUND_D が見つかりません");
  process.exit(1);
}
const escaped = d.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
ts = ts.replace(marker, `export const GRID_MODEL_RIG_STROKE_COMPOUND_D =\n  "${escaped}";`);
fs.writeFileSync(tsPath, ts);
console.error(`sync-grid-model-rig-d: ok (${d.length} chars) <- grid-rig-vector9.svg`);
