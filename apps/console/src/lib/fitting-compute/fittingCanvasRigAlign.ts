import { REF_HEIGHT_CM } from "@/app/(main)/development/fitting/lib/constants";
import { MODEL_RIG_LINE_PATH_DS } from "@/app/(main)/development/fitting/lib/modelRigData";
import type { RigRedLineArmDiagram } from "./fittingCanvasComputeTypes";
import { getPathPoints, tPath } from "@/app/(main)/development/fitting/lib/pathUtils";

/** `MODEL_RIG_LINE_PATH_DS` と同じ index（modelRigData / FITTING_CANON §3 と一致） */
export const RIG_LINE_SPINE = 0;
export const RIG_LINE_ARM_L = 1;
export const RIG_LINE_ARM_R = 2;
export const RIG_LINE_CLAVICLE_L = 5;
export const RIG_LINE_CLAVICLE_R = 6;
/** モデル・服 SVG のリグ path 本数（index 0..8）。肩図などは主に 0,1,2,5,6 を参照するが 7–8 も契約に含む */
export const RIG_LINE_PATH_COUNT = MODEL_RIG_LINE_PATH_DS.length;

/**
 * 上腕リグ(path 1/2)を肩支点で鉛直寄りに回す係数（°/cm）。0 で無効。
 * 体輪郭のリグスキン・服の `rigTemplateToRigView*` がこの腕線に合わせるため、
 * 0 にすると身長が基準からズレたとき「腕に袖が追従しにくい」ことがある。
 * 非 0 だと身長スライダーで鎖骨・脊髄に対する腕線の見かけの角も少し変わる（トレードオフ）。
 */
export const RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM = 0.1;

/** 脊髄頭側〜この割合までは全体スケールの掛かりを弱める（+Y 下で yTop が頭寄り） */
export const RIG_ALIGN_HEAD_SPINE_FRACTION = 0.28;
/** 頭頂付近で (scale-1) に掛ける係数（胴〜足側は 1 に近づく） */
export const RIG_ALIGN_HEAD_SCALE_BLEND_MIN = 0.38;

/** カスタム服: テンプレ空間でモデルリグと服リグを平行移動だけ合わせる（スケールはしない。追従は後段の rigTemplateToRigView） */
export type CustomRigAlign = { enabled: false } | { enabled: true; dx: number; dy: number };

export function applyCustomRigAlignInPlace(x: number, y: number, a: CustomRigAlign): [number, number] {
  if (!a.enabled) return [x, y];
  return [x + a.dx, y + a.dy];
}

export function rotatePointAboutPivotPx(
  x: number,
  y: number,
  px: number,
  py: number,
  thetaRad: number
): [number, number] {
  const cos = Math.cos(thetaRad);
  const sin = Math.sin(thetaRad);
  const dx = x - px;
  const dy = y - py;
  return [px + dx * cos - dy * sin, py + dx * sin + dy * cos];
}

/** 脊髄合わせ済みリグ view の腕線だけ肩先端を支点に回転（`rigLineWarpedRigViewPaths` と同一ロジック）。 */
export function applyRigArmAngleTiltToWarpedRigPaths(
  paths: string[],
  heightCm: number,
  armLIdx: number,
  armRIdx: number
): string[] {
  if (paths.length <= armRIdx) return paths;
  const dh = heightCm - REF_HEIGHT_CM;
  const k = (RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM * Math.PI) / 180;
  const twistL = -dh * k;
  const twistR = dh * k;
  if (Math.abs(twistL) < 1e-12) return paths;
  const ptsL = getPathPoints(paths[armLIdx]!);
  const ptsR = getPathPoints(paths[armRIdx]!);
  const pL = ptsL[0];
  const pR = ptsR[0];
  if (!pL || !pR) return paths;
  const [pLx, pLy] = pL;
  const [pRx, pRy] = pR;
  const out = [...paths];
  out[armLIdx] = tPath(paths[armLIdx]!, (x, y) => rotatePointAboutPivotPx(x, y, pLx, pLy, twistL));
  out[armRIdx] = tPath(paths[armRIdx]!, (x, y) => rotatePointAboutPivotPx(x, y, pRx, pRy, twistR));
  return out;
}

/**
 * 基準体型でワープしたリグ上の点を、脊髄合わせ後の座標へ写す（`rigLineWarpedRigViewPaths` と同じ変換）。
 * 戻り値が null のときは呼び出し側で ref ワープ座標をそのまま使う。
 */
