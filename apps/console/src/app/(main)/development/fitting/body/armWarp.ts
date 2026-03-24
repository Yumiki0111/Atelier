import type { BodyZones } from "../lib/types";
import {
  BODY_ARM_OUTLINE_L,
  BODY_ARM_OUTLINE_R,
  ARM_OUTLINE_BY_HEIGHT_CM,
  ARM_OUTLINE_HEIGHT_KEYS,
  REF_HEIGHT_CM,
  REF_WEIGHT_KG,
} from "../lib/constants";
import { getBodyParams } from "./bodyParams";
import { getZonesAnchored } from "./bodyZones";
import { warp, type WarpOptions } from "./bodyWarp";

const ARM_KEYS = ARM_OUTLINE_HEIGHT_KEYS.slice().sort((a, b) => a - b);

/**
 * モデル腕の肩付け：デザイン上の肩線 X（外側肩の列）は固定し、Y だけ `warp` する。
 * `warp` の肩〜胴ブレンドで X が動くとリグ角が崩れるため、腕リグの原点だけここに揃える。
 */
function armShoulderPivotOnFixedSeam(
  shoulderDesignX: number,
  shoulderDesignY: number,
  yScale: number,
  xScale: number,
  zones: BodyZones,
  wopts?: WarpOptions
): [number, number] {
  const [, yw] = warp(shoulderDesignX, shoulderDesignY, yScale, xScale, zones, wopts);
  return [shoulderDesignX, yw];
}

/**
 * 身長に応じて腕アウトラインをキー補間する。貫通を防ぐためモーフを用意し補間で使う。
 */
export function getInterpolatedArmOutline(h: number): {
  left: [number, number][];
  right: [number, number][];
} {
  const n = ARM_KEYS.length;
  if (n === 0) return { left: BODY_ARM_OUTLINE_L, right: BODY_ARM_OUTLINE_R };
  if (h <= ARM_KEYS[0]) {
    const k = ARM_OUTLINE_BY_HEIGHT_CM[ARM_KEYS[0]];
    return k ? { left: k.left, right: k.right } : { left: BODY_ARM_OUTLINE_L, right: BODY_ARM_OUTLINE_R };
  }
  if (h >= ARM_KEYS[n - 1]) {
    const k = ARM_OUTLINE_BY_HEIGHT_CM[ARM_KEYS[n - 1]];
    return k ? { left: k.left, right: k.right } : { left: BODY_ARM_OUTLINE_L, right: BODY_ARM_OUTLINE_R };
  }
  let i = 0;
  while (i < n - 1 && ARM_KEYS[i + 1] <= h) i++;
  const h0 = ARM_KEYS[i];
  const h1 = ARM_KEYS[i + 1];
  const t = (h - h0) / (h1 - h0);
  const k0 = ARM_OUTLINE_BY_HEIGHT_CM[h0];
  const k1 = ARM_OUTLINE_BY_HEIGHT_CM[h1];
  if (!k0 || !k1) return { left: BODY_ARM_OUTLINE_L, right: BODY_ARM_OUTLINE_R };
  const left = k0.left.map((p, j) => [
    p[0] + (k1.left[j][0] - p[0]) * t,
    p[1] + (k1.left[j][1] - p[1]) * t,
  ] as [number, number]);
  const right = k0.right.map((p, j) => [
    p[0] + (k1.right[j][0] - p[0]) * t,
    p[1] + (k1.right[j][1] - p[1]) * t,
  ] as [number, number]);
  return { left, right };
}

/**
 * 腕リグ（肩〜手首）方向に沿って伸縮する。
 * 肩・手首を warp した直線方向をリグ軸とし、沿線距離に yScale・垂直オフセットに xScale を掛ける。
 * （現在体型で進行方向が変わるため、身長スライダで腕の方位角が動く。固定軸は `warpArmOutlineAlongRefFixedAxis`。）
 */
