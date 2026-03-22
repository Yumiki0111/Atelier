"use client";

import type {
  GarmentType,
  ShirtSize,
  JacketSize,
  CustomGarmentData,
  ShoulderDebug,
  MeasureOverlayData,
  ScalableGarmentSpec,
  GenericVertexPlotHighlight,
  BodyZones,
} from "./types";
import {
  warp,
  warpArmOutline,
  getInterpolatedArmOutline,
  bodyHeight,
  getZonesAnchored,
  getBodyParams,
  getDeltaThetas,
  getSkinnedVertex,
} from "./bodyUtils";
import { tPath, interpolatePath, getPathPoints } from "./pathUtils";
import { buildShirtPath } from "./shirtUtils";
import { buildJacketPath } from "./jacketUtils";
import { buildCustomTransformedPathsWithVertexPlots } from "./customGarmentUtils";
import { buildTopPlacement } from "./garmentBase";
import { BPATHS_MODEL, SHIRT_LEFT, SHIRT_RIGHT } from "./pathData";
import { shirtLandmarks } from "./shirtConfig";
import {
  SIZES,
  JACKET_SIZES,
  BZ,
  BODY_CX,
  BODY_ARM_OUTLINE_L,
  BODY_ARM_PEAK_INDEX,
  SH,
  JK,
  REF_HEIGHT_CM,
  REF_WEIGHT_KG,
} from "./constants";
import { buildRigSkinSegments, deformBodyPointToRig } from "./rigSkin2D";
import { inferLandmarksFromRigPaths } from "./customLandmarkResolve";
import { getScalableSpec } from "./customGarmentUtils";
import { resolveGenericScalableSpec } from "./generic";
import { scaleModelViewToBodyTemplate } from "./modelRigData";
import {
  shoulderContourFromPath,
  outerCollarPoints,
  onePointOnGarmentOutline,
  shoulderPointOnLine,
  getShoulderSeamYForData,
  indexOfClosest,
  getAllPathPoints,
  JACKET_SHOULDER_INDEX,
} from "./fittingContourUtils";

export interface UseFittingCanvasDataParams {
  height: number;
  weight: number;
  garment: GarmentType;
  shirtSize: ShirtSize;
  jacketSize: JacketSize;
  customGarmentData: CustomGarmentData | null;
  animProgress: number;
  fromSize: ShirtSize | null;
  toSize: ShirtSize | null;
  fromCustomGarmentData?: CustomGarmentData | null;
  toCustomGarmentData?: CustomGarmentData | null;
  rigBodyEnabled?: boolean;
  /**
   * 汎用フィットの下書き区間（パスカタログ）。`genericSymmetricTop` に未反映でも採寸オーバーレイ・赤/紫線を同期させる。
   */
  genericVertexPlotHighlight?: GenericVertexPlotHighlight | null;
}

export type FittingCanvasRigLandmarksDebug = {
  inferredFromRig: boolean;
  rigShoulderY: number | null;
  rigHemY: number | null;
  usedShoulderY: number | null;
  usedHemY: number | null;
  /** モデルリグロック時に `buildTopPlacement` をリグ推定肩・裾に合わせたか */
  useRigLandmarksForPlacement: boolean;
  genericApplied: boolean | null;
};

/** リグ肩〜袖先の角度デバッグ（`sessionStorage DEBUG_RIG_ARM=1` でキャンバス表示） */
export type FittingCanvasRigArmAngleDebug = {
  heightCm: number;
  weightKg: number;
  /** ワープ後アウトライン 肩→袖先 の方位角（°）。atan2(Δy,Δx)、+Y 下向き */
  warpedArmAxisDegL: number;
  warpedArmAxisDegR: number;
  /** 170/60・同じ定義 */
  refWarpedArmAxisDegL: number;
  refWarpedArmAxisDegR: number;
  deltaVsRefDegL: number;
  deltaVsRefDegR: number;
  /** 肩で「中心縦（下向き）」と「肩→袖先」のなす角（°）。リグはこの角を基準体型で固定 */
  interiorShoulderVerticalDegL: number;
  interiorShoulderVerticalDegR: number;
  refInteriorVerticalDegL: number;
  refInteriorVerticalDegR: number;
  /** 身長補間アウトラインのみ（ワープ前）肩→袖先の方位角（°） */
  rawArmAxisDegL: number;
  rawArmAxisDegR: number;
  /** `getDeltaThetas`（胴スキニング用）を度にしたもの */
  skinningDeltaThetaDegL: number;
  skinningDeltaThetaDegR: number;
  /**
   * 袖付け根: 肩から見た「体の外側水平」（左=-X, 右=+X）と上腕（肩→袖先）のなす角（°）
   */
  sleeveRootHorizontalDegL: number;
  sleeveRootHorizontalDegR: number;
  warpedShoulderL: [number, number];
  warpedWristL: [number, number];
  warpedShoulderR: [number, number];
  warpedWristR: [number, number];
};

/** モデル+rig.svg の赤リグ（肩図は path 1/2＝腕方向・5/6＝鎖骨。3/4 は脚）を warp した端点と角度 */
export type RigRedLineArmDiagram = {
  shoulderL: [number, number];
  wristL: [number, number];
  shoulderR: [number, number];
  wristR: [number, number];
  clavicleEndL: [number, number];
  clavicleEndR: [number, number];
  /** 左右鎖骨が胸元で合流する付近（path5/6 終点の中点）。首元で軸↔肩線の角を取る */
  neckCenter: [number, number];
  /** path0 中心軸の単位方向（首→足） */
  spineDownUnit: [number, number];
  /** 首元で中心軸（下向き）と「首元→肩リグ」のなす内角（°） */
  interiorSpineShoulderDegL: number;
  interiorSpineShoulderDegR: number;
  /** 肩頂点で鎖骨線と上腕線のなす内角（°） */
  interiorClavicleArmDegL: number;
  interiorClavicleArmDegR: number;
  warpedClavicleAxisDegL: number;
  warpedClavicleAxisDegR: number;
  warpedArmAxisDegL: number;
  warpedArmAxisDegR: number;
};

/** `MODEL_RIG_LINE_PATH_DS` と同じ index（modelRigData コメントと一致） */
const RIG_LINE_SPINE = 0;
const RIG_LINE_ARM_L = 1;
const RIG_LINE_ARM_R = 2;
const RIG_LINE_CLAVICLE_L = 5;
const RIG_LINE_CLAVICLE_R = 6;
/** 0..6 を参照するので 7 本 */
const RIG_LINE_PATH_COUNT = 7;

/** 身長が高いほど上腕リグ(path 1/2)を肩支点で鉛直寄りに回す（°/cm）。体輪郭は rig スキンで追従。 */
const RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM = 0.10;

/** 脊髄頭側〜この割合までは全体スケールの掛かりを弱める（+Y 下で yTop が頭寄り） */
const RIG_ALIGN_HEAD_SPINE_FRACTION = 0.28;
/** 頭頂付近で (scale-1) に掛ける係数（胴〜足側は 1 に近づく） */
const RIG_ALIGN_HEAD_SCALE_BLEND_MIN = 0.38;
/** 服リグあり: 全リグ点の bbox 上端合わせだと服がわずかに下に見えるため、テンプレ空間で上へ寄せる量（px）。+Y は下向きなので rigAlign の dy から減算 */
/** カスタム服: テンプレ空間でモデルリグと服リグを平行移動だけ合わせる（スケールはしない。追従は後段の rigTemplateToRigView） */
type CustomRigAlign = { enabled: false } | { enabled: true; dx: number; dy: number };

function applyCustomRigAlignInPlace(x: number, y: number, a: CustomRigAlign): [number, number] {
  if (!a.enabled) return [x, y];
  return [x + a.dx, y + a.dy];
}

