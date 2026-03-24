import type { BodyZones } from "../lib/types";
import {
  BODY_CX,
  BZ,
  BODY_H,
  BASE_SHOULDER_HALF,
  BODY_ARM_OUTLINE_L,
  BODY_ARM_PEAK_INDEX,
  ARM_OUTLINE_BY_HEIGHT_CM,
  ARM_OUTLINE_HEIGHT_KEYS,
} from "../lib/constants";
import { getAnchorYOffset } from "./bodyZones";
import { armOutlineX } from "./bodyOutlineSample";

function ss(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** xScale=1 時の胴パッド。`sin(πt)` は腰で 0 になるので `sin(πt/2)` にする */
const REST_BELLY_BREADTH = 0.13;

function restBellyBoost(y: number, z: BodyZones): number {
  if (y < z.chest || y > z.waist) return 0;
  const span = z.waist - z.chest;
  if (span < 1e-6) return 0;
  const t = (y - z.chest) / span;
  return REST_BELLY_BREADTH * Math.sin((Math.PI / 2) * t);
}

export function torsoXFactor(y: number, z: BodyZones, xs: number): number {
  /**
   * 体重（xScale）の横幅係数。胴の中央列（|dx| 小）に掛かる。
   * 脇より上は 0（肩幅は体重で変えない）。脇〜胸で立ち上げ。外輪郭の脇は `warpArmBandX` が担当。
   */
  const kf: [number, number][] = [
    [z.head_top, 0],
    [z.head_bot, 0],
    [z.neck_bot, 0],
    [z.shoulder, 0],
    [z.armpit, 0],
    [z.chest, 1.18],
    [z.belly, 1.28],
    [z.waist, 1.26],
    [z.hip, 1.12],
    [z.crotch, 0.96],
    [z.knee, 0.78],
    [z.ankle, 0.22],
    [z.foot, 0.1],
  ];
  const d = xs - 1;
  const pad = restBellyBoost(y, z);
  if (y < kf[0][0]) return 1 + pad;
  if (y >= kf[kf.length - 1][0]) return 1 + d * kf[kf.length - 1][1] + pad;
  for (let i = 0; i < kf.length - 1; i++) {
    if (y >= kf[i][0] && y <= kf[i + 1][0]) {
      const t = (y - kf[i][0]) / (kf[i + 1][0] - kf[i][0]);
      return 1 + d * lerp(kf[i][1], kf[i + 1][1], ss(t)) + pad;
    }
  }
  return 1 + pad;
}

const ARM_START = BASE_SHOULDER_HALF * 0.7;
const ARM_END = BASE_SHOULDER_HALF * 1.05;

/**
 * テンプレ Y がこれより下（袖〜手先）では、`armOutlineX` より外の頂点をテンプレ固定する。
 * 上〜脇では常にスケール式を使い、脇 path と交点の連動を取る。
 */
const ARM_BAND_PIN_TEMPLATE_OUTER_BELOW_Y = 915;

const SORTED_ARM_HEIGHT_KEYS = [...ARM_OUTLINE_HEIGHT_KEYS].sort((a, b) => a - b);

const ARM_SPREAD_UPPER_INDEX = 1;
/** 上腕点→脇山の間でスプレッド開始 Y を取る（頂点だけだと脇〜脇下が横に伸びにくい） */
const ARM_SPREAD_BLEND_T = 0.38;

/** 身長補間した「胴横スケールをかけ始める」設計 Y（腕アウトライン上腕〜脇山の補間） */
function armSpreadBoundaryDesignY(heightCm: number): number {
  const keys = SORTED_ARM_HEIGHT_KEYS;
  const n = keys.length;
  const iu = ARM_SPREAD_UPPER_INDEX;
  const ip = BODY_ARM_PEAK_INDEX;
  if (n === 0) {
    const l = BODY_ARM_OUTLINE_L;
    return l[iu]![1] + (l[ip]![1] - l[iu]![1]) * ARM_SPREAD_BLEND_T;
  }
  const sample = (h: number): number => {
    const k = ARM_OUTLINE_BY_HEIGHT_CM[h];
    if (!k) {
      const l = BODY_ARM_OUTLINE_L;
      return l[iu]![1] + (l[ip]![1] - l[iu]![1]) * ARM_SPREAD_BLEND_T;
    }
    const yU = k.left[iu]![1];
    const yP = k.left[ip]![1];
    return yU + (yP - yU) * ARM_SPREAD_BLEND_T;
  };

  if (heightCm <= keys[0]!) return sample(keys[0]!);
  if (heightCm >= keys[n - 1]!) return sample(keys[n - 1]!);
  let i = 0;
  while (i < n - 1 && keys[i + 1]! <= heightCm) i++;
  const h0 = keys[i]!;
  const h1 = keys[i + 1]!;
  const t = (heightCm - h0) / (h1 - h0);
  return sample(h0) + (sample(h1) - sample(h0)) * t;
}

/** ボディ `warp` と同じ縦変換（アンカー後の newY） */
function designYToWarpedNewY(designY: number, yScale: number, yOff: number): number {
  const newYRaw =
    designY <= BZ.head_bot ? designY : BZ.head_bot + (designY - BZ.head_bot) * yScale;
  return newYRaw <= BZ.head_bot ? newYRaw : newYRaw + yOff;
}

export type WarpOptions = {
  /** 指定時、脇山境界は `getInterpolatedArmOutline` と同じ補間の頂点 Y を使う */
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
 * 腕帯：テンプレ上で `armOutlineX(y)` を外側基準とし、そこから中心方向の距離を `/(armThickness*spreadLx)` でスケール。
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

/**
 * 首より上は torsoLx。首下〜スプレッド境界までは 1→torsoLx を滑らかに（脇〜腹を太らせる）。
 * 境界 Y は脇山よりやや上（上腕〜脇山の補間）で、中央列にも早めに torsoLx を効かせる。
 */
function spreadLxForTorso(
  newY: number,
  neckBotAnchored: number,
  spreadBoundaryWarpedY: number,
  torsoLx: number
): number {
  if (newY < neckBotAnchored) return torsoLx;
  if (newY >= spreadBoundaryWarpedY) return torsoLx;
  const span = Math.min(140, Math.max(48, spreadBoundaryWarpedY - neckBotAnchored - 24));
  const y0 = spreadBoundaryWarpedY - span;
  if (newY <= y0) return 1;
  const u = (newY - y0) / (spreadBoundaryWarpedY - y0);
  return lerp(1, torsoLx, ss(u));
}

export function warp(
  x: number,
  y: number,
  yScale: number,
  xScale: number,
  zones: BodyZones,
  opts?: WarpOptions
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
  const torsoLx = torsoXFactor(newY, zonesAnchored, xScale);
  const spreadDesignY =
    opts?.heightCm != null && Number.isFinite(opts.heightCm)
      ? armSpreadBoundaryDesignY(opts.heightCm)
      : BODY_ARM_OUTLINE_L[ARM_SPREAD_UPPER_INDEX]![1] +
        (BODY_ARM_OUTLINE_L[BODY_ARM_PEAK_INDEX]![1] -
          BODY_ARM_OUTLINE_L[ARM_SPREAD_UPPER_INDEX]![1]) *
          ARM_SPREAD_BLEND_T;
  const spreadBoundaryWarpedY = designYToWarpedNewY(spreadDesignY, yScale, yOff);
  const spreadLx = spreadLxForTorso(
    newY,
    zonesAnchored.neck_bot,
    spreadBoundaryWarpedY,
    torsoLx
  );
  const armThickness = 1.04 * (1 + (xScale - 1) * 0.48);
  /**
   * テンプレ Y で肩→脇へ 1→armThickness（`warpArmBandX` もテンプレ Y を使うため揃える）。
   * `newY` 判定だと身長スケール後に帯がズレ、かつ肩〜脇で spreadLx≈1 のとき横が効かなくなる。
   */
  let armThicknessY = armThickness;
  if (y <= BZ.shoulder) {
    armThicknessY = 1;
  } else if (y < BZ.armpit) {
    const span = Math.max(24, BZ.armpit - BZ.shoulder);
    const u = (y - BZ.shoulder) / span;
    armThicknessY = 1 + (armThickness - 1) * ss(u);
  }

  if (absDx <= ARM_START) {
    return [BODY_CX + dx * spreadLx, newY];
  }
  if (absDx >= ARM_END) {
    return [warpArmBandX(x, dx, y, spreadLx, armThicknessY), newY];
  }
  const t = ss((absDx - ARM_START) / (ARM_END - ARM_START));
  const torsoX = BODY_CX + dx * spreadLx;
  const armX = warpArmBandX(x, dx, y, spreadLx, armThicknessY);
  return [lerp(torsoX, armX, t), newY];
}

export function bodyHeight(yScale: number): number {
  return BZ.head_bot + (BODY_H - BZ.head_bot) * yScale;
}