export function warpArmOutlineAlongArm(
  armOutline: [number, number][],
  _isLeft: boolean,
  yScale: number,
  xScale: number,
  zones: BodyZones,
  wopts?: WarpOptions
): [number, number][] {
  if (armOutline.length === 0) return [];
  const shoulder = armOutline[0];
  const wrist = armOutline[armOutline.length - 1];
  const [sx, sy] = shoulder;
  const [wx, wy] = wrist;

  const shoulderWarped = warp(sx, sy, yScale, xScale, zones, wopts);
  const wristWarped = warp(wx, wy, yScale, xScale, zones, wopts);

  const baseDx = wx - sx;
  const baseDy = wy - sy;
  const baseLen = Math.hypot(baseDx, baseDy) || 1;
  const baseUnitX = baseDx / baseLen;
  const baseUnitY = baseDy / baseLen;
  const basePerpX = -baseUnitY;
  const basePerpY = baseUnitX;

  const warpedDx = wristWarped[0] - shoulderWarped[0];
  const warpedDy = wristWarped[1] - shoulderWarped[1];
  const warpedLen = Math.hypot(warpedDx, warpedDy) || 1;
  const dirX = warpedDx / warpedLen;
  const dirY = warpedDy / warpedLen;
  const perpX = -dirY;
  const perpY = dirX;

  return armOutline.map(([px, py], i) => {
    if (i === 0) return shoulderWarped;
    const ax = px - sx;
    const ay = py - sy;
    const alongDist = ax * baseUnitX + ay * baseUnitY;
    const offsetAlongPerp = ax * basePerpX + ay * basePerpY;
    return [
      shoulderWarped[0] + dirX * (alongDist * yScale) + perpX * (offsetAlongPerp * xScale),
      shoulderWarped[1] + dirY * (alongDist * yScale) + perpY * (offsetAlongPerp * xScale),
    ];
  });
}

/**
 * モデル腕のスケール（脇山での切り替え・平行移動は行わない）:
 * - **肩線**: デザイン肩 X 固定・Y のみ `warp`（`armShoulderPivotOnFixedSeam`）。
 * - **沿線長**: 肩〜手首は **現在体型で `warp(肩)`→`warp(手首)` の射影** ÷ デザイン沿線長。
 * - **リグ方向**: `warp(手首, xScale=1)`（身長のみ）で上腕の方位が体重でぶれないようにする。
 * - **全頂点**: 同一の沿線スケール `alongScale` と直交 `perpScale=1` で変形（交点専用ロジックなし）。
 */
export function warpArmOutlineAlongRefFixedAxis(
  armOutline: [number, number][],
  isLeft: boolean,
  yScale: number,
  xScale: number,
  zones: BodyZones,
  wopts?: WarpOptions
): [number, number][] {
  if (armOutline.length === 0) return [];

  const shoulder = armOutline[0];
  const wrist = armOutline[armOutline.length - 1];
  const [sx, sy] = shoulder;
  const [wx, wy] = wrist;

  const shoulderWarped = armShoulderPivotOnFixedSeam(sx, sy, yScale, xScale, zones, wopts);
  const currWristW = warp(wx, wy, yScale, xScale, zones, wopts);
  /** 肩〜手首の向きは身長のみ（xScale=1）。体重の横ワープで上腕の方位が変わらないようにする。 */
  const wristForAxis = warp(wx, wy, yScale, 1, zones, wopts);

  let dirX = wristForAxis[0] - shoulderWarped[0];
  let dirY = wristForAxis[1] - shoulderWarped[1];
  let dirLen = Math.hypot(dirX, dirY);
  if (dirLen < 1e-9) {
    dirX = isLeft ? -0.7 : 0.7;
    dirY = 0.7;
    dirLen = Math.hypot(dirX, dirY) || 1;
  }
  dirX /= dirLen;
  dirY /= dirLen;
  const perpX = -dirY;
  const perpY = dirX;

  const baseDx = wx - sx;
  const baseDy = wy - sy;
  const baseLen = Math.hypot(baseDx, baseDy) || 1;
  const baseUnitX = baseDx / baseLen;
  const baseUnitY = baseDy / baseLen;
  const basePerpX = -baseUnitY;
  const basePerpY = baseUnitX;

  const wristProjAlong =
    (currWristW[0] - shoulderWarped[0]) * dirX + (currWristW[1] - shoulderWarped[1]) * dirY;
  const alongScale = wristProjAlong / baseLen;
  const perpScale = 1;

  const n = armOutline.length;
  const wristAlong = wristProjAlong;

  const legacy: [number, number][] = armOutline.map(([px, py], i): [number, number] => {
    if (i === 0) return shoulderWarped;
    if (i === n - 1) {
      return [shoulderWarped[0] + dirX * wristAlong, shoulderWarped[1] + dirY * wristAlong];
    }
    const ax = px - sx;
    const ay = py - sy;
    const alongDist = ax * baseUnitX + ay * baseUnitY;
    const offsetAlongPerp = ax * basePerpX + ay * basePerpY;
    return [
      shoulderWarped[0] + dirX * (alongDist * alongScale) + perpX * (offsetAlongPerp * perpScale),
      shoulderWarped[1] + dirY * (alongDist * alongScale) + perpY * (offsetAlongPerp * perpScale),
    ];
  });

  return legacy;
}

