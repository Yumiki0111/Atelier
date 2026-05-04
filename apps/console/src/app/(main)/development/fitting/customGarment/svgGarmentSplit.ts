import type { CustomLandmarks } from "../lib/types";
import { getPathPoints, getPathsBBox } from "../lib/pathUtils";
import { MODEL_RIG_LINE_PATH_DS } from "../lib/modelRigData";
import type { RigPathEndpoints } from "./rigMatching";
import {
  MODEL_RIG_ENDPOINTS,
  VERIFICATION_RIG_ENDPOINTS,
  GRID_MODEL_RIG_ENDPOINTS,
  normalizePathDForMatch,
} from "./rigMatching";
import type { SvgParsedPath } from "./parseSvgPaths";
import {
  assertValidGridModelRigCompound,
  gridModelRigCompoundToNineSvgPathDs,
  GRID_MODEL_RIG_STROKE_COMPOUND_D,
} from "../lib/gridModelRigExtract";
import { GRID_RIG_NINE_PATH_DS_SVG } from "../lib/gridSvgRigData";
import {
  LINE_ART_VERIFICATION_RIG_STROKE_COMPOUND_D,
  VERIFICATION_RIG_NINE_PATH_DS_SVG,
} from "../lib/modelDataVerification";

function getBBoxOfPathPoints(points: [number, number][]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return { minX, minY, maxX, maxY };
}

/** `gridVector9Only`: 格子ボディ運用時。mv_model / 検証リグへの幾何マッチを行わない */
export type SvgGarmentRigSplitPreset = "auto" | "gridVector9Only";

/**
 * 先頭 path が Vector(9) compound（canonical または構造正当）なら 9 本に分ける。失敗時は null。
 */
function trySplitGridVector9FromFirstPath(paths: SvgParsedPath[]): {
  garmentPaths: SvgParsedPath[];
  rigPaths: SvgParsedPath[];
} | null {
  if (paths.length < 1) return null;
  const compoundD = paths[0]!.d.trim();
  const matchesCanonicalVector9 =
    normalizePathDForMatch(compoundD) === normalizePathDForMatch(GRID_MODEL_RIG_STROKE_COMPOUND_D);
  if (matchesCanonicalVector9) {
    const stem = paths[0]!;
    const rigPaths: SvgParsedPath[] = [...GRID_RIG_NINE_PATH_DS_SVG].map((d) => ({ ...stem, d }));
    return { rigPaths, garmentPaths: paths.slice(1) };
  }
  const matchesVerificationVector9 =
    normalizePathDForMatch(compoundD) === normalizePathDForMatch(LINE_ART_VERIFICATION_RIG_STROKE_COMPOUND_D);
  if (matchesVerificationVector9) {
    const stem = paths[0]!;
    const rigPaths: SvgParsedPath[] = [...VERIFICATION_RIG_NINE_PATH_DS_SVG].map((d) => ({ ...stem, d }));
    return { rigPaths, garmentPaths: paths.slice(1) };
  }
  try {
    assertValidGridModelRigCompound(compoundD);
    const stem = paths[0]!;
    const rigDs = gridModelRigCompoundToNineSvgPathDs(compoundD);
    const rigPaths: SvgParsedPath[] = rigDs.map((d) => ({ ...stem, d }));
    return { rigPaths, garmentPaths: paths.slice(1) };
  } catch {
    return null;
  }
}

/**
 * 共通リグ入り SVG（model+rig を服SVGに合成した状態）を想定し、
 * 「ボディ輪郭・中心軸・補助線」っぽい path を除外して“服パーツだけ”に寄せます。
 * `SvgParsedPath` 単位で分割し、線スタイル（stroke 等）を服側に残します。
 *
 * @param preset `gridVector9Only`: 画面上で格子モデルを選んでいるときのみ。それ以外モデル用リグ検出へ落ちない。
 */
