import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gridRigSvgPointToBodyTemplatePreserveAspect } from "../src/app/(main)/development/fitting/lib/rig/gridModelRigExtract";
import { tPath } from "../src/app/(main)/development/fitting/lib/pathUtils";
import { getPathPoints } from "../src/app/(main)/development/fitting/svgPath/extractPoints";
import { BODY_CX, BZ } from "../src/app/(main)/development/fitting/lib/constants";

/**
 * ボディテンプレ座標（generate-garment-flat-cm-grid-body-template と同じ）で、path 同士が
 * 「近い／同じ格子バケット」を共有する近似本数を数え、胴パネル vs 左右に大きく広がるパネル（袖子級）との接続候補を列挙する。
 *
 * 運用: npm run analyze:grid-body-path-overlap
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontSilhouettePath = path.join(
  __dirname,
  "../public/fitting-models/grid-body-silhouette-path-source.svg"
);
const backSilhouettePath = path.join(
  __dirname,
  "../public/fitting-models/grid-body-back-silhouette-path-source.svg"
);

const DEST = path.join(
  __dirname,
  "../src/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingGridBodyPathOverlap.generated.ts"
);

const RIG_TAIL_PATHS = 9;
const QUANT = 4;
const LATERAL_EXTENT_PX = 200;
const TORSO_Y_LO = BZ.shoulder + 70;
const TORSO_Y_HI = BZ.hip - 40;

type HeuristicKind =
  | "rigTail"
  | "torsoPanel"
  | "lateralOrSleeve"
  | "headNeckUpper"
  | "lowerBody"
  | "other";

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

function toTemplatePaths(ds: string[], vbW: number, vbH: number): string[] {
  return ds.map((d) =>
    tPath(d, (x, y) => gridRigSvgPointToBodyTemplatePreserveAspect(vbW, vbH, x, y))
  );
}

function bboxOfPathD(d: string): { minX: number; maxX: number; minY: number; maxY: number; cx: number; cy: number } {
  const pts = getPathPoints(d);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function heuristicKind(i: number, n: number, box: ReturnType<typeof bboxOfPathD>): HeuristicKind {
  if (i >= n - RIG_TAIL_PATHS) return "rigTail";
  if (box.cy < BZ.shoulder + 55) return "headNeckUpper";
  if (box.cy > BZ.hip + 120) return "lowerBody";
  const spansTorsoBandY = box.maxY >= TORSO_Y_LO && box.minY <= TORSO_Y_HI;
  const halfW = (box.maxX - box.minX) / 2;
  /** 胴の Y 帯と bbox が交わり、細い〜中横幅で中心寄り→胴パネル優先 */
  const torsoLike =
    spansTorsoBandY &&
    Math.abs(box.cx - BODY_CX) < 130 &&
    halfW < 230;
  if (torsoLike) return "torsoPanel";
  const reachesFarLateral =
    box.minX < BODY_CX - LATERAL_EXTENT_PX || box.maxX > BODY_CX + LATERAL_EXTENT_PX;
  if (
    reachesFarLateral &&
    box.cy >= BZ.shoulder + 35 &&
    box.cy <= BZ.hip + 220
  ) {
    return "lateralOrSleeve";
  }
  return "other";
}