/** 既定: ワープ肩→手首方向へ沿線・直交を基準比でスケール（`warpArmOutlineAlongRefFixedAxis`）。 */
export function warpArmOutline(
  armOutline: [number, number][],
  isLeft: boolean,
  yScale: number,
  xScale: number,
  zones: BodyZones,
  heightCm?: number
): [number, number][] {
  const wopts: WarpOptions | undefined =
    heightCm != null && Number.isFinite(heightCm) ? { heightCm } : undefined;
  return warpArmOutlineAlongRefFixedAxis(armOutline, isLeft, yScale, xScale, zones, wopts);
}

/**
 * 体型ワープ後の腕の方向角（ラジアン）。`warpArmOutline` の肩〜袖先から算出。
 */
export function getWarpedArmAngles(
  yScale: number,
  xScale: number,
  zones: BodyZones,
  heightCm: number = REF_HEIGHT_CM
): { leftAngle: number; rightAngle: number } {
  const { left: leftOutline, right: rightOutline } = getInterpolatedArmOutline(heightCm);
  const leftWarped = warpArmOutline(leftOutline, true, yScale, xScale, zones, heightCm);
  const rightWarped = warpArmOutline(rightOutline, false, yScale, xScale, zones, heightCm);
  const [l0w, l1w] = [leftWarped[0], leftWarped[leftWarped.length - 1]];
  const [r0w, r1w] = [rightWarped[0], rightWarped[rightWarped.length - 1]];
  return {
    leftAngle: Math.atan2(l1w[1] - l0w[1], l1w[0] - l0w[0]),
    rightAngle: Math.atan2(r1w[1] - r0w[1], r1w[0] - r0w[0]),
  };
}

/** 基準体型（170/60）での腕角度。スキニングで Δθ = θ - BASE_THETA に使う。 */
const _baseAngles = (() => {
  const { yScale, xScale } = getBodyParams(REF_HEIGHT_CM, REF_WEIGHT_KG);
  const zones = getZonesAnchored(yScale);
  return getWarpedArmAngles(yScale, xScale, zones, REF_HEIGHT_CM);
})();
export const BASE_THETA_L = _baseAngles.leftAngle;
export const BASE_THETA_R = _baseAngles.rightAngle;

/**
 * 現在体型での腕角度と、基準からの変化量 Δθ を返す。
 * スキニングでは Δθ を肩付近の頂点にウェイト付きで回転として適用する。
 */
export function getDeltaThetas(h: number, w: number): { left: number; right: number } {
  const { yScale, xScale } = getBodyParams(h, w);
  const zones = getZonesAnchored(yScale);
  const { leftAngle, rightAngle } = getWarpedArmAngles(yScale, xScale, zones, h);
  return {
    left: leftAngle - BASE_THETA_L,
    right: rightAngle - BASE_THETA_R,
  };
}

/**
 * 肩を支点に pt を theta ラジアンだけ回転させる（weight は 0〜1 で回転量のブレンド）。
 */
function transformPoint(
  pt: [number, number],
  pivot: [number, number],
  weight: number,
  theta: number
): [number, number] {
  const dx = pt[0] - pivot[0];
  const dy = pt[1] - pivot[1];
  const t = theta * weight;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos];
}

/**
 * 腕角度スキニング: 肩付近の頂点を、肩からの距離ベースのウェイトで Δθ だけ回転させる。
 * @param pt - warp 適用後の頂点 [x, y]
 * @param shoulderPt - 同じく warp 適用後の肩端 [x, y]
 * @param deltaTheta - 基準姿勢からの腕角度の変化量（ラジアン）
 * @param maxDist - 肩からこの距離以内の頂点だけスキニング。チューニング用。
 */
export function getSkinnedVertex(
  pt: [number, number],
  shoulderPt: [number, number],
  deltaTheta: number,
  maxDist: number = 150
): [number, number] {
  const dist = Math.hypot(pt[0] - shoulderPt[0], pt[1] - shoulderPt[1]);
  const weight = Math.max(0, 1 - dist / maxDist);
  if (weight === 0) return pt;
  return transformPoint(pt, shoulderPt, weight, deltaTheta);
}