export function splitGarmentPathsFromSvgParsed(
  paths: SvgParsedPath[],
  preset: SvgGarmentRigSplitPreset = "auto"
): {
  garmentPaths: SvgParsedPath[];
  rigPaths: SvgParsedPath[];
} {
  const gridSplit = trySplitGridVector9FromFirstPath(paths);
  if (gridSplit != null) return gridSplit;
  if (preset === "gridVector9Only") {
    return { garmentPaths: paths, rigPaths: [] };
  }

  const pathDs = paths.map((p) => p.d);
  // まずは「モデル+リグから抽出した 9 本の rig d」と完全一致するものだけを rig として抜く。
  // 4862×6431 系の検証リグも同一契約で別座標のため併記（Figma エクスポートの d が一致すれば抜ける）。
  const rigExactSet = new Set([
    ...MODEL_RIG_LINE_PATH_DS,
    ...GRID_RIG_NINE_PATH_DS_SVG,
    ...VERIFICATION_RIG_NINE_PATH_DS_SVG,
  ]);
  const rigExact: SvgParsedPath[] = [];
  const keepExact: SvgParsedPath[] = [];
  for (const p of paths) {
    if (rigExactSet.has(p.d)) rigExact.push(p);
    else keepExact.push(p);
  }
  // 完全一致が 1 本でも取れたなら、追加の heuristics を混ぜずに「完全一致のみ」を rig とする。
  // これで zip 線など“それっぽい直線”が誤ってリグに入るのを防ぐ。
  if (rigExact.length > 0) {
    // ただし、アップロードSVGに含まれる “ジップ線っぽい中心縦線” は、
    // rig9 本の中に混ざって見えることがあるため、幅が極端に狭い1本だけ rig から除外する。
    // （除外した線は garment 側に戻す）
    let zipCandidate: SvgParsedPath | null = null;
    let minW = Infinity;
    for (const p of rigExact) {
      const pts = getPathPoints(p.d);
      if (pts.length < 2) continue;
      const bb = getBBoxOfPathPoints(pts);
      if (!bb) continue;
      const w = bb.maxX - bb.minX;
      if (w < minW) {
        minW = w;
        zipCandidate = p;
      }
    }

    // モデル rig は 9 本固定。ここで 1 本落とすと `debugRigPathDs.length !== rigLinePaths.length` となり
    // `rigGeometryLockedToModel` が常に false になり、ウィジェット試着で体に対して縦ズレする。
    // ジップ除外は「同一 d が重複して rig に数え上げ過ぎているとき」だけ行う（9 本ちょうどのときは除外しない）。
    const modelRigCount = MODEL_RIG_LINE_PATH_DS.length;
    const shouldExcludeZip =
      zipCandidate != null && minW <= 2.0 && rigExact.length > modelRigCount;
    const rigPaths = shouldExcludeZip ? rigExact.filter((p) => p !== zipCandidate) : rigExact;
    const garmentPaths = shouldExcludeZip ? [...keepExact, ...(zipCandidate ? [zipCandidate] : [])] : keepExact;
    return { garmentPaths, rigPaths };
  }

  // 完全一致が取れない場合（小数丸めやエクスポート差で d が変わるケース）:
  // モデル rig の 9 本が持つ「端点の幾何配置」に合うものだけを rig として推定する。
  // これで zip のような別の直線は、モデル rig の配置整合性を満たさず除外できる。
  const modelRigRigCountTarget = MODEL_RIG_LINE_PATH_DS.length;
  const straightCandidates = paths
    .map((pathEnt, idx) => {
      const d = pathEnt.d;
      const isStraightLike = !/[CcQqSsTtAa]/.test(d);
      if (!isStraightLike) return null;
      const pts = getPathPoints(d);
      if (pts.length < 2) return null;
      const p0 = pts[0];
      const p1 = pts[pts.length - 1];
      const min = p0[1] <= p1[1] ? [p0[0], p0[1]] : [p1[0], p1[1]];
      const max = p0[1] <= p1[1] ? [p1[0], p1[1]] : [p0[0], p0[1]];
      const lenY = Math.abs(max[1] - min[1]);
      const lenX = Math.abs(max[0] - min[0]);
      return { d, idx, min, max, lenY, lenX };
    })
    .filter(Boolean) as Array<{ d: string; idx: number; min: [number, number]; max: [number, number]; lenY: number; lenX: number }>;

  if (straightCandidates.length >= modelRigRigCountTarget) {
    const pickBestForTemplate = (modelEndpoints: RigPathEndpoints[]) => {
      let best = { score: -1, scale: 1, tx: 0, ty: 0 };
      if (modelEndpoints.length !== modelRigRigCountTarget) return best;

      // seed: 直線候補のうち上端〜下端が長いものを優先して試す
      const seeds = straightCandidates
        .slice()
        .sort((a, b) => b.lenY - a.lenY)
        .slice(0, 6);

      // seed 候補の min/max をモデルの min/max に対応付けて similarity(単一 scale + translation) を推定
      for (const cand of seeds) {
        for (let mi = 0; mi < modelEndpoints.length; mi++) {
          const m = modelEndpoints[mi];
          const modelLenY = m.max[1] - m.min[1];
          const candLenY = cand.max[1] - cand.min[1];
          if (!Number.isFinite(modelLenY) || !Number.isFinite(candLenY) || Math.abs(modelLenY) < 1) continue;
          const scale = candLenY / modelLenY;
          if (!Number.isFinite(scale) || Math.abs(scale) < 0.01 || Math.abs(scale) > 10) continue;

          const tx = cand.min[0] - m.min[0] * scale;
          const ty = cand.min[1] - m.min[1] * scale;

          // tolerance は scale と rig 長さに応じて調整
          const tol = Math.max(6, Math.abs(candLenY) * 0.02);

          // 9本のモデル rig がどれだけ候補に一致するかスコア
          let score = 0;
          for (let mj = 0; mj < modelEndpoints.length; mj++) {
            const mjep = modelEndpoints[mj];
            const expMin: [number, number] = [mjep.min[0] * scale + tx, mjep.min[1] * scale + ty];
            const expMax: [number, number] = [mjep.max[0] * scale + tx, mjep.max[1] * scale + ty];

            let matched = false;
            for (const c2 of straightCandidates) {
              const d1 = Math.hypot(c2.min[0] - expMin[0], c2.min[1] - expMin[1]);
              const d2 = Math.hypot(c2.max[0] - expMax[0], c2.max[1] - expMax[1]);
              const dAlt1 = Math.hypot(c2.min[0] - expMax[0], c2.min[1] - expMax[1]);
              const dAlt2 = Math.hypot(c2.max[0] - expMin[0], c2.max[1] - expMin[1]);
              const bestPair = Math.min(d1 + d2, dAlt1 + dAlt2);
              if (bestPair <= tol) {
                matched = true;
                break;
              }
            }
            if (matched) score++;
          }

          if (score > best.score) {
            best = { score, scale, tx, ty };
          }
        }
      }
      return best;
    };

    const bestDefault = pickBestForTemplate(MODEL_RIG_ENDPOINTS);
    const bestVer = pickBestForTemplate(VERIFICATION_RIG_ENDPOINTS);
    const bestGrid = pickBestForTemplate(GRID_MODEL_RIG_ENDPOINTS);

    type GridSplitTemplateKind = "default" | "verification" | "grid";
    const ranked: Array<{
      score: number;
      scale: number;
      tx: number;
      ty: number;
      modelEndpoints: RigPathEndpoints[];
      kind: GridSplitTemplateKind;
    }> = [
      {
        score: bestDefault.score,
        scale: bestDefault.scale,
        tx: bestDefault.tx,
        ty: bestDefault.ty,
        modelEndpoints: MODEL_RIG_ENDPOINTS,
        kind: "default",
      },
      {
        score: bestVer.score,
        scale: bestVer.scale,
        tx: bestVer.tx,
        ty: bestVer.ty,
        modelEndpoints: VERIFICATION_RIG_ENDPOINTS,
        kind: "verification",
      },
      {
        score: bestGrid.score,
        scale: bestGrid.scale,
        tx: bestGrid.tx,
        ty: bestGrid.ty,
        modelEndpoints: GRID_MODEL_RIG_ENDPOINTS,
        kind: "grid",
      },
    ];
    ranked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const pri: Record<GridSplitTemplateKind, number> = { grid: 0, verification: 1, default: 2 };
      return pri[a.kind] - pri[b.kind];
    });
    const best = ranked[0]!;
    if (best.score >= modelRigRigCountTarget - 1) {
      const modelEndpoints = best.modelEndpoints;
      // best transform で一致する候補だけを抽出（一致は min/max の近さで判定）
      const tol = Math.max(6, Math.abs(straightCandidates[0]?.lenY ?? 0) * 0.02);
      const used = new Set<number>();
      const rigParsed: SvgParsedPath[] = [];

      // まずモデル 9 本ごとに最も近い候補を選ぶ（重複は不可）
      for (let mj = 0; mj < modelEndpoints.length; mj++) {
        const m = modelEndpoints[mj]!;
        const expMin: [number, number] = [m.min[0] * best.scale + best.tx, m.min[1] * best.scale + best.ty];
        const expMax: [number, number] = [m.max[0] * best.scale + best.tx, m.max[1] * best.scale + best.ty];
        let bestCand: { d: string; dist: number; idx: number } | null = null;
        for (const c2 of straightCandidates) {
          if (used.has(c2.idx)) continue;
          const d1 = Math.hypot(c2.min[0] - expMin[0], c2.min[1] - expMin[1]);
          const d2 = Math.hypot(c2.max[0] - expMax[0], c2.max[1] - expMax[1]);
          const dAlt1 = Math.hypot(c2.min[0] - expMax[0], c2.min[1] - expMax[1]);
          const dAlt2 = Math.hypot(c2.max[0] - expMin[0], c2.max[1] - expMin[1]);
          const dist = Math.min(d1 + d2, dAlt1 + dAlt2);
          if (dist <= tol && (!bestCand || dist < bestCand.dist)) {
            bestCand = { d: c2.d, dist, idx: c2.idx };
          }
        }
        if (bestCand) {
          rigParsed.push(paths[bestCand.idx]!);
          used.add(bestCand.idx);
        }
      }

      // 9本揃わないならヒューリスティック混入で zip が再発するので、厳しめに担保する。
      if (rigParsed.length >= modelRigRigCountTarget - 1) {
        const rigSet = new Set(rigParsed.map((p) => p.d));
        const garmentPaths = paths.filter((p) => !rigSet.has(p.d));
        return { garmentPaths, rigPaths: rigParsed };
      }
    }
  }

  // path が少なくても（ユーザーSVGの都合で）リグ直線だけは抜け落ちさせない。
  if (pathDs.length < 6) return { garmentPaths: paths, rigPaths: [] };
  const bb = getPathsBBox(pathDs);
  if (!bb) return { garmentPaths: paths, rigPaths: [] };
  const { minX, minY, maxX, maxY } = bb;
  const oW = maxX - minX;
  const oH = maxY - minY;
  if (!Number.isFinite(oW) || !Number.isFinite(oH) || oW < 1 || oH < 1) return { garmentPaths: paths, rigPaths: [] };

  // 全身にまたがる（上端〜下端までほぼ覆う）ものは、リグ/ボディ混入の可能性が高い
  const topBand = minY + oH * 0.05;
  const botBand = maxY - oH * 0.05;
  const keep: SvgParsedPath[] = [];
  const rig: SvgParsedPath[] = [];
  let removedCount = 0;

  for (const p of paths) {
    const d = p.d;
    const pts = getPathPoints(d);
    if (pts.length < 2) {
      removedCount++;
      rig.push(p);
      continue;
    }
    const pbb = getBBoxOfPathPoints(pts);
    if (!pbb) continue;
    const pW = pbb.maxX - pbb.minX;
    const pH = pbb.maxY - pbb.minY;
    const narrow = pW <= oW * 0.06;
    const isStraightLike = !/[CcQqSsTtAa]/.test(d);
    const lineLike = isStraightLike && pts.length <= 4;
    // model+rig / blouson+rig 系の rig は「直線 + 頂点がほぼ2点（端点）」になることが多い。
    // ここを強めないと、肩〜中腹までしか伸びない斜め rig が服側に残ってしまう。
    const isRigCandidate = isStraightLike && pts.length <= 2;
    const spansNearlyFullHeight = pbb.minY <= topBand && pbb.maxY >= botBand;
    const spansEnoughHeight = pH >= oH * 0.6;
    const sparse = pts.length <= 3 && pH >= oH * 0.2;

    // rig は「直線 + 縦に長い + 細い」になりやすいので、full-height を要求しすぎない。
    const tallThin = lineLike && pH >= oH * 0.25 && pW <= oW * 0.15;
    // 頂点の多い折れ線（ブローゾンのフード開き・衿まわり等）は縦長でも服の輪郭。
    // lineLike なしで spansEnoughHeight だけだと、Auralee 系の左右フード path が rig に落ちてプロットから消える。
    const remove =
      isRigCandidate ||
      (lineLike && spansNearlyFullHeight && (narrow || spansEnoughHeight)) ||
      tallThin ||
      sparse;
    if (remove) {
      removedCount++;
      rig.push(p);
    } else {
      keep.push(p);
    }
  }

  const minKeep = 1;
  if (keep.length < minKeep) {
    return { garmentPaths: keep.length > 0 ? keep : paths, rigPaths: rig.length > 0 ? rig : [] };
  }
  return { garmentPaths: removedCount > 0 ? keep : paths, rigPaths: removedCount > 0 ? rig : [] };
}