export function computeRigSpineAlignFn(
  refWarpedPaths: string[],
  currentWarpedPaths: string[]
): ((x: number, y: number) => [number, number]) | null {
  if (
    refWarpedPaths.length < RIG_LINE_PATH_COUNT ||
    currentWarpedPaths.length < RIG_LINE_PATH_COUNT
  ) {
    return null;
  }
  const refSp = getPathPoints(refWarpedPaths[RIG_LINE_SPINE]!);
  const curSp = getPathPoints(currentWarpedPaths[RIG_LINE_SPINE]!);
  if (refSp.length < 2 || curSp.length < 2) return null;

  const s0r = refSp[0]!;
  const s1r = refSp[refSp.length - 1]!;
  const s0c = curSp[0]!;
  const s1c = curSp[curSp.length - 1]!;

  const crx = (s0r[0] + s1r[0]) / 2;
  const cry = (s0r[1] + s1r[1]) / 2;
  const ccx = (s0c[0] + s1c[0]) / 2;
  const ccy = (s0c[1] + s1c[1]) / 2;

  const lenR = Math.hypot(s1r[0] - s0r[0], s1r[1] - s0r[1]);
  const lenC = Math.hypot(s1c[0] - s0c[0], s1c[1] - s0c[1]);
  if (lenR < 1e-6) return null;
  const scale = lenC / lenR;

  const yTop = Math.min(s0r[1], s1r[1]);
  const yBot = Math.max(s0r[1], s1r[1]);
  const ySpan = yBot - yTop;
  const yBlendEnd = yTop + ySpan * RIG_ALIGN_HEAD_SPINE_FRACTION;

  const effectiveScaleAtY = (y: number): number => {
    if (ySpan < 1e-6) return scale;
    if (y >= yBlendEnd) return scale;
    const denom = Math.max(yBlendEnd - yTop, 1e-6);
    let t = (y - yTop) / denom;
    t = Math.max(0, Math.min(1, t));
    const smooth = t * t * (3 - 2 * t);
    const blend =
      RIG_ALIGN_HEAD_SCALE_BLEND_MIN + (1 - RIG_ALIGN_HEAD_SCALE_BLEND_MIN) * smooth;
    return 1 + (scale - 1) * blend;
  };

  return (x: number, y: number): [number, number] => {
    const s = effectiveScaleAtY(y);
    return [s * (x - crx) + ccx, s * (y - cry) + ccy];
  };
}

function infiniteLineIntersection(
  p1: [number, number],
  p2: [number, number],
  q1: [number, number],
  q2: [number, number]
): [number, number] | null {
  const dx1 = p2[0] - p1[0];
  const dy1 = p2[1] - p1[1];
  const dx2 = q2[0] - q1[0];
  const dy2 = q2[1] - q1[1];
  const den = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((q1[0] - p1[0]) * dy2 - (q1[1] - p1[1]) * dx2) / den;
  return [p1[0] + t * dx1, p1[1] + t * dy1];
}

/**
 * path0（中心軸）と path5/6（鎖骨）の交点・首平均・肩外側。
 * ワープ後座標系（`rigRefWarpedPaths` / `rigLineWarpedPaths` / `rigLineWarpedRigViewPaths`）。
 */
export function extractRigShoulderAnchorGeometry(warpedPaths: string[]): {
  spineClavicleL: [number, number];
  spineClavicleR: [number, number];
  neckAvg: [number, number];
  outerL: [number, number];
  outerR: [number, number];
} | null {
  if (
    warpedPaths.length <= RIG_LINE_CLAVICLE_R ||
    warpedPaths[RIG_LINE_SPINE] == null ||
    warpedPaths[RIG_LINE_CLAVICLE_L] == null ||
    warpedPaths[RIG_LINE_CLAVICLE_R] == null
  ) {
    return null;
  }
  const sp = getPathPoints(warpedPaths[RIG_LINE_SPINE]!);
  const cL = getPathPoints(warpedPaths[RIG_LINE_CLAVICLE_L]!);
  const cR = getPathPoints(warpedPaths[RIG_LINE_CLAVICLE_R]!);
  if (sp.length < 2 || cL.length < 2 || cR.length < 2) return null;
  const s0 = sp[0]!;
  const s1 = sp[sp.length - 1]!;
  const l0 = cL[0]!;
  const l1 = cL[cL.length - 1]!;
  const r0 = cR[0]!;
  const r1 = cR[cR.length - 1]!;
  const neckL = infiniteLineIntersection(s0, s1, l0, l1);
  const neckR = infiniteLineIntersection(s0, s1, r0, r1);
  if (!neckL || !neckR) return null;
  const neckAvg: [number, number] = [(neckL[0] + neckR[0]) / 2, (neckL[1] + neckR[1]) / 2];
  const dist2 = (a: [number, number], b: [number, number]) => {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
  };
  const outerL: [number, number] = dist2(l0, neckAvg) >= dist2(l1, neckAvg) ? l0 : l1;
  const outerR: [number, number] = dist2(r0, neckAvg) >= dist2(r1, neckAvg) ? r0 : r1;
  return { spineClavicleL: neckL, spineClavicleR: neckR, neckAvg, outerL, outerR };
}

