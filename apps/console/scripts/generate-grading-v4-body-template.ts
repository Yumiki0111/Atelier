import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gridRigVectorPointToBodyTemplate } from "../src/app/(main)/development/fitting/lib/gridModelRigExtract";
import { tPath } from "../src/app/(main)/development/fitting/lib/pathUtils";

/** ソース SVG から読み込み、試着ボディへ写像する格子シルエット path 本数（リグ開始 index と一致させること） */
const GRID_SVG_SILHOUETTE_PATH_COUNT_FOR_BODY_TEMPLATE = 16;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fragmentPath = path.join(__dirname, "../public/fitting-models/grading-v4-model-paths.fragment.svg");
const destPath = path.join(
  __dirname,
  "../src/app/(main)/development/fitting/gradingV4/gradingV4GridBodyTemplate.generated.ts"
);

const raw = fs.readFileSync(fragmentPath, "utf8");
const re = /<path\b[^>]*\bd\s*=\s*"([^"]+)"/gi;
const ds: string[] = [];
let m: RegExpExecArray | null;
while ((m = re.exec(raw)) !== null) ds.push(m[1]!);

const n = GRID_SVG_SILHOUETTE_PATH_COUNT_FOR_BODY_TEMPLATE;
if (ds.length < n) {
  throw new Error(`fragment paths ${ds.length} < ${n}`);
}

const out = ds.slice(0, n).map((d) => tPath(d, gridRigVectorPointToBodyTemplate));
fs.writeFileSync(
  destPath,
  [
    `/** 自動生成: npx tsx scripts/generate-grading-v4-body-template.ts（格子シルエット先頭 ${n} 本＋リグを体テンプレ座標へ） */`,
    `export const BPATHS_GRADING_V4_GRID_SVG_BODY_TEMPLATE: string[] = ${JSON.stringify(out)};`,
    "",
  ].join("\n")
);
console.log("wrote", destPath, out.length, "paths");