/** d のみの配列向け。線スタイルは保持しない。 */
export function splitGarmentPathsFromSvg(
  pathDs: string[],
  preset: SvgGarmentRigSplitPreset = "auto"
): { garmentPathDs: string[]; rigPathDs: string[] } {
  const r = splitGarmentPathsFromSvgParsed(pathDs.map((d) => ({ d })), preset);
  return { garmentPathDs: r.garmentPaths.map((p) => p.d), rigPathDs: r.rigPaths.map((p) => p.d) };
}

export function filterGarmentPathsFromSvg(pathDs: string[]): string[] {
  return splitGarmentPathsFromSvg(pathDs).garmentPathDs;
}

/** 肩・上胴（topY / 肩幅）用。前中心付近のみ。 */
const LANDMARK_TORSO_STRIP_HALF_FRAC = 0.2;
/**
 * 裾 Y 専用。狭い帯だと前立て下端だけが拾われ袖先より上で止まり、着丈 px が短く scale が膨らむ（flat 外形でよくある）。
 * やや広い帯で袖付け〜袖口付近まで含め、全体 bbox 下端との差がまだ大きいときだけ控えめに伸ばす。
 */
const LANDMARK_HEM_STRIP_HALF_FRAC = 0.385;
const LANDMARK_HEM_GAP_MIN_FRAC = 0.042;
const LANDMARK_HEM_GAP_MIN_ABS = 52;
const LANDMARK_HEM_EXT_CAP_FRAC = 0.26;