function rotatePointAboutPivotPx(
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
function applyRigArmAngleTiltToWarpedRigPaths(
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
function computeRigSpineAlignFn(
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
function extractRigShoulderAnchorGeometry(warpedPaths: string[]): {
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
function computeRigSpineTranslateOnlyFn(
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
function computeRigNeckAnchorTranslateOnlyFn(
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
function rigidMapFromShoulderSegmentPair(
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
function alignRigRefPathsToCurrentSpine(
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

export interface FittingCanvasSnapshot {
  bodyPaths: string[];
  /** 現在体型ワープ（リグスキニング・服リグ合わせ等の計算用） */
  rigLineWarpedPaths: string[];
  /**
   * 基準リグ（170/60 ワープ）を脊髄で現在体型に配置したパス（頭付近はスケールを弱め、胴〜腕は脊髄長に追従）。
   * 赤リグ表示・肩角度デバッグ図・肌輪郭のリグ追従はこちらを共有。
   */
  rigLineWarpedRigViewPaths: string[];
  /** `rigLineWarpedRigViewPaths` から取った肩・首元の角度図。未ロード時は null */
  rigRedLineArmDiagram: RigRedLineArmDiagram | null;
  viewBoxHeight: number;
  shirtPathD: string | null;
  jacketFill: string | null;
  jacketDetail: string | null;
  customPathDs: string[];
  customRigPathDs: string[];
  shoulderDebug: ShoulderDebug | null;
  bodyPlotPoints: { label: string; point: [number, number] }[];
  bodyOutlinePoints: [number, number][];
  measureOverlay: MeasureOverlayData;
  rigLandmarksDebug?: FittingCanvasRigLandmarksDebug;
  rigArmAngleDebug: FittingCanvasRigArmAngleDebug;
  /**
   * モデルのプロット ON 時: リグの「中心軸×鎖骨」「首平均」。
   * - bodyFollow: 休止リグ上の交点を `bodyFollowFn`（体輪郭と同じリグスキン）へ → 身長・体重で体と一致。
   * - warp / rigView: 各ワープ後パス上の幾何（現体型・赤表示用）。赤線との位置合わせ確認用。
   */
  rigIntersectionPlotPoints: {
    label: string;
    point: [number, number];
    plotKind: "bodyFollow" | "warp" | "rigView";
  }[];
}

function scalableSpecForCustomGarment(data: CustomGarmentData): ScalableGarmentSpec | null {
  if (data.presetId === "genericSymmetricTop") {
    return resolveGenericScalableSpec(data);
  }
  return getScalableSpec(data.pathDs, data.presetId);
}

function smoothStep(t: number): number {
  const s = Math.max(0, Math.min(1, t));
  return s * s * (3 - 2 * s);
}

function rigSegmentAxisDeg(p0: [number, number], p1: [number, number]): number {
  return (Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180) / Math.PI;
}

/** 肩で「中心縦（+Y 下向き）」と「肩→袖先」のなす角（°） */
function rigInteriorShoulderVerticalDeg(shoulder: [number, number], wrist: [number, number]): number {
  const [sx, sy] = shoulder;
  const [wx, wy] = wrist;
  const ax = wx - sx;
  const ay = wy - sy;
  const la = Math.hypot(ax, ay);
  if (la < 1e-9) return NaN;
  const c = Math.max(-1, Math.min(1, ay / la));
  return (Math.acos(c) * 180) / Math.PI;
}

/** 袖付け根: 外側水平単位ベクトル（左肩は -X）と上腕方向の内角（°） */
function rigSleeveRootHorizontalDeg(
  shoulder: [number, number],
  wrist: [number, number],
  isLeft: boolean
): number {
  const [sx, sy] = shoulder;
  const [wx, wy] = wrist;
  const ax = wx - sx;
  const ay = wy - sy;
  const la = Math.hypot(ax, ay);
  if (la < 1e-9) return NaN;
  const ux = ax / la;
  const uy = ay / la;
  const rx = isLeft ? -1 : 1;
  const ry = 0;
  const c = Math.max(-1, Math.min(1, ux * rx + uy * ry));
  return (Math.acos(c) * 180) / Math.PI;
}

function buildRigArmAngleDebug(params: {
  height: number;
  weight: number;
  leftArmOutline: [number, number][];
  rightArmOutline: [number, number][];
  leftArmWarped: [number, number][];
  rightArmWarped: [number, number][];
}): FittingCanvasRigArmAngleDebug {
  const { height, weight, leftArmOutline, rightArmOutline, leftArmWarped, rightArmWarped } = params;
  const shL = leftArmWarped[0]!;
  const shR = rightArmWarped[0]!;
  const wrL = leftArmWarped[leftArmWarped.length - 1]!;
  const wrR = rightArmWarped[rightArmWarped.length - 1]!;
  const raw0L = leftArmOutline[0]!;
  const raw0R = rightArmOutline[0]!;
  const rawWL = leftArmOutline[leftArmOutline.length - 1]!;
  const rawWR = rightArmOutline[rightArmOutline.length - 1]!;

  const { yScale: rys, xScale: rxs } = getBodyParams(REF_HEIGHT_CM, REF_WEIGHT_KG);
  const rz = getZonesAnchored(rys);
  const { left: lRefO, right: rRefO } = getInterpolatedArmOutline(REF_HEIGHT_CM);
  const refLW = warpArmOutline(lRefO, true, rys, rxs, rz, REF_HEIGHT_CM);
  const refRW = warpArmOutline(rRefO, false, rys, rxs, rz, REF_HEIGHT_CM);
  const refShL = refLW[0]!;
  const refShR = refRW[0]!;
  const refWrL = refLW[refLW.length - 1]!;
  const refWrR = refRW[refRW.length - 1]!;

  const warpedArmAxisDegL = rigSegmentAxisDeg(shL, wrL);
  const warpedArmAxisDegR = rigSegmentAxisDeg(shR, wrR);
  const refWarpedArmAxisDegL = rigSegmentAxisDeg(refShL, refWrL);
  const refWarpedArmAxisDegR = rigSegmentAxisDeg(refShR, refWrR);
  const dt = getDeltaThetas(height, weight);
  const radToDeg = 180 / Math.PI;

  return {
    heightCm: height,
    weightKg: weight,
    warpedArmAxisDegL,
    warpedArmAxisDegR,
    refWarpedArmAxisDegL,
    refWarpedArmAxisDegR,
    deltaVsRefDegL: warpedArmAxisDegL - refWarpedArmAxisDegL,
    deltaVsRefDegR: warpedArmAxisDegR - refWarpedArmAxisDegR,
    interiorShoulderVerticalDegL: rigInteriorShoulderVerticalDeg(shL, wrL),
    interiorShoulderVerticalDegR: rigInteriorShoulderVerticalDeg(shR, wrR),
    refInteriorVerticalDegL: rigInteriorShoulderVerticalDeg(refShL, refWrL),
    refInteriorVerticalDegR: rigInteriorShoulderVerticalDeg(refShR, refWrR),
    rawArmAxisDegL: rigSegmentAxisDeg(raw0L, rawWL),
    rawArmAxisDegR: rigSegmentAxisDeg(raw0R, rawWR),
    skinningDeltaThetaDegL: dt.left * radToDeg,
    skinningDeltaThetaDegR: dt.right * radToDeg,
    sleeveRootHorizontalDegL: rigSleeveRootHorizontalDeg(shL, wrL, true),
    sleeveRootHorizontalDegR: rigSleeveRootHorizontalDeg(shR, wrR, false),
    warpedShoulderL: shL,
    warpedWristL: wrL,
    warpedShoulderR: shR,
    warpedWristR: wrR,
  };
}

/** キャンバスと同じ定義のリグ角度（身長・体重のみ依存）。左パネル表示用。 */
export function computeRigArmAngleDebug(heightCm: number, weightKg: number): FittingCanvasRigArmAngleDebug {
  const { yScale, xScale } = getBodyParams(heightCm, weightKg);
  const zones = getZonesAnchored(yScale);
  const { left: leftArmOutline, right: rightArmOutline } = getInterpolatedArmOutline(heightCm);
  const leftArmWarped = warpArmOutline(leftArmOutline, true, yScale, xScale, zones, heightCm);
  const rightArmWarped = warpArmOutline(rightArmOutline, false, yScale, xScale, zones, heightCm);
  return buildRigArmAngleDebug({
    height: heightCm,
    weight: weightKg,
    leftArmOutline,
    rightArmOutline,
    leftArmWarped,
    rightArmWarped,
  });
}

export function computeFittingCanvasSnapshot(
  {
    height,
    weight,
    garment,
    shirtSize,
    customGarmentData,
    jacketSize = "4",
    animProgress,
    fromSize,
    toSize,
    fromCustomGarmentData = null,
    toCustomGarmentData = null,
    rigBodyEnabled = false,
    genericVertexPlotHighlight = null,
    rigLinePaths,
  }: UseFittingCanvasDataParams & { rigLinePaths: string[] | null }
): FittingCanvasSnapshot {
const { yScale, xScale } = getBodyParams(height, weight, rigLinePaths);
const zones = getZonesAnchored(yScale);
const { left: leftArmOutline, right: rightArmOutline } = getInterpolatedArmOutline(height);
const leftArmWarped = warpArmOutline(leftArmOutline, true, yScale, xScale, zones, height);
const rightArmWarped = warpArmOutline(rightArmOutline, false, yScale, xScale, zones, height);
const leftShoulder = leftArmWarped[0];
const rightShoulder = rightArmWarped[0];
const deltaThetas = getDeltaThetas(height, weight);
const SKIN_MAX_DIST = 150;
const warpOptsBody = { heightCm: height } as const;
const warpFn = (x: number, y: number): [number, number] => {
  const w = warp(x, y, yScale, xScale, zones, warpOptsBody);
  const dL = Math.hypot(w[0] - leftShoulder[0], w[1] - leftShoulder[1]);
  const dR = Math.hypot(w[0] - rightShoulder[0], w[1] - rightShoulder[1]);
  if (dL <= dR && dL < SKIN_MAX_DIST)
    return getSkinnedVertex(w, leftShoulder, deltaThetas.left, SKIN_MAX_DIST);
  if (dR < SKIN_MAX_DIST)
    return getSkinnedVertex(w, rightShoulder, deltaThetas.right, SKIN_MAX_DIST);
  return w;
};

/** 計算用の現在ワープリグは `rigLineWarpedPaths`。体輪郭は `rigLineWarpedRigViewPaths` 基準でリグ追従（未ロード時は `warpFn`）。 */
const warpRigLine = (x: number, y: number): [number, number] =>
  warp(x, y, yScale, xScale, zones, warpOptsBody);

// 身長 yScale は脊髄スパン連動済み。表示リグ（基準リグ＋脊髄合わせ・頭はスケール弱）と体輪郭追従を同じワープ後パスに揃える。
const rigLineWarpedPaths = rigLinePaths ? rigLinePaths.map((d) => tPath(d, warpRigLine)) : [];
// 基準身長 170 のまま、横幅だけ現在体重に合わせる。脊髄合わせで身長差を解消（体・画面上のモデル赤リグ用）。
const { yScale: refRigYs, xScale: refRigXs } = getBodyParams(
  REF_HEIGHT_CM,
  weight,
  rigLinePaths
);
const refRigZones = getZonesAnchored(refRigYs);
const warpOptsRefBody = { heightCm: REF_HEIGHT_CM } as const;
const warpRigLineRefBody = (x: number, y: number): [number, number] =>
  warp(x, y, refRigYs, refRigXs, refRigZones, warpOptsRefBody);
const rigRefWarpedPaths = rigLinePaths
  ? rigLinePaths.map((d) => tPath(d, warpRigLineRefBody))
  : [];
const rigSpineAlignFn =
  rigRefWarpedPaths.length > 0 && rigLineWarpedPaths.length > 0
    ? computeRigSpineAlignFn(rigRefWarpedPaths, rigLineWarpedPaths)
    : null;
const rigSpineTranslateOnlyFn =
  rigRefWarpedPaths.length >= RIG_LINE_PATH_COUNT &&
  rigLineWarpedPaths.length >= RIG_LINE_PATH_COUNT
    ? computeRigSpineTranslateOnlyFn(rigRefWarpedPaths, rigLineWarpedPaths)
    : null;
const rigNeckAnchorTranslateOnlyFn =
  rigRefWarpedPaths.length > RIG_LINE_CLAVICLE_R &&
  rigLineWarpedPaths.length > RIG_LINE_CLAVICLE_R
    ? computeRigNeckAnchorTranslateOnlyFn(rigRefWarpedPaths, rigLineWarpedPaths)
    : null;

/** 服 SVG・服に載せる赤リグ: 横 xScale を体重で変えない（身長＋リグ y のみ体に追う） */
const { yScale: ysGarment, xScale: xsGarment } = getBodyParams(height, REF_WEIGHT_KG, rigLinePaths);
const zonesGarment = getZonesAnchored(ysGarment);
const warpRigLineGarment = (x: number, y: number): [number, number] =>
  warp(x, y, ysGarment, xsGarment, zonesGarment, warpOptsBody);
const rigLineWarpedPathsGarment = rigLinePaths ? rigLinePaths.map((d) => tPath(d, warpRigLineGarment)) : [];
const { yScale: refRigYsG, xScale: refRigXsG } = getBodyParams(
  REF_HEIGHT_CM,
  REF_WEIGHT_KG,
  rigLinePaths
);
const refRigZonesG = getZonesAnchored(refRigYsG);
const warpRigLineRefBodyGarment = (x: number, y: number): [number, number] =>
  warp(x, y, refRigYsG, refRigXsG, refRigZonesG, warpOptsRefBody);
const rigRefWarpedPathsGarment = rigLinePaths
  ? rigLinePaths.map((d) => tPath(d, warpRigLineRefBodyGarment))
  : [];
const rigSpineAlignFnGarment =
  rigRefWarpedPathsGarment.length > 0 && rigLineWarpedPathsGarment.length > 0
    ? computeRigSpineAlignFn(rigRefWarpedPathsGarment, rigLineWarpedPathsGarment)
    : null;
const rigSpineTranslateOnlyFnGarment =
  rigRefWarpedPathsGarment.length >= RIG_LINE_PATH_COUNT &&
  rigLineWarpedPathsGarment.length >= RIG_LINE_PATH_COUNT
    ? computeRigSpineTranslateOnlyFn(rigRefWarpedPathsGarment, rigLineWarpedPathsGarment)
    : null;
const rigNeckAnchorTranslateOnlyFnGarment =
  rigRefWarpedPathsGarment.length > RIG_LINE_CLAVICLE_R &&
  rigLineWarpedPathsGarment.length > RIG_LINE_CLAVICLE_R
    ? computeRigNeckAnchorTranslateOnlyFn(rigRefWarpedPathsGarment, rigLineWarpedPathsGarment)
    : null;
const rigLineWarpedRigViewPathsBaseGarment =
  rigRefWarpedPathsGarment.length > 0 && rigLineWarpedPathsGarment.length > 0
    ? alignRigRefPathsToCurrentSpine(rigRefWarpedPathsGarment, rigLineWarpedPathsGarment)
    : rigRefWarpedPathsGarment;
const rigAlignTemplateToRigViewGarment = (x: number, y: number): [number, number] => {
  const refW = warpRigLineRefBodyGarment(x, y);
  return rigSpineAlignFnGarment ? rigSpineAlignFnGarment(refW[0], refW[1]) : refW;
};

/**
 * テンプレート座標を、画面上のモデル赤リグ（`rigLineWarpedRigViewPaths`）と同じパイプラインへ写す。
 * 服リグは `bodyFollowFn`（肌用ブレンド）だと赤線とずれるためこちらを使う。
 */
const rigLineWarpedRigViewPathsBase =
  rigRefWarpedPaths.length > 0 && rigLineWarpedPaths.length > 0
    ? alignRigRefPathsToCurrentSpine(rigRefWarpedPaths, rigLineWarpedPaths)
    : rigRefWarpedPaths;

const rigAlignTemplateToRigView = (x: number, y: number): [number, number] => {
  const refW = warpRigLineRefBody(x, y);
  return rigSpineAlignFn ? rigSpineAlignFn(refW[0], refW[1]) : refW;
};

const rigArmTiltTwistL = (-(height - REF_HEIGHT_CM) * (RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM * Math.PI)) / 180;
const rigArmTiltTwistR = ((height - REF_HEIGHT_CM) * (RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM * Math.PI)) / 180;
const rigArmPivotL: [number, number] | null =
  rigLineWarpedRigViewPathsBase.length > RIG_LINE_ARM_L
    ? (getPathPoints(rigLineWarpedRigViewPathsBase[RIG_LINE_ARM_L]!)[0] ?? null)
    : null;
const rigArmPivotR: [number, number] | null =
  rigLineWarpedRigViewPathsBase.length > RIG_LINE_ARM_R
    ? (getPathPoints(rigLineWarpedRigViewPathsBase[RIG_LINE_ARM_R]!)[0] ?? null)
    : null;

const rigTemplateToRigViewForPath =
  (pathIdx: number) =>
  (x: number, y: number): [number, number] => {
    const aligned = rigAlignTemplateToRigView(x, y);
    if (pathIdx === RIG_LINE_ARM_L && rigArmPivotL) {
      return rotatePointAboutPivotPx(
        aligned[0],
        aligned[1],
        rigArmPivotL[0],
        rigArmPivotL[1],
        rigArmTiltTwistL
      );
    }
    if (pathIdx === RIG_LINE_ARM_R && rigArmPivotR) {
      return rotatePointAboutPivotPx(
        aligned[0],
        aligned[1],
        rigArmPivotR[0],
        rigArmPivotR[1],
        rigArmTiltTwistR
      );
    }
    return aligned;
  };

const rigArmPivotLGarment: [number, number] | null =
  rigLineWarpedRigViewPathsBaseGarment.length > RIG_LINE_ARM_L
    ? (getPathPoints(rigLineWarpedRigViewPathsBaseGarment[RIG_LINE_ARM_L]!)[0] ?? null)
    : null;
const rigArmPivotRGarment: [number, number] | null =
  rigLineWarpedRigViewPathsBaseGarment.length > RIG_LINE_ARM_R
    ? (getPathPoints(rigLineWarpedRigViewPathsBaseGarment[RIG_LINE_ARM_R]!)[0] ?? null)
    : null;

/** カスタム服の赤リグ線のみ（体のモデル赤リグは `rigTemplateToRigViewForPath`） */
const rigTemplateToRigViewForGarmentPath =
  (pathIdx: number) =>
  (x: number, y: number): [number, number] => {
    const aligned = rigAlignTemplateToRigViewGarment(x, y);
    if (pathIdx === RIG_LINE_ARM_L && rigArmPivotLGarment) {
      return rotatePointAboutPivotPx(
        aligned[0],
        aligned[1],
        rigArmPivotLGarment[0],
        rigArmPivotLGarment[1],
        rigArmTiltTwistL
      );
    }
    if (pathIdx === RIG_LINE_ARM_R && rigArmPivotRGarment) {
      return rotatePointAboutPivotPx(
        aligned[0],
        aligned[1],
        rigArmPivotRGarment[0],
        rigArmPivotRGarment[1],
        rigArmTiltTwistR
      );
    }
    return aligned;
  };

const rigLineWarpedRigViewPaths =
  rigLineWarpedRigViewPathsBase.length > RIG_LINE_CLAVICLE_R
    ? applyRigArmAngleTiltToWarpedRigPaths(
        rigLineWarpedRigViewPathsBase,
        height,
        RIG_LINE_ARM_L,
        RIG_LINE_ARM_R
      )
    : rigLineWarpedRigViewPathsBase;

const rigSkinWarpedForBody =
  rigLinePaths != null && rigLineWarpedRigViewPaths.length === rigLinePaths.length
    ? rigLineWarpedRigViewPaths
    : rigLineWarpedPaths;
const rigSkinSegments =
  rigLinePaths && rigSkinWarpedForBody.length === rigLinePaths.length
    ? buildRigSkinSegments(rigLinePaths, rigSkinWarpedForBody)
    : null;
const warpPlain = (x: number, y: number): [number, number] =>
  warp(x, y, yScale, xScale, zones, warpOptsBody);

const armPeakIdxL = Math.min(BODY_ARM_PEAK_INDEX, Math.max(0, leftArmOutline.length - 1));
const armPeakIdxR = Math.min(BODY_ARM_PEAK_INDEX, Math.max(0, rightArmOutline.length - 1));

const bodyFollowFn = (x: number, y: number): [number, number] => {
  if (rigSkinSegments == null) return warpFn(x, y);
  return deformBodyPointToRig(x, y, rigSkinSegments, warpPlain);
};

/** 腕山: 体輪郭と同じ `bodyFollowFn`（`warpArmOutline` だけだとリグスキン後のシルエットとズレる） */
const armPeakLeft = bodyFollowFn(leftArmOutline[armPeakIdxL]![0], leftArmOutline[armPeakIdxL]![1]);
const armPeakRight = bodyFollowFn(rightArmOutline[armPeakIdxR]![0], rightArmOutline[armPeakIdxR]![1]);

const bodyPaths = BPATHS_MODEL.map((d) => tPath(d, bodyFollowFn));
const rigRedLineArmDiagram =
  rigLineWarpedRigViewPaths.length >= RIG_LINE_PATH_COUNT
    ? buildRigRedLineArmDiagram(rigLineWarpedRigViewPaths)
    : rigLineWarpedPaths.length >= RIG_LINE_PATH_COUNT
      ? buildRigRedLineArmDiagram(rigLineWarpedPaths)
      : null;
const bodyOutlinePoints = bodyPaths.flatMap((d) => getPathPoints(d));

const bodyShoulderBandYMin = BZ.shoulder - 5;
const bodyShoulderBandYMax = BZ.shoulder + 15;
const bodyRaw = shoulderContourFromPath(
  BPATHS_MODEL,
  bodyShoulderBandYMin,
  bodyShoulderBandYMax
);
const bodyShoulderContour: [number, number][] = (() => {
  if (bodyRaw.length >= 2) {
    const ys = bodyRaw.map((p) => p[1]);
    const yRange = Math.max(...ys) - Math.min(...ys);
    if (yRange < 3) {
      const [lx, ly] = BODY_ARM_OUTLINE_L[0];
      const rx = BODY_CX * 2 - lx;
      return [bodyFollowFn(lx, ly), bodyFollowFn(rx, ly)];
    }
    return bodyRaw.map(([x, y]) => bodyFollowFn(x, y));
  }
  const [lx, ly] = BODY_ARM_OUTLINE_L[0];
  const rx = BODY_CX * 2 - lx;
  return [bodyFollowFn(lx, ly), bodyFollowFn(rx, ly)];
})();

const bodyHeightTop = bodyFollowFn(BODY_CX, BZ.head_top);
const bodyHeightBottom = bodyFollowFn(BODY_CX, BZ.foot);

const rigArmAngleDebug = buildRigArmAngleDebug({
  height,
  weight,
  leftArmOutline,
  rightArmOutline,
  leftArmWarped,
  rightArmWarped,
});
if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("DEBUG_RIG_ARM") === "1") {
  console.log("[DEBUG_RIG_ARM]", rigArmAngleDebug);
}

let shirtPathD: string | null = null;
let jacketFill: string | null = null;
let jacketDetail: string | null = null;
let customPathDs: string[] = [];
let customRigPathDs: string[] = [];
let shoulderDebug: ShoulderDebug | null = null;
let garmentOverlay: MeasureOverlayData["garment"] = null;
let rigLandmarksDebug: FittingCanvasRigLandmarksDebug | undefined = undefined;

const bodyPlotPoints: { label: string; point: [number, number] }[] = [
  { label: "腕山L", point: armPeakLeft },
  { label: "腕山R", point: armPeakRight },
  ...(bodyShoulderContour.length >= 2
    ? [
        { label: "肩L", point: bodyShoulderContour[0] },
        { label: "肩R", point: bodyShoulderContour[bodyShoulderContour.length - 1] },
      ]
    : []),
];

/**
 * 体重が服に効かないようにした経路（要約）:
 * - `garmentBase.buildTopPlacement` / `buildCustomTransformedPaths` / 汎用 `runGenericTopFit` の腕ワープ: `getBodyParams(..., REF_WEIGHT_KG)`。
 * - カスタム SVG の赤リグ・ファブリック整列: `warpRigLine*Garment`・`rigSpineAlignFnGarment`・`rigTemplateToRigViewForGarmentPath`（体側は従来どおり `weight` の `warpRigLine`）。
 * - リグ nudge（服リグなし時）のモデル bbox は `rigLineWarpedPathsGarment`（体重で横に広がらないワープ後リグ）。
 * 身長 h を動かすと服プレースの yScale は変わる。体だけ `bodyFollowFn` で太るため重なりはズレうる。
 */
if (garment === "jacket") {
  const { fill, detail, place } = buildJacketPath(jacketSize, height, weight);
  jacketFill = fill;
  jacketDetail = detail;
  const size = JACKET_SIZES[jacketSize] ?? JACKET_SIZES["4"];
  const jacketOutlinePts = getPathPoints(fill);
  const { yScale: yScaleJacketMeasure } = getBodyParams(height, REF_WEIGHT_KG);
  const bodyPxPerCmJacket = bodyHeight(yScaleJacketMeasure) / height;
  const jkSl = place(JK.sh_lx, JK.sh_y);
  const jkSr = place(JK.sh_rx, JK.sh_y);
  const jkHem = place(JK.cx, JK.hem_y);
  const jkSleeveStart = place(JK.sh_lx, JK.sh_y);
  const jkSleeveEnd = place(JK.tip_lx, JK.tip_y);
  const jkShoulderY = (jkSl[1] + jkSr[1]) / 2;
  const jkLenPx = Math.abs(jkHem[1] - jkShoulderY);
  const jkSlvPx = Math.abs(jkSleeveEnd[1] - jkSleeveStart[1]);
  garmentOverlay = {
    shoulderLeft: jkSl,
    shoulderRight: jkSr,
    hemCenter: jkHem,
    size,
    sizeLabel: `ジャケット サイズ ${jacketSize}`,
    chestLeft: place(JK.pit_lx, JK.pit_y),
    chestRight: place(JK.pit_rx, JK.pit_y),
    sleeveStart: jkSleeveStart,
    sleeveEnd: jkSleeveEnd,
    lengthGeomDebug: { px: Math.round(jkLenPx), cm: jkLenPx / bodyPxPerCmJacket },
    sleeveGeomDebug: { px: Math.round(jkSlvPx), cm: jkSlvPx / bodyPxPerCmJacket },
  };
  // ジャケット時も shoulderDebug を渡す（未設定だと肩リグ図が腕アウトライン肩のまま）
  shoulderDebug = {
    bodyShoulderContour,
    garmentShoulderContour: [
      place(JK.sh_lx, JK.sh_y),
      place(JK.sh_rx, JK.sh_y),
    ],
    garmentShoulderPoints: jacketOutlinePts,
    shoulderPointIndex:
      jacketOutlinePts.length > JACKET_SHOULDER_INDEX ? JACKET_SHOULDER_INDEX : null,
    garmentType: "jacket",
  };
} else if (garment === "shirt") {
  const lm = shirtLandmarks;
  const shirtRaw = shoulderContourFromPath(
    [SHIRT_LEFT, SHIRT_RIGHT],
    85,
    115,
    false
  );
  const shirtOuter = outerCollarPoints(shirtRaw, lm.shoulderLx, lm.shoulderRx);
  const shoulderSeamY =
    shirtOuter.length > 0
      ? Math.max(lm.shoulderY, Math.max(...shirtOuter.map((p) => p[1])))
      : lm.shoulderY;
  const shirtLandmarksForPlace = { ...lm, shoulderY: shoulderSeamY };
  const size = SIZES[toSize || shirtSize] ?? SIZES["48"];
  const placement = buildTopPlacement(height, weight, size, shirtLandmarksForPlace);
  if (fromSize && toSize && animProgress < 1) {
    const pathFrom = buildShirtPath(fromSize, height, weight, { shoulderY: shoulderSeamY });
    const pathTo = buildShirtPath(toSize, height, weight, { shoulderY: shoulderSeamY });
    shirtPathD = interpolatePath(
      pathFrom,
      pathTo,
      smoothStep(animProgress)
    );
  } else {
    shirtPathD = buildShirtPath(toSize || shirtSize, height, weight, { shoulderY: shoulderSeamY });
  }
  const shirtContour = [
    placement.place(lm.shoulderLx, shoulderSeamY),
    placement.place(lm.shoulderRx, shoulderSeamY),
  ];
  const shirtAllOutline = getAllPathPoints([SHIRT_LEFT, SHIRT_RIGHT]);
  const shirtPoints =
    fromSize && toSize && animProgress < 1
      ? (() => {
          const placementFrom = buildTopPlacement(
            height,
            weight,
            SIZES[fromSize] ?? size,
            shirtLandmarksForPlace
          );
          const placementTo = buildTopPlacement(
            height,
            weight,
            SIZES[toSize] ?? size,
            shirtLandmarksForPlace
          );
          const t = smoothStep(animProgress);
          return shirtAllOutline.map(([x, y]) => {
            const [x0, y0] = placementFrom.place(x, y);
            const [x1, y1] = placementTo.place(x, y);
            return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t] as [number, number];
          });
        })()
      : shirtAllOutline.map(([x, y]) => placement.place(x, y));
  const shirtCenterX = (lm.shoulderLx + lm.shoulderRx) / 2;
  const shirtShoulderPt =
    shoulderPointOnLine(shirtAllOutline, shoulderSeamY, shirtCenterX) ??
    onePointOnGarmentOutline(
      shirtOuter,
      shirtRaw,
      lm.shoulderLx,
      lm.shoulderRx
    );
  const shirtShoulderIdx = indexOfClosest(shirtAllOutline, shirtShoulderPt);
  shoulderDebug = {
    bodyShoulderContour,
    garmentShoulderContour: shirtContour,
    garmentShoulderPoints: shirtPoints,
    shoulderPointIndex: shirtShoulderIdx,
    garmentType: "shirt",
  };
  const shirtShoulderBandY1 = shoulderSeamY + 28;
  const shirtShoulderBand = shirtAllOutline.filter((p) => p[1] >= shoulderSeamY && p[1] <= shirtShoulderBandY1);
  const shirtVisualLx = shirtShoulderBand.length > 0 ? Math.min(...shirtShoulderBand.map((p) => p[0])) : lm.shoulderLx;
  const shirtVisualRx = shirtShoulderBand.length > 0 ? Math.max(...shirtShoulderBand.map((p) => p[0])) : lm.shoulderRx;
  const shirtLeftHalfAtShoulder = shirtShoulderBand.filter((p) => p[0] < shirtCenterX);
  const shirtSleeveSeamL = shirtLeftHalfAtShoulder.length > 0 ? shirtLeftHalfAtShoulder.reduce((a, b) => (a[0] > b[0] ? a : b)) : [shirtVisualLx, shoulderSeamY] as [number, number];
  const shirtLeftSleeve = shirtAllOutline.filter((p) => p[0] < shirtCenterX && p[1] > shoulderSeamY);
  const shirtSleeveEnd = shirtLeftSleeve.length > 0 ? shirtLeftSleeve.reduce((a, b) => (a[1] > b[1] ? a : b)) : [SH.tip_lx, SH.tip_y] as [number, number];
  const { yScale: yScaleShirtMeasure } = getBodyParams(height, REF_WEIGHT_KG);
  const bodyPxPerCmShirt = bodyHeight(yScaleShirtMeasure) / height;
  const shirtSl = placement.place(shirtVisualLx, shoulderSeamY);
  const shirtSr = placement.place(shirtVisualRx, shoulderSeamY);
  const shirtHem = placement.place(lm.hemCx, lm.hemY);
  const shirtSleeveA = placement.place(shirtSleeveSeamL[0], shirtSleeveSeamL[1]);
  const shirtSleeveB = placement.place(shirtSleeveEnd[0], shirtSleeveEnd[1]);
  const shirtShoulderY = (shirtSl[1] + shirtSr[1]) / 2;
  const shirtLenPx = Math.abs(shirtHem[1] - shirtShoulderY);
  const shirtSlvPx = Math.abs(shirtSleeveB[1] - shirtSleeveA[1]);
  garmentOverlay = {
    shoulderLeft: shirtSl,
    shoulderRight: shirtSr,
    hemCenter: shirtHem,
    size,
    sizeLabel: `シャツ ${shirtSize}`,
    chestLeft: placement.place(SH.bod_lx, SH.bod_y),
    chestRight: placement.place(SH.bod_rx, SH.bod_y),
    sleeveStart: shirtSleeveA,
    sleeveEnd: shirtSleeveB,
    lengthGeomDebug: { px: Math.round(shirtLenPx), cm: shirtLenPx / bodyPxPerCmShirt },
    sleeveGeomDebug: { px: Math.round(shirtSlvPx), cm: shirtSlvPx / bodyPxPerCmShirt },
  };
  shoulderDebug = {
    bodyShoulderContour,
    garmentShoulderContour: shirtContour,
    garmentShoulderPoints: shirtPoints,
    shoulderPointIndex: shirtShoulderIdx,
    garmentType: "shirt",
  };
} else if (garment === "custom" && customGarmentData) {
  const c = customGarmentData.landmarks;
  /** 服 SVG 内のリグ線あり。重ねリグは `rigTemplateToRigView` でモデルと一致。服 path はロック時、肩線剛体合わせ（スケールなし） */
  const hasGarmentRig = (customGarmentData.debugRigPathDs?.length ?? 0) > 0;
  const rigPathCountMatchesModel =
    hasGarmentRig &&
    rigLinePaths != null &&
    (customGarmentData.debugRigPathDs?.length ?? 0) === rigLinePaths.length &&
    rigLinePaths.length > 0;
  const rigGeometryLockedToModel = rigPathCountMatchesModel;
  const rigLm = customGarmentData.debugRigPathDs?.length
    ? inferLandmarksFromRigPaths(customGarmentData.debugRigPathDs)
    : null;
  /** モデルリグロック時は服もリグから推定した肩・裾で place し、SVG 内で一致した幾何を保つ */
  const useRigLandmarksForPlacement = rigGeometryLockedToModel && rigLm != null;

  if (customGarmentData.debugRigPathDs?.length) {
    rigLandmarksDebug = {
      inferredFromRig: rigLm != null,
      rigShoulderY: rigLm?.shoulderY ?? null,
      rigHemY: rigLm?.hemY ?? null,
      usedShoulderY: c.shoulderY ?? null,
      usedHemY: c.hemY ?? null,
      useRigLandmarksForPlacement,
      genericApplied:
        customGarmentData.presetId === "genericSymmetricTop"
          ? !!customGarmentData.genericSymmetricTop?.applied
          : null,
    };
  } else {
    rigLandmarksDebug = {
      inferredFromRig: false,
      rigShoulderY: null,
      rigHemY: null,
      usedShoulderY: c.shoulderY ?? null,
      usedHemY: c.hemY ?? null,
      useRigLandmarksForPlacement: false,
      genericApplied:
        customGarmentData.presetId === "genericSymmetricTop"
          ? !!customGarmentData.genericSymmetricTop?.applied
          : null,
    };
  }
  const customAllOutline = getAllPathPoints(customGarmentData.pathDs);
  const presetShoulderIdx = customGarmentData.shoulderPointIndex;
  const usePresetShoulder =
    presetShoulderIdx != null && customAllOutline.length > presetShoulderIdx;
  // shoulderSeamY: デザイン座標でのどのYをボディ肩ラインに対応させるか。
  // - モデルリグロックかつリグから推定できた場合 → リグ肩Y（服とリグを同じ place で貼る）
  // - preset shoulder index → その頂点Y
  // - それ以外 → 幾何推定（outer collar 最下端）
  const shoulderSeamY = (() => {
    if (useRigLandmarksForPlacement && rigLm) return rigLm.shoulderY;
    if (usePresetShoulder) return customAllOutline[presetShoulderIdx][1];
    const band = 15;
    const customRaw = shoulderContourFromPath(
      customGarmentData.pathDs,
      c.shoulderY - band,
      c.shoulderY + band,
      false
    );
    const customOuter = outerCollarPoints(customRaw, c.shoulderLx, c.shoulderRx);
    return customOuter.length > 0
      ? Math.max(c.shoulderY, Math.max(...customOuter.map((p) => p[1])))
      : c.shoulderY;
  })();
  // 裾ランドマーク（着丈計測 # 未指定時は採寸オーバーレイの裾もこれに合わせる）
  const topLandmarks = (() => {
    const base = useRigLandmarksForPlacement && rigLm
      ? {
          shoulderY: rigLm.shoulderY,
          shoulderLx: rigLm.shoulderLx,
          shoulderRx: rigLm.shoulderRx,
          pitY: rigLm.shoulderY,
          pitLx: rigLm.shoulderLx,
          pitRx: rigLm.shoulderRx,
          hemY: rigLm.hemY,
          hemCx: rigLm.hemCx,
        }
      : {
          shoulderY: shoulderSeamY,
          shoulderLx: c.shoulderLx,
          shoulderRx: c.shoulderRx,
          pitY: shoulderSeamY,
          pitLx: c.shoulderLx,
          pitRx: c.shoulderRx,
          hemY: c.hemY,
          hemCx: c.hemCx,
        };
    return {
      ...base,
      ...(!useRigLandmarksForPlacement && c.garmentLengthOverride != null
        ? { garmentLengthOverride: c.garmentLengthOverride }
        : {}),
      ...(c.bodyShoulderOffsetY != null ? { bodyShoulderOffsetY: c.bodyShoulderOffsetY } : {}),
      ...(c.totalWidth != null ? { totalWidth: c.totalWidth } : {}),
      ...(c.maxWidthRatio != null ? { maxWidthRatio: c.maxWidthRatio } : {}),
    };
  })();
  const placement = buildTopPlacement(height, weight, customGarmentData.size, topLandmarks, shoulderSeamY, null, REF_HEIGHT_CM);
  /** リグロック時は赤リグと同じ model+rig ビュー→ボディ等倍スケール（`buildTopPlacement` は着丈ランドマーク用でリグと一致しない） */
  const placeDesignToTemplate = rigGeometryLockedToModel
    ? scaleModelViewToBodyTemplate
    : (gx: number, gy: number): [number, number] => placement.place(gx, gy);

  /** 服リグ本数がモデル `rigLinePaths` と同じなら幾何は同一テンプレ前提で、モデル休止座標をそのまま使う（d 文字列の丸め差で bbox 近似に落とさない） */
  /** 服パス変換の `buildTopPlacement` をキャンバス側 `topLandmarks` と揃える（アニメ from/to は各データで判定） */
  const placementLockToModelRigFor = (cg: { debugRigPathDs?: string[] | null } | null | undefined) =>
    !!cg &&
    rigLinePaths != null &&
    rigLinePaths.length > 0 &&
    (cg.debugRigPathDs?.length ?? 0) === rigLinePaths.length;
  /** 服に重ねる赤リグ線: `rigTemplateToRigViewForGarmentPath(idx)`（体重で横スケールしないリグワープ＋腕回転） */
  const transformHeightCmForCustomPaths = rigGeometryLockedToModel ? REF_HEIGHT_CM : height;

  customRigPathDs =
    rigGeometryLockedToModel && rigLinePaths
      ? rigLinePaths.slice()
      : customGarmentData.debugRigPathDs?.length
        ? customGarmentData.debugRigPathDs.map((d) => tPath(d, (x, y) => placement.place(x, y)))
        : [];

  // テンプレ空間でリグ同士を平行移動のみ合わせ、その後 rigTemplateToRigView（モデル赤リグと同一パイプライン）。
  // 服リグ本数がモデルと同じ（ロック）時は rigAlign 不要。
  // それ以外: placement 済み服リグ vs rigLinePaths の bbox のみ（nudge なし）。
  // 服リグなし: warp 済みモデルリグ vs placement 済み服リグ（ランドマーク肩時のみ）。
  const rigAlign = ((): CustomRigAlign => {
    if (customRigPathDs.length === 0) return { enabled: false };
    if (rigGeometryLockedToModel) return { enabled: false };

    const bboxOf = (pts: [number, number][]) => {
      let minY = Infinity;
      let minX = Infinity;
      let maxX = -Infinity;
      for (const [x, y] of pts) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
      }
      return { minX, maxX, minY };
    };

    let modelPts: [number, number][];
    let garmentPts: [number, number][];

    if (hasGarmentRig) {
      if (!rigLinePaths?.length) return { enabled: false };
      garmentPts = customRigPathDs.flatMap((d) => getPathPoints(d));
      if (garmentPts.length < 2) return { enabled: false };
      modelPts = rigLinePaths.flatMap((d) => getPathPoints(d));
    } else {
      garmentPts = customRigPathDs.flatMap((d) => getPathPoints(d));
      if (garmentPts.length < 2) return { enabled: false };
      if (!rigLineWarpedPathsGarment?.length) return { enabled: false };
      modelPts = rigLineWarpedPathsGarment.flatMap((d) => getPathPoints(d));
    }
    if (modelPts.length < 2) return { enabled: false };

    const mb = bboxOf(modelPts);
    const gb = bboxOf(garmentPts);
    const modelCenterX = (mb.minX + mb.maxX) / 2;
    const garmentCenterX = (gb.minX + gb.maxX) / 2;
    const dx = modelCenterX - garmentCenterX;
    const dy = mb.minY - gb.minY;
    if (Math.abs(dx) <= 0.1 && Math.abs(dy) <= 0.1) return { enabled: false };
    return { enabled: true, dx, dy };
  })();

  /** 服 path 用: ロック時は肩線の向き・中点を脊髄合わせ後に合わせる剛体のみ（体重由来の横スケールは `*Garment` パイプライン） */
  const fabricShoulderLx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderLx : c.shoulderLx;
  const fabricShoulderRx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderRx : c.shoulderRx;
  const customGarmentFabricRigViewWarp: (x: number, y: number) => [number, number] = (() => {
    if (!rigGeometryLockedToModel) return rigAlignTemplateToRigViewGarment;
    const translateOnly = (x: number, y: number): [number, number] => {
      const refW = warpRigLineRefBodyGarment(x, y);
      if (rigNeckAnchorTranslateOnlyFnGarment)
        return rigNeckAnchorTranslateOnlyFnGarment(refW[0], refW[1]);
      if (rigSpineTranslateOnlyFnGarment) return rigSpineTranslateOnlyFnGarment(refW[0], refW[1]);
      return refW;
    };
    if (!rigSpineAlignFnGarment) return translateOnly;
    const [rslx, rsly] = placeDesignToTemplate(fabricShoulderLx, shoulderSeamY);
    const [rsrx, rsry] = placeDesignToTemplate(fabricShoulderRx, shoulderSeamY);
    const [alx, aly] = applyCustomRigAlignInPlace(rslx, rsly, rigAlign);
    const [arx, ary] = applyCustomRigAlignInPlace(rsrx, rsry, rigAlign);
    const p0 = warpRigLineRefBodyGarment(alx, aly) as [number, number];
    const p1 = warpRigLineRefBodyGarment(arx, ary) as [number, number];
    const q0 = rigSpineAlignFnGarment(p0[0], p0[1]);
    const q1 = rigSpineAlignFnGarment(p1[0], p1[1]);
    const rigidMap = rigidMapFromShoulderSegmentPair(p0, p1, q0, q1);
    if (rigidMap == null) return translateOnly;
    return (x: number, y: number) => rigidMap(warpRigLineRefBodyGarment(x, y) as [number, number]);
  })();

  /** デザイン座標 → canvas。服リグあり: place → rigAlign → fabric ワープ。なし: テンプレ配置のみ（服は `warp` で歪ませない） */
  const designToGarmentCanvas = (gx: number, gy: number): [number, number] => {
    const [px, py] = placeDesignToTemplate(gx, gy);
    if (hasGarmentRig) {
      const [qx, qy] = applyCustomRigAlignInPlace(px, py, rigAlign);
      return customGarmentFabricRigViewWarp(qx, qy);
    }
    return [px, py];
  };

  let customPoints: [number, number][];

  if (
    fromCustomGarmentData &&
    toCustomGarmentData &&
    fromCustomGarmentData.pathDs === toCustomGarmentData.pathDs &&
    animProgress < 1
  ) {
    // アニメーション: pathDs が同じでも from/to のリグロック・推定肩はそれぞれ評価
    const fromC = fromCustomGarmentData.landmarks;
    const toC = toCustomGarmentData.landmarks;
    const fromLocked = placementLockToModelRigFor(fromCustomGarmentData);
    const toLocked = placementLockToModelRigFor(toCustomGarmentData);
    const fromRlm = fromCustomGarmentData.debugRigPathDs?.length
      ? inferLandmarksFromRigPaths(fromCustomGarmentData.debugRigPathDs)
      : null;
    const toRlm = toCustomGarmentData.debugRigPathDs?.length
      ? inferLandmarksFromRigPaths(toCustomGarmentData.debugRigPathDs)
      : null;
    const shoulderYFrom =
      fromLocked && fromRlm ? fromRlm.shoulderY : getShoulderSeamYForData(fromCustomGarmentData);
    const shoulderYTo =
      toLocked && toRlm ? toRlm.shoulderY : getShoulderSeamYForData(toCustomGarmentData);
    const fromMerged = {
      ...fromCustomGarmentData,
      landmarks:
        fromLocked && fromRlm
          ? { ...fromC, ...fromRlm, shoulderY: fromRlm.shoulderY, hemY: fromRlm.hemY }
          : { ...fromC, shoulderY: shoulderYFrom, hemY: fromC.hemY },
    };
    const toMerged = {
      ...toCustomGarmentData,
      landmarks:
        toLocked && toRlm
          ? { ...toC, ...toRlm, shoulderY: toRlm.shoulderY, hemY: toRlm.hemY }
          : { ...toC, shoulderY: shoulderYTo, hemY: toC.hemY },
    };
    const fromTransformH = placementLockToModelRigFor(fromCustomGarmentData) ? REF_HEIGHT_CM : height;
    const toTransformH = placementLockToModelRigFor(toCustomGarmentData) ? REF_HEIGHT_CM : height;
    const fromOut = buildCustomTransformedPathsWithVertexPlots(
      fromMerged,
      fromTransformH,
      weight,
      shoulderYFrom,
      {
        placementLockToModelRig: placementLockToModelRigFor(fromCustomGarmentData),
      }
    );
    const toOut = buildCustomTransformedPathsWithVertexPlots(toMerged, toTransformH, weight, shoulderYTo, {
      placementLockToModelRig: placementLockToModelRigFor(toCustomGarmentData),
    });
    const t = smoothStep(animProgress);
    customPathDs = fromOut.pathDs.map((d, i) =>
      interpolatePath(d, toOut.pathDs[i] ?? d, t)
    );
    const n = Math.min(fromOut.vertexPlotsBodySpace.length, toOut.vertexPlotsBodySpace.length);
    customPoints = Array.from({ length: n }, (unused, i) => {
      const a = fromOut.vertexPlotsBodySpace[i]!;
      const b = toOut.vertexPlotsBodySpace[i]!;
      return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] as [number, number];
    });
  } else {
    // 肩ライン合わせのため shoulderSeamY を渡す（リグロック時はリグ推定肩・裾で服と同一 place）
    const mergedLandmarks =
      useRigLandmarksForPlacement && rigLm
        ? { ...c, ...rigLm, shoulderY: rigLm.shoulderY, hemY: rigLm.hemY }
        : { ...c, shoulderY: shoulderSeamY, hemY: c.hemY };
    const transformed = buildCustomTransformedPathsWithVertexPlots(
      { ...customGarmentData, landmarks: mergedLandmarks },
      transformHeightCmForCustomPaths,
      weight,
      shoulderSeamY,
      { placementLockToModelRig: rigGeometryLockedToModel }
    );
    customPathDs = transformed.pathDs;
    customPoints = transformed.vertexPlotsBodySpace;
  }

  // rigAlign をテンプレ空間で適用後: 服 path は fabric ワープ、重ねリグ線は rigTemplateToRigView（モデル赤リグと一致）
  if (rigAlign.enabled) {
    const alignPlace = (x: number, y: number) => applyCustomRigAlignInPlace(x, y, rigAlign);
    customPathDs = customPathDs.map((d) => tPath(d, alignPlace));
    customRigPathDs = customRigPathDs.map((d) => tPath(d, alignPlace));
    customPoints = customPoints.map(([x, y]) => alignPlace(x, y));
  }
  if (hasGarmentRig) {
    customPathDs = customPathDs.map((d) => tPath(d, customGarmentFabricRigViewWarp));
    customRigPathDs = customRigPathDs.map((d, idx) => tPath(d, rigTemplateToRigViewForGarmentPath(idx)));
    customPoints = customPoints.map(([x, y]) => customGarmentFabricRigViewWarp(x, y));
  }
  const refShoulderLx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderLx : c.shoulderLx;
  const refShoulderRx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderRx : c.shoulderRx;
  const refHemY = useRigLandmarksForPlacement && rigLm ? rigLm.hemY : c.hemY;
  const refHemCx = useRigLandmarksForPlacement && rigLm ? rigLm.hemCx : c.hemCx;
  const customContourBase = [
    placeDesignToTemplate(refShoulderLx, shoulderSeamY),
    placeDesignToTemplate(refShoulderRx, shoulderSeamY),
  ];
  const customContour = hasGarmentRig
    ? (customContourBase.map(([x, y]) => {
        const [qx, qy] = applyCustomRigAlignInPlace(x, y, rigAlign);
        return customGarmentFabricRigViewWarp(qx, qy);
      }) as [number, number][])
    : rigAlign.enabled
      ? (customContourBase.map(([x, y]) => applyCustomRigAlignInPlace(x, y, rigAlign)) as [
          number,
          number,
        ][])
      : customContourBase;
  const customShoulderIdx = usePresetShoulder
    ? presetShoulderIdx
    : (() => {
        const band = 15;
        const customRaw = shoulderContourFromPath(
          customGarmentData.pathDs,
          shoulderSeamY - band,
          shoulderSeamY + band,
          false
        );
        const customOuter = outerCollarPoints(customRaw, refShoulderLx, refShoulderRx);
        const pt =
          shoulderPointOnLine(
            customAllOutline,
            shoulderSeamY,
            (refShoulderLx + refShoulderRx) / 2
          ) ??
          onePointOnGarmentOutline(customOuter, customRaw, refShoulderLx, refShoulderRx);
        return indexOfClosest(customAllOutline, pt);
      })();
  const centerXGarment = (refShoulderLx + refShoulderRx) / 2;
  const shoulderBandY0 = shoulderSeamY;
  const shoulderBandY1 = shoulderSeamY + 28;
  const shoulderBand = customAllOutline.filter((p) => p[1] >= shoulderBandY0 && p[1] <= shoulderBandY1);
  const visualShoulderLx = shoulderBand.length > 0 ? Math.min(...shoulderBand.map((p) => p[0])) : refShoulderLx;
  const visualShoulderRx = shoulderBand.length > 0 ? Math.max(...shoulderBand.map((p) => p[0])) : refShoulderRx;
  const bandY0 = shoulderSeamY + (refHemY - shoulderSeamY) * 0.35;
  const bandY1 = shoulderSeamY + (refHemY - shoulderSeamY) * 0.65;
  const torsoBand = customAllOutline.filter((p) => p[1] >= bandY0 && p[1] <= bandY1);
  const chestMinX = torsoBand.length > 0 ? Math.min(...torsoBand.map((p) => p[0])) : refShoulderLx;
  const chestMaxX = torsoBand.length > 0 ? Math.max(...torsoBand.map((p) => p[0])) : refShoulderRx;
  const chestMidY = (bandY0 + bandY1) / 2;
  const leftHalfAtShoulder = shoulderBand.filter((p) => p[0] < centerXGarment);
  const sleeveSeamL = leftHalfAtShoulder.length > 0 ? leftHalfAtShoulder.reduce((a, b) => (a[0] > b[0] ? a : b)) : [visualShoulderLx, shoulderSeamY] as [number, number];
  const leftSleeveStrict = customAllOutline.filter(
    (p) => p[0] < visualShoulderLx && p[1] > shoulderSeamY
  );
  const leftSleeve = leftSleeveStrict.length > 0 ? leftSleeveStrict : customAllOutline.filter((p) => p[0] < centerXGarment && p[1] > shoulderSeamY);
  const sleeveEndPt = leftSleeve.length > 0 ? leftSleeve.reduce((a, b) => (a[1] > b[1] ? a : b)) : null;
  /**
   * 着丈・袖の cm 換算は `buildTopPlacement(..., lengthCalibrationHeightCm: REF_HEIGHT_CM)` の
   * `bodyPxPerCm = bodyHeight(yScaleCal)/REF_HEIGHT_CM` と一致させる。
   * 身長スライダーは体型ワープ用で、服の縦グレード分母に載せない（195cm 入力で袖・着丈デバッグが歪むのを防ぐ）。
   */
  const { yScale: yScaleGarmentMeasure } = getBodyParams(REF_HEIGHT_CM, REF_WEIGHT_KG);
  const bodyPxPerCm = bodyHeight(yScaleGarmentMeasure) / REF_HEIGHT_CM;
  // 袖丈: `scaleSleevePathToSpec` と同じく端点の |ΔY|（design で定義）に相当するよう、ボディ上の端点 |ΔY| を bodyPxPerCm で cm 化。赤線は経路の見た目。
  let sleeveStart: [number, number] | undefined;
  let sleeveEnd: [number, number] | undefined;
  let sleeveMeasuredCm: number | undefined;
  let sleevePathPoints: [number, number][] | undefined;
  let sleevePathLengthDebug: { px: number; cm: number } | undefined;
  const scalableSpec = scalableSpecForCustomGarment(customGarmentData);
  const gtSym = customGarmentData.genericSymmetricTop;
  const gtHasSleeveMeasure =
    gtSym?.sleeveMeasureVertexStart != null &&
    gtSym?.sleeveMeasureVertexEnd != null &&
    Number.isFinite(gtSym.sleeveMeasureVertexStart) &&
    Number.isFinite(gtSym.sleeveMeasureVertexEnd);
  let effSleeveFromGtOrHighlight: [number, number] | null = null;
  if (gtHasSleeveMeasure) {
    const a = Math.trunc(gtSym!.sleeveMeasureVertexStart!);
    const b = Math.trunc(gtSym!.sleeveMeasureVertexEnd!);
    effSleeveFromGtOrHighlight = [Math.min(a, b), Math.max(a, b)];
  } else if (
    genericVertexPlotHighlight?.sleeveMeasure &&
    Number.isFinite(genericVertexPlotHighlight.sleeveMeasure[0]) &&
    Number.isFinite(genericVertexPlotHighlight.sleeveMeasure[1])
  ) {
    const [sm0, sm1] = genericVertexPlotHighlight.sleeveMeasure;
    effSleeveFromGtOrHighlight = [Math.min(Math.trunc(sm0), Math.trunc(sm1)), Math.max(Math.trunc(sm0), Math.trunc(sm1))];
  }
  const sleeveIndicesForOverlay = effSleeveFromGtOrHighlight ?? scalableSpec?.sleeveMeasureIndices ?? null;
  if (sleeveIndicesForOverlay) {
    const [startIdx, endIdx] = sleeveIndicesForOverlay;
    const startPt = customPoints[startIdx];
    const endPt = customPoints[endIdx];
    const pathPts: [number, number][] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const pt = customPoints[i];
      if (pt) pathPts.push(pt);
    }
    if (startPt && endPt) {
      sleeveStart = startPt;
      sleeveEnd = endPt;
      if (pathPts.length >= 2) {
        sleevePathPoints = pathPts;
      }
      const deltaBodyPx = Math.abs(endPt[1] - startPt[1]);
      const measured = deltaBodyPx / bodyPxPerCm;
      sleevePathLengthDebug = { px: Math.round(deltaBodyPx), cm: measured };
      sleeveMeasuredCm = measured;
    }
  } else {
    sleeveStart = designToGarmentCanvas(sleeveSeamL[0], sleeveSeamL[1]);
    sleeveEnd = sleeveEndPt ? designToGarmentCanvas(sleeveEndPt[0], sleeveEndPt[1]) : undefined;
  }

  // 着丈: 既定は肩ライン〜ランドマーク裾。連結 # ありのときは `lengthMeasureDesignSpanAfterBodyScale` と同じ考え方で端点の |ΔY|（弧長ではない）。
  const shoulderYForLength = designToGarmentCanvas(visualShoulderLx, shoulderSeamY)[1];
  let hemCenter: [number, number] = designToGarmentCanvas(refHemCx, refHemY);
  let lengthMeasuredCm = (hemCenter[1] - shoulderYForLength) / bodyPxPerCm;
  let lengthMeasurePlotRange: [number, number] | undefined;
  let lengthPathLengthDebug: { px: number; cm: number } | undefined;
  let lengthMeasureTop: [number, number] | undefined;
  const gtLen = customGarmentData.genericSymmetricTop;
  const lmLenA = gtLen?.lengthMeasureVertexStart;
  const lmLenB = gtLen?.lengthMeasureVertexEnd;
  const hlLen = genericVertexPlotHighlight?.lengthMeasure;
  const tryLengthFromGlobalRange = (a: number, b: number): boolean => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return false;
    const lo = Math.min(Math.trunc(a), Math.trunc(b));
    const hi = Math.max(Math.trunc(a), Math.trunc(b));
    const pa = customPoints[lo];
    const pb = customPoints[hi];
    if (!pa || !pb) return false;
    const topPt = pa[1] <= pb[1] ? pa : pb;
    const hemPt = pa[1] >= pb[1] ? pa : pb;
    hemCenter = [hemPt[0], hemPt[1]];
    lengthMeasureTop = [topPt[0], topPt[1]];
    const deltaPx = Math.abs(hemPt[1] - topPt[1]);
    lengthMeasuredCm = deltaPx / bodyPxPerCm;
    lengthMeasurePlotRange = [lo, hi];
    lengthPathLengthDebug = {
      px: Math.round(deltaPx),
      cm: deltaPx / bodyPxPerCm,
    };
    return true;
  };
  if (
    lmLenA != null &&
    lmLenB != null &&
    Number.isFinite(lmLenA) &&
    Number.isFinite(lmLenB) &&
    lmLenA !== lmLenB
  ) {
    tryLengthFromGlobalRange(lmLenA, lmLenB);
  } else if (
    hlLen &&
    Number.isFinite(hlLen[0]) &&
    Number.isFinite(hlLen[1]) &&
    hlLen[0] !== hlLen[1]
  ) {
    tryLengthFromGlobalRange(hlLen[0], hlLen[1]);
  }

  // 汎用トップで服リグ＋脊髄合わせ後の canvas は非線形。端点 |ΔY|÷bodyPxPerCm は入力着丈と一致しない。
  // 紫・袖ガイド付きのとき、表示の実寸はグレード正の size に揃える。
  let lengthCmFromSizeInput = false;
  let sleeveCmFromSizeInput = false;
  if (customGarmentData.presetId === "genericSymmetricTop") {
    const lenSpec = customGarmentData.size.length;
    if (lengthMeasureTop != null && Number.isFinite(lenSpec)) {
      lengthMeasuredCm = lenSpec;
      lengthCmFromSizeInput = true;
    }
    const slSpec = customGarmentData.size.sleeve;
    if (sleeveMeasuredCm != null && slSpec != null && Number.isFinite(slSpec)) {
      sleeveMeasuredCm = slSpec;
      sleeveCmFromSizeInput = true;
    }
  }

  const lengthGeomDebug: { px: number; cm: number } = lengthPathLengthDebug
    ? { px: lengthPathLengthDebug.px, cm: lengthPathLengthDebug.cm }
    : {
        px: Math.round(Math.abs(hemCenter[1] - shoulderYForLength)),
        cm: Math.abs(hemCenter[1] - shoulderYForLength) / bodyPxPerCm,
      };
  const sleeveGeomDebug: { px: number; cm: number } | undefined =
    sleevePathLengthDebug != null
      ? { px: sleevePathLengthDebug.px, cm: sleevePathLengthDebug.cm }
      : sleeveStart != null && sleeveEnd != null
        ? {
            px: Math.round(Math.abs(sleeveEnd[1] - sleeveStart[1])),
            cm: Math.abs(sleeveEnd[1] - sleeveStart[1]) / bodyPxPerCm,
          }
        : undefined;

  garmentOverlay = {
    shoulderLeft: designToGarmentCanvas(visualShoulderLx, shoulderSeamY),
    shoulderRight: designToGarmentCanvas(visualShoulderRx, shoulderSeamY),
    hemCenter,
    size: customGarmentData.size,
    lengthMeasuredCm,
    ...(lengthMeasureTop ? { lengthMeasureTop } : {}),
    ...(lengthCmFromSizeInput ? { lengthCmFromSizeInput: true } : {}),
    ...(sleeveCmFromSizeInput ? { sleeveCmFromSizeInput: true } : {}),
    sizeLabel: customGarmentData.presetId === "genericSymmetricTop" ? "汎用トップ" : "カスタム服",
    chestLeft: designToGarmentCanvas(chestMinX, chestMidY),
    chestRight: designToGarmentCanvas(chestMaxX, chestMidY),
    sleeveStart,
    sleeveEnd,
    sleeveMeasuredCm,
    sleevePathPoints,
    lengthGeomDebug,
    ...(sleeveGeomDebug ? { sleeveGeomDebug } : {}),
  };

  const debugFittingMeasure =
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("DEBUG_FITTING_MEASURE") === "1";
  if (debugFittingMeasure) {
    const lenIn = customGarmentData.size.length;
    const slIn = customGarmentData.size.sleeve;
    const lenDiff = lengthMeasuredCm != null ? Math.abs(lengthMeasuredCm - lenIn) : 0;
    const slDiff = sleeveMeasuredCm != null ? Math.abs(sleeveMeasuredCm - slIn) : 0;
    if (lenDiff > 0.2 || slDiff > 0.2) {
      console.info("[FITTING_MEASURE] 入力と画面上換算がずれています（採寸オーバーレイの定義差の確認用）", {
        着丈cm: { 入力: lenIn, 画面上: lengthMeasuredCm ?? "—" },
        袖丈cm: { 入力: slIn, 画面上: sleeveMeasuredCm ?? "—" },
        bodyPxPerCm,
      });
    }
  }

  // 服リグあり時は designToGarmentCanvas 内で rigAlign 済み。translate モードのみ末尾で overlay をシフト。
  if (rigAlign.enabled && !hasGarmentRig) {
    const shiftPt = (p: [number, number] | undefined): [number, number] | undefined =>
      p ? applyCustomRigAlignInPlace(p[0], p[1], rigAlign) : p;
    const shiftPts = (ps: [number, number][] | undefined): [number, number][] | undefined =>
      ps ? ps.map(([x, y]) => applyCustomRigAlignInPlace(x, y, rigAlign)) : ps;
    garmentOverlay = {
      ...garmentOverlay,
      shoulderLeft: shiftPt(garmentOverlay.shoulderLeft) as [number, number],
      shoulderRight: shiftPt(garmentOverlay.shoulderRight) as [number, number],
      hemCenter: shiftPt(garmentOverlay.hemCenter) as [number, number],
      chestLeft: shiftPt(garmentOverlay.chestLeft) as [number, number],
      chestRight: shiftPt(garmentOverlay.chestRight) as [number, number],
      sleeveStart: shiftPt(garmentOverlay.sleeveStart),
      sleeveEnd: shiftPt(garmentOverlay.sleeveEnd),
      sleevePathPoints: shiftPts(garmentOverlay.sleevePathPoints),
      ...(garmentOverlay.lengthMeasureTop
        ? { lengthMeasureTop: shiftPt(garmentOverlay.lengthMeasureTop) as [number, number] }
        : {}),
    };
  }

  shoulderDebug = {
    bodyShoulderContour,
    garmentShoulderContour: customContour,
    garmentShoulderPoints: customPoints,
    shoulderPointIndex: customShoulderIdx,
    garmentType: "custom",
    ...(sleeveIndicesForOverlay ? { sleeveMeasurePlotRange: sleeveIndicesForOverlay } : {}),
    ...(sleevePathLengthDebug && { sleevePathLengthDebug }),
    ...(lengthMeasurePlotRange && { lengthMeasurePlotRange }),
    ...(lengthPathLengthDebug && { lengthPathLengthDebug }),
  };
}

const viewBoxHeight = Math.ceil(bodyHeight(yScale));

const rigIntersectionPlotPoints: FittingCanvasSnapshot["rigIntersectionPlotPoints"] = [];
const pushRigAxisClaviclePlots = (
  paths: string[],
  plotKind: "warp" | "rigView",
  prefix: string
) => {
  if (paths.length <= RIG_LINE_CLAVICLE_R) return;
  const g = extractRigShoulderAnchorGeometry(paths);
  if (!g) return;
  rigIntersectionPlotPoints.push(
    { label: `${prefix} 軸×左鎖`, point: g.spineClavicleL, plotKind },
    { label: `${prefix} 軸×右鎖`, point: g.spineClavicleR, plotKind },
    { label: `${prefix} 首平均`, point: g.neckAvg, plotKind }
  );
};
pushRigAxisClaviclePlots(rigLineWarpedPaths, "warp", "現体型ワープ");
pushRigAxisClaviclePlots(rigLineWarpedRigViewPaths, "rigView", "赤リグ表示");
if (rigLinePaths != null && rigLinePaths.length > RIG_LINE_CLAVICLE_R) {
  const gRest = extractRigShoulderAnchorGeometry(rigLinePaths);
  if (gRest) {
    rigIntersectionPlotPoints.push(
      {
        label: "体追従 軸×左鎖",
        point: bodyFollowFn(gRest.spineClavicleL[0], gRest.spineClavicleL[1]),
        plotKind: "bodyFollow",
      },
      {
        label: "体追従 軸×右鎖",
        point: bodyFollowFn(gRest.spineClavicleR[0], gRest.spineClavicleR[1]),
        plotKind: "bodyFollow",
      },
      {
        label: "体追従 首平均",
        point: bodyFollowFn(gRest.neckAvg[0], gRest.neckAvg[1]),
        plotKind: "bodyFollow",
      }
    );
  }
}

return {
  bodyPaths,
  rigLineWarpedPaths,
  rigLineWarpedRigViewPaths,
  rigRedLineArmDiagram,
  viewBoxHeight,
  shirtPathD,
  jacketFill,
  jacketDetail,
  customPathDs,
  customRigPathDs,
  shoulderDebug,
  bodyPlotPoints,
  bodyOutlinePoints,
  measureOverlay: {
    bodyHeight: { top: bodyHeightTop, bottom: bodyHeightBottom },
    garment: garmentOverlay,
  },
  rigArmAngleDebug,
  rigIntersectionPlotPoints,
  ...(rigLandmarksDebug !== undefined ? { rigLandmarksDebug } : {}),
};
}