/**
 * 脊髄中点だけ現在体型に合わせる（スケールなし）。服に脊髄スケールを掛けたくないときのフォールバック。
 */
export function computeRigSpineTranslateOnlyFn(
  refWarpedPaths: string[],
  currentWarpedPaths: string[]
): ((x: number, y: number) => [number, number]) | null {
  if (
    refWarpedPaths.length < RIG_LINE_PATH_COUNT ||
    currentWarpedPaths.length < RIG_LINE_PATH_COUNT
  ) {
    return null;
  }
  const refSp = getPathPoints(refWarpedPaths[RIG_LINE_SPINE]!);
  const curSp = getPathPoints(currentWarpedPaths[RIG_LINE_SPINE]!);
  if (refSp.length < 2 || curSp.length < 2) return null;

  const s0r = refSp[0]!;
  const s1r = refSp[refSp.length - 1]!;
  const s0c = curSp[0]!;
  const s1c = curSp[curSp.length - 1]!;

  const crx = (s0r[0] + s1r[0]) / 2;
  const cry = (s0r[1] + s1r[1]) / 2;
  const ccx = (s0c[0] + s1c[0]) / 2;
  const ccy = (s0c[1] + s1c[1]) / 2;

  return (x: number, y: number): [number, number] => [x - crx + ccx, y - cry + ccy];
}

/** 首元（中心軸×鎖骨の交点平均）で ref→現在の平行移動のみ（服の拡大なし）。 */
export function computeRigNeckAnchorTranslateOnlyFn(
  refWarpedPaths: string[],
  currentWarpedPaths: string[]
): ((x: number, y: number) => [number, number]) | null {
  const refG = extractRigShoulderAnchorGeometry(refWarpedPaths);
  const curG = extractRigShoulderAnchorGeometry(currentWarpedPaths);
  if (!refG || !curG) return null;
  const dx = curG.neckAvg[0] - refG.neckAvg[0];
  const dy = curG.neckAvg[1] - refG.neckAvg[1];
  return (x: number, y: number): [number, number] => [x + dx, y + dy];
}

/**
 * ref ワープ後の肩線分 p0→p1 を、モデル側 q0→q1 の向き・中点に合わせる剛体変換（回転＋移動のみ、スケールなし）。
 * 左右肩の距離が ref と現体型で違っても服の大きさは変えず、肩線の角度と位置だけ追従する。
 */
export function rigidMapFromShoulderSegmentPair(
  p0: [number, number],
  p1: [number, number],
  q0: [number, number],
  q1: [number, number]
): ((pr: [number, number]) => [number, number]) | null {
  const [p0x, p0y] = p0;
  const [p1x, p1y] = p1;
  const [q0x, q0y] = q0;
  const [q1x, q1y] = q1;
  const vx = p1x - p0x;
  const vy = p1y - p0y;
  const lenV = Math.hypot(vx, vy);
  if (lenV < 1e-6) return null;
  const wx = q1x - q0x;
  const wy = q1y - q0y;
  if (Math.hypot(wx, wy) < 1e-6) return null;

  const cpx = (p0x + p1x) / 2;
  const cpy = (p0y + p1y) / 2;
  const cqx = (q0x + q1x) / 2;
  const cqy = (q0y + q1y) / 2;

  const theta = Math.atan2(wy, wx) - Math.atan2(vy, vx);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  return (pr: [number, number]): [number, number] => {
    const dx = pr[0] - cpx;
    const dy = pr[1] - cpy;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return [cqx + rx, cqy + ry];
  };
}

/**
 * 基準体型でワープしたリグを、脊髄の中点一致＋脊髄長さ比のスケールで現在体型座標に重ねる。
 * 頭〜首付近だけスケール率を抑え、胴以降はフルスケール（肩〜腕の内角はほぼ維持）。
 */
export function alignRigRefPathsToCurrentSpine(
  refWarpedPaths: string[],
  currentWarpedPaths: string[]
): string[] {
  const alignFn = computeRigSpineAlignFn(refWarpedPaths, currentWarpedPaths);
  if (!alignFn) return refWarpedPaths;
  return refWarpedPaths.map((d) => tPath(d, alignFn));
}

function rigInteriorAngleAtPivotDeg(
  pivot: [number, number],
  endA: [number, number],
  endB: [number, number]
): number {
  const vax = endA[0] - pivot[0];
  const vay = endA[1] - pivot[1];
  const vbx = endB[0] - pivot[0];
  const vby = endB[1] - pivot[1];
  const la = Math.hypot(vax, vay);
  const lb = Math.hypot(vbx, vby);
  if (la < 1e-9 || lb < 1e-9) return NaN;
  const c = Math.max(-1, Math.min(1, (vax * vbx + vay * vby) / (la * lb)));
  return (Math.acos(c) * 180) / Math.PI;
}