/**
 * 全 path の頂点から着用用ランドマークを粗推定。
 * - 裾: **狭帯の maxY だけではなく**、裾用の広い中央縦帯の maxY を採用。bbox 下端と差がまだ大きいときだけ追加で伸ばす（ベタ足袖先の救済）。
 * - 肩: 狭い縦帯の上端〜裾の深さに対する比率で肩 Y 代理。
 */
export function getLandmarksFromPaths(pathDs: string[]): CustomLandmarks | null {
  const bb = getPathsBBox(pathDs);
  if (!bb) return null;
  const { minX, minY, maxX, maxY } = bb;
  const w = maxX - minX;
  const h = maxY - minY;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return null;

  const allPts: [number, number][] = pathDs.flatMap((d) => getPathPoints(d));
  const cx = (minX + maxX) / 2;
  const halfTorso = w * LANDMARK_TORSO_STRIP_HALF_FRAC;
  const torsoPts = allPts.filter((p) => Math.abs(p[0] - cx) <= halfTorso);
  const halfHem = w * LANDMARK_HEM_STRIP_HALF_FRAC;
  const hemStripPts = allPts.filter((p) => Math.abs(p[0] - cx) <= halfHem);

  let hemY: number;
  let shoulderY: number;
  let shoulderLx: number;
  let shoulderRx: number;

  if (torsoPts.length >= 3) {
    const ys = torsoPts.map((p) => p[1]);
    const topY = Math.min(...ys);
    const hemYNarrow = Math.max(...ys);
    const yMaxAll = Math.max(...allPts.map((p) => p[1]));
    const hemFromStrip =
      hemStripPts.length >= 1 ? Math.max(...hemStripPts.map((p) => p[1])) : hemYNarrow;
    const gapBelow = yMaxAll - hemFromStrip;
    const gapTol = Math.max(LANDMARK_HEM_GAP_MIN_FRAC * h, LANDMARK_HEM_GAP_MIN_ABS);
    hemY =
      gapBelow > gapTol
        ? hemFromStrip + Math.min(gapBelow, LANDMARK_HEM_EXT_CAP_FRAC * h)
        : hemFromStrip;
    hemY = Math.min(hemY, yMaxAll);

    const depth = Math.max(hemY - topY, 1);
    // 縦帯の最上端〜裾の間で、ごく上寄りを肩ラインの代理にする（首周り単一点より安定）
    shoulderY = topY + depth * 0.14;
    const upperTorso = torsoPts.filter((p) => p[1] <= shoulderY + depth * 0.22);
    const xs = (upperTorso.length >= 2 ? upperTorso : torsoPts).map((p) => p[0]);
    shoulderLx = Math.min(...xs);
    shoulderRx = Math.max(...xs);
  } else {
    hemY = maxY;
    shoulderY = minY + h * 0.2;
    shoulderLx = minX + w * 0.15;
    shoulderRx = maxX - w * 0.15;
  }

  return {
    shoulderY,
    shoulderLx,
    shoulderRx,
    hemY,
    hemCx: cx,
  };
}
