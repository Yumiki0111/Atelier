import {
  warpArmOutline,
  getInterpolatedArmOutline,
  getBodyParams,
  getDeltaThetas,
  getZonesAnchored,
} from "@/app/(main)/development/fitting/lib/bodyUtils";
import { REF_HEIGHT_CM, REF_WEIGHT_KG } from "@/app/(main)/development/fitting/lib/constants";
import type { FittingCanvasRigArmAngleDebug } from "./fittingCanvasComputeTypes";
import { rigSegmentAxisDeg } from "./fittingCanvasRigAlign";

export function smoothStep(t: number): number {
  const s = Math.max(0, Math.min(1, t));
  return s * s * (3 - 2 * s);
}

/** 端で速度・加速度が 0（Perlin / improved smoothstep）。サイズ補間の t に使うと立ち上がりが角張りにくい */
export function smootherStep(t: number): number {
  const s = Math.max(0, Math.min(1, t));
  return s * s * s * (s * (s * 6 - 15) + 10);
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

export function buildRigArmAngleDebug(params: {
  height: number;
  weight: number;
  leftArmOutline: [number, number][];
  rightArmOutline: [number, number][];
  leftArmWarped: [number, number][];
  rightArmWarped: [number, number][];
  /** 例: 線画検証では胴スキニングを使わないため 0 に揃える */
  skinDeltaThetaOverride?: { left: number; right: number };
}): FittingCanvasRigArmAngleDebug {
  const {
    height,
    weight,
    leftArmOutline,
    rightArmOutline,
    leftArmWarped,
    rightArmWarped,
    skinDeltaThetaOverride,
  } = params;
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
  const dt = skinDeltaThetaOverride ?? getDeltaThetas(height, weight, REF_HEIGHT_CM);
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