function rigUnit(dx: number, dy: number): [number, number] | null {
  const l = Math.hypot(dx, dy);
  if (l < 1e-9) return null;
  return [dx / l, dy / l];
}

function rigInteriorAngleUnitDirsDeg(
  uax: number,
  uay: number,
  ubx: number,
  uby: number
): number {
  const c = Math.max(-1, Math.min(1, uax * ubx + uay * uby));
  return (Math.acos(c) * 180) / Math.PI;
}

export function rigSegmentAxisDeg(p0: [number, number], p1: [number, number]): number {
  return (Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180) / Math.PI;
}

/**
 * `rigLineWarpedPaths` / `rigLineWarpedRigViewPaths` は `loadBPATHS_RIG_LINES` の順と一致。
 * 左右肩 pivot は path 1=5・2=6 で共有。成す角は鎖骨(5/6)と腕方向長線(1/2)。
 */
export function buildRigRedLineArmDiagram(warpedRigPaths: string[]): RigRedLineArmDiagram | null {
  if (warpedRigPaths.length < RIG_LINE_PATH_COUNT) return null;
  const spinePts = getPathPoints(warpedRigPaths[RIG_LINE_SPINE]!);
  const armL = getPathPoints(warpedRigPaths[RIG_LINE_ARM_L]!);
  const armR = getPathPoints(warpedRigPaths[RIG_LINE_ARM_R]!);
  const clL = getPathPoints(warpedRigPaths[RIG_LINE_CLAVICLE_L]!);
  const clR = getPathPoints(warpedRigPaths[RIG_LINE_CLAVICLE_R]!);
  if (
    spinePts.length < 2 ||
    armL.length < 2 ||
    armR.length < 2 ||
    clL.length < 2 ||
    clR.length < 2
  )
    return null;

  const shoulderL: [number, number] = [clL[0]![0], clL[0]![1]];
  const wristL: [number, number] = [armL[armL.length - 1]![0], armL[armL.length - 1]![1]];
  const shoulderR: [number, number] = [clR[0]![0], clR[0]![1]];
  const wristR: [number, number] = [armR[armR.length - 1]![0], armR[armR.length - 1]![1]];
  const clavicleEndL: [number, number] = [clL[clL.length - 1]![0], clL[clL.length - 1]![1]];
  const clavicleEndR: [number, number] = [clR[clR.length - 1]![0], clR[clR.length - 1]![1]];

  const s0 = spinePts[0]!;
  const s1 = spinePts[spinePts.length - 1]!;
  const spineDown = rigUnit(s1[0] - s0[0], s1[1] - s0[1]);
  if (spineDown == null) return null;
  const [sux, suy] = spineDown;

  const neckCenter: [number, number] = [
    (clavicleEndL[0] + clavicleEndR[0]) / 2,
    (clavicleEndL[1] + clavicleEndR[1]) / 2,
  ];
  const toShoulderL = rigUnit(shoulderL[0] - neckCenter[0], shoulderL[1] - neckCenter[1]);
  const toShoulderR = rigUnit(shoulderR[0] - neckCenter[0], shoulderR[1] - neckCenter[1]);
  const interiorSpineShoulderDegL =
    toShoulderL != null ? rigInteriorAngleUnitDirsDeg(sux, suy, toShoulderL[0], toShoulderL[1]) : NaN;
  const interiorSpineShoulderDegR =
    toShoulderR != null ? rigInteriorAngleUnitDirsDeg(sux, suy, toShoulderR[0], toShoulderR[1]) : NaN;

  return {
    shoulderL,
    wristL,
    shoulderR,
    wristR,
    clavicleEndL,
    clavicleEndR,
    neckCenter,
    spineDownUnit: spineDown,
    interiorSpineShoulderDegL,
    interiorSpineShoulderDegR,
    interiorClavicleArmDegL: rigInteriorAngleAtPivotDeg(shoulderL, clavicleEndL, wristL),
    interiorClavicleArmDegR: rigInteriorAngleAtPivotDeg(shoulderR, clavicleEndR, wristR),
    warpedClavicleAxisDegL: rigSegmentAxisDeg(shoulderL, clavicleEndL),
    warpedClavicleAxisDegR: rigSegmentAxisDeg(shoulderR, clavicleEndR),
    warpedArmAxisDegL: rigSegmentAxisDeg(shoulderL, wristL),
    warpedArmAxisDegR: rigSegmentAxisDeg(shoulderR, wristR),
  };
}