function analyzeVariant(paths: string[]) {
  const n = paths.length;
  const illustratedEnd = n - RIG_TAIL_PATHS;
  const heuristics = paths.map((d, i) => heuristicKind(i, n, bboxOfPathD(d)));

  const keyOwners = new Map<string, Set<number>>();
  for (let i = 0; i < n; i++) {
    for (const [x, y] of getPathPoints(paths[i]!)) {
      const k = `${Math.round(x * QUANT)},${Math.round(y * QUANT)}`;
      let s = keyOwners.get(k);
      if (!s) {
        s = new Set();
        keyOwners.set(k, s);
      }
      s.add(i);
    }
  }

  const pairShared = new Map<string, number>();
  const bump = (a: number, b: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const kk = `${lo},${hi}`;
    pairShared.set(kk, (pairShared.get(kk) ?? 0) + 1);
  };

  for (const s of keyOwners.values()) {
    if (s.size < 2) continue;
    const arr = [...s].sort((x, y) => x - y);
    for (let a = 0; a < arr.length; a++) {
      for (let b = a + 1; b < arr.length; b++) {
        bump(arr[a]!, arr[b]!);
      }
    }
  }

  const torsoArmBridge: (readonly [number, number, number])[] = [];
  /** イラスト部のみ・ヒューリスティックが異なるペア。縁の共有格子は少なくても拾うよう閾値を下げる。 */
  const illustratedCrossKindBridging: (readonly [number, number, number])[] = [];
  const minCross = 4;
  const minTorsoBridge = 8;
  for (const [aa, bb, cnt] of [...pairShared.entries()]
    .map(([kk, c]) => {
      const [as, bs] = kk.split(",");
      return [Number(as!), Number(bs!), c] as const;
    })
    .filter(([, , c]) => c >= minCross)) {
    const ha = heuristics[aa]!;
    const hb = heuristics[bb]!;
    if (aa >= illustratedEnd || bb >= illustratedEnd || ha === hb) continue;
    if (cnt >= minCross) illustratedCrossKindBridging.push([aa, bb, cnt]);
    if (
      cnt >= minTorsoBridge &&
      ((ha === "torsoPanel" && hb === "lateralOrSleeve") ||
        (hb === "torsoPanel" && ha === "lateralOrSleeve"))
    ) {
      torsoArmBridge.push([aa, bb, cnt]);
    }
  }

  const adjacencyDescending = [...pairShared.entries()]
    .map(([kk, cnt]) => {
      const [as, bs] = kk.split(",");
      return [Number(as!), Number(bs!), cnt] as const;
    })
    .filter(([, , cnt]) => cnt >= 8)
    .sort((x, y) => y[2] - x[2]);

  return {
    pathCount: n,
    illustratedEnd,
    heuristics,
    adjacencyDescending,
    torsoArmBridge,
    illustratedCrossKindBridging,
  };
}

const frontPaths = toTemplatePaths(
  extractPathDs(frontSilhouettePath),
  extractSvgViewBox(frontSilhouettePath).w,
  extractSvgViewBox(frontSilhouettePath).h
);
const backPaths = toTemplatePaths(
  extractPathDs(backSilhouettePath),
  extractSvgViewBox(backSilhouettePath).w,
  extractSvgViewBox(backSilhouettePath).h
);

const frontR = analyzeVariant(frontPaths);
const backR = analyzeVariant(backPaths);

const fileBody = `/** 自動生成: npx tsx scripts/analyze-grid-body-path-overlap.ts
 * テンプレ座標上で path 頂点を 1/${QUANT}px 量子化し、同じキーを踏む path ペアを数えた近似。
 * heuristic は bbox／Y 帯のヒューリスティック（厳密な胴・袖ラベルではない）。
 * illustratedCrossKindBridging: イラスト部のみ・ヒューリスティック異なるペア、共有格子本数>=4。
 * torsoLateralBridging: torsoPanel×lateralOrSleeve かつ共有本数>=8。
 */

export type GridBodyPathHeuristicKind =
  | "rigTail"
  | "torsoPanel"
  | "lateralOrSleeve"
  | "headNeckUpper"
  | "lowerBody"
  | "other";

export const GRID_BODY_PATH_OVERLAP_RIG_TAIL_PATHS = ${RIG_TAIL_PATHS} as const;

export const GRID_BODY_PATH_OVERLAP_FRONT = {
  pathCount: ${frontR.pathCount},
  illustratedPathCount: ${frontR.illustratedEnd},
  heuristicByPath: ${JSON.stringify(frontR.heuristics)} as const satisfies readonly GridBodyPathHeuristicKind[],
  pathAdjacencyDescending: ${JSON.stringify(frontR.adjacencyDescending)} as readonly (readonly [number, number, number])[],
  illustratedCrossKindBridging: ${JSON.stringify(frontR.illustratedCrossKindBridging)} as readonly (readonly [number, number, number])[],
  torsoLateralBridging: ${JSON.stringify(frontR.torsoArmBridge)} as readonly (readonly [number, number, number])[],
} as const;

export const GRID_BODY_PATH_OVERLAP_BACK = {
  pathCount: ${backR.pathCount},
  illustratedPathCount: ${backR.illustratedEnd},
  heuristicByPath: ${JSON.stringify(backR.heuristics)} as const satisfies readonly GridBodyPathHeuristicKind[],
  pathAdjacencyDescending: ${JSON.stringify(backR.adjacencyDescending)} as readonly (readonly [number, number, number])[],
  illustratedCrossKindBridging: ${JSON.stringify(backR.illustratedCrossKindBridging)} as readonly (readonly [number, number, number])[],
  torsoLateralBridging: ${JSON.stringify(backR.torsoArmBridge)} as readonly (readonly [number, number, number])[],
} as const;
`;

fs.writeFileSync(DEST, fileBody);
console.log("wrote", DEST);
console.log("front bridging", frontR.torsoArmBridge);
console.log("back bridging", backR.torsoArmBridge);
