import type { BodyZones } from "../lib/types";
import { BODY_CX, BZ, BODY_H, BASE_SHOULDER_HALF } from "../lib/constants";
import { getAnchorYOffset } from "./bodyZones";
import { armOutlineX } from "./bodyOutlineSample";

function ss(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 脇下〜腹〜腰の **胴横幅**（体重のみ）。Y で係数を変える。
 * さらに `flankOutwardKickPx` で Y 別の外向きオフセットを足す（放射スケールだけとの差別化）。
 */
export function torsoLateralSpreadFactor(y: number, z: BodyZones, xs: number): number {
  const kf: [number, number][] = [
    [z.head_top, 0],
    [z.head_bot, 0],
    [z.neck_bot, 0],
    [z.shoulder, 0],
    [z.armpit, 0.48],
    [z.chest, 1.04],
    [z.belly, 1.22],
    [z.waist, 1.1],
    [z.hip, 1.02],
    [z.crotch, 0.96],
    [z.knee, 0.78],
    [z.ankle, 0.22],
    [z.foot, 0.1],
  ];
  const d = xs - 1;
  if (y < kf[0][0]) return 1;
  if (y >= kf[kf.length - 1][0]) return 1 + d * kf[kf.length - 1][1];
  for (let i = 0; i < kf.length - 1; i++) {
    if (y >= kf[i][0] && y <= kf[i + 1][0]) {
      const t = (y - kf[i][0]) / (kf[i + 1][0] - kf[i][0]);
      return 1 + d * lerp(kf[i][1], kf[i + 1][1], ss(t));
    }
  }
  return 1;
}

/** @deprecated {@link torsoLateralSpreadFactor} を参照 */
export const torsoXFactor = torsoLateralSpreadFactor;

const ARM_START = BASE_SHOULDER_HALF * 0.7;
const ARM_END = BASE_SHOULDER_HALF * 1.05;

/**
 * この Y より下で `armOutlineX` より外をテンプレ固定（袖下用）。
 * 915 だと腹〜 waist まで固定され体重が効かないため、腰より下に下げる。
 */
const ARM_BAND_PIN_TEMPLATE_OUTER_BELOW_Y = 1180;

export type WarpOptions = {
  /** 互換のため残す（現在 `warp` 内では未使用） */
  heightCm?: number;
};

/** 左腕の外側境界X（ベース座標）。 */
function leftArmOuterX(y: number): number {
  return armOutlineX(y);
}

/** 右腕の外側境界X（ベース座標）。 */
function rightArmOuterX(y: number): number {
  return 2 * BODY_CX - armOutlineX(y);
}

/**
 * 中心からの放射スケール `dx * spreadLx` だけだと、縦に近い外輪郭は「横に並行移動」に見えやすい。
 * 脇〜腰の帯で、Y に沿って変化する**追加の外向きオフセット**（体重に連動）を足し、接線が変わるようにする。
 * テンプレ Y・連続関数のため path 上で不連続にならない。
 */
function flankOutwardKickPx(templateY: number, xScale: number): number {
  const d = xScale - 1;
  if (d <= 0) return 0;
  if (templateY < BZ.armpit || templateY > BZ.waist) return 0;
  const span = BZ.waist - BZ.armpit;
  const u = (templateY - BZ.armpit) / span;
  const bell = Math.sin(Math.PI * u);
  return 34 * d * bell * bell;
}

/**
 * 腕帯：`spreadLx` は `torsoLateralSpreadFactor`（脇下〜腹と胴中央と同一）。
 * テンプレ上で `armOutlineX(y)` を外側基準とし、そこから中心方向の距離を `/(armThickness*spreadLx)` でスケール。
 * 脇〜上腕（Y < PIN 閾値）は**外側頂点も同式**（`return x` による固定なし）で体重連動。
 * 袖下以降はアウトライン外をテンプレ固定し袖口形状を保つ。
 */
function warpArmBandX(
  x: number,
  dx: number,
  y: number,
  spreadLx: number,
  armThickness: number
): number {
  const rawOuter = dx < 0 ? leftArmOuterX(y) : rightArmOuterX(y);
  const denom = Math.max(0.42, armThickness * spreadLx);
  const pinOuter = y > ARM_BAND_PIN_TEMPLATE_OUTER_BELOW_Y;

  if (dx < 0) {
    if (pinOuter && x <= rawOuter) {
      return x;
    }
    return rawOuter + (x - rawOuter) / denom;
  }
  if (pinOuter && x >= rawOuter) {
    return x;
  }
  return rawOuter + (x - rawOuter) / denom;
}

export function warp(
  x: number,
  y: number,
  yScale: number,
  xScale: number,
  zones: BodyZones,
  _opts?: WarpOptions
): [number, number] {
  const dx = x - BODY_CX;
  const absDx = Math.abs(dx);

  const yOff = getAnchorYOffset(yScale);
  const newYRaw = y <= BZ.head_bot ? y : BZ.head_bot + (y - BZ.head_bot) * yScale;
  const newY = newYRaw <= BZ.head_bot ? newYRaw : newYRaw + yOff;
  // zones と newY の座標系を揃える（アンカー固定）
  const z = zones as unknown as Record<string, number>;
  const zonesAnchored = {
    head_top: z.head_top,
    head_bot: z.head_bot,
    neck_top: z.neck_top + yOff,
    neck_bot: z.neck_bot + yOff,
    shoulder: z.shoulder + yOff,
    armpit: z.armpit + yOff,
    chest: z.chest + yOff,
    belly: z.belly + yOff,
    waist: z.waist + yOff,
    hip: z.hip + yOff,
    crotch: z.crotch + yOff,
    knee: z.knee + yOff,
    ankle: z.ankle + yOff,
    foot: z.foot + yOff,
  } as unknown as BodyZones;
  const torsoLx = torsoLateralSpreadFactor(newY, zonesAnchored, xScale);
  /** 胴中央と `warpArmBandX` の分母で共有（脇下〜腹と同一 `torsoLateralSpreadFactor`） */
  const spreadLx = torsoLx;
  const armThickness = 1.04 * (1 + (xScale - 1) * 0.48);
  /**
   * テンプレ Y で肩→脇へ 1→armThickness（`warpArmBandX` もテンプレ Y を使うため揃える）。
   * `newY` 判定だと身長スケール後に帯がズレる。
   */
  let armThicknessY = armThickness;
  if (y <= BZ.shoulder) {
    armThicknessY = 1;
  } else if (y < BZ.armpit) {
    const span = Math.max(24, BZ.armpit - BZ.shoulder);
    const u = (y - BZ.shoulder) / span;
    armThicknessY = 1 + (armThickness - 1) * ss(u);
  }

  let xOut: number;
  if (absDx <= ARM_START) {
    xOut = BODY_CX + dx * spreadLx;
  } else if (absDx >= ARM_END) {
    xOut = warpArmBandX(x, dx, y, spreadLx, armThicknessY);
  } else {
    const t = ss((absDx - ARM_START) / (ARM_END - ARM_START));
    const torsoX = BODY_CX + dx * spreadLx;
    const armX = warpArmBandX(x, dx, y, spreadLx, armThicknessY);
    xOut = lerp(torsoX, armX, t);
  }

  const kick = flankOutwardKickPx(y, xScale);
  if (kick !== 0 && absDx > ARM_START) {
    const kickW =
      absDx >= ARM_END ? 1 : ss((absDx - ARM_START) / Math.max(1e-6, ARM_END - ARM_START));
    const k = kick * kickW;
    xOut += dx < 0 ? -k : k;
  }

  return [xOut, newY];
}

export function bodyHeight(yScale: number): number {
  return BZ.head_bot + (BODY_H - BZ.head_bot) * yScale;
}
