import type { BodyZones } from "../lib/types";
import {
  BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE,
  BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE,
} from "@/lib/fitting-compute/fittingCanvasDebugFlags";
import { BODY_CX, BZ, BODY_H, BASE_SHOULDER_HALF } from "../lib/constants";
import { BPATHS_MODEL } from "../lib/pathData";
import { pointAtGlobalVertexIndex } from "../lib/pathUtils";
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
 * 胴横幅の係数 k（体重のみ）。効果は `1 + (xScale - 1) * k(y)`。
 * **脇〜腰〜尻は k=1 で一様**にし、腹で大きく腰で小さい非単調カーブによる「くびれ」アーティファクトを出さない。
 * 肩〜脇だけ 0→1 に立ち上げ、脚は膝〜足首で k を下げる。
 * なお、胴の **側面**は `warp` 内で腕帯式をバイパスし放射のみとする（`k` を平らにしても腕ブレンドで脇〜腹が細く見えるのを防ぐ）。
 */
export function torsoLateralSpreadFactor(y: number, z: BodyZones, xs: number): number {
  /** 肩〜脇の間でここまでは k を低く保ち、体重増でも肩幅が広がりにくくする */
  const yLateralRampMid = z.shoulder + (z.armpit - z.shoulder) * 0.38;
  const kf: [number, number][] = [
    [z.head_top, 0],
    [z.head_bot, 0],
    [z.neck_bot, 0],
    [z.shoulder, 0],
    [yLateralRampMid, 0.22],
    [z.armpit, 1],
    [z.chest, 1],
    [z.belly, 1],
    [z.waist, 1],
    /** 体重最大付近で尻の横広がりが強すぎるため、腰〜尻帯だけ k をやや抑える */
    [z.hip, 0.88],
    [z.crotch, 0.9],
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
 * 胴側を放射のみにする Y 帯の脇下側マージン（テンプレ Y）。
 * `mv_model` 脇稜の頂点は path 上で global 209–231 / 422–444 付近にあり、一部が Y≈730–747 と
 * `BZ.armpit`(750) より上側にかかる。750 未満だけ腕帯に落ちると脇がくびれるため広げる。
 */
const TORSO_SIDE_RADIAL_ARMPIT_PAD = 40;

/**
 * 胴くびれ補正の対象ポリライン（テンプレ）。左 #207–231 / 右 #420–444。
 */
function outlineGlobalRangePoints(
  pathDs: string[],
  range: readonly [number, number]
): [number, number][] {
  const [lo, hi] = range;
  const out: [number, number][] = [];
  for (let g = lo; g <= hi; g++) {
    const p = pointAtGlobalVertexIndex(pathDs, g);
    if (p) out.push(p);
  }
  return out;
}

const WAIST_INDENT_LEFT_PTS = outlineGlobalRangePoints(BPATHS_MODEL, BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE);
const WAIST_INDENT_RIGHT_PTS = outlineGlobalRangePoints(BPATHS_MODEL, BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE);

/**
 * リグブレンド・フォールバック幾何の係数（幅ゲインとは別に頭打ちするので 1 台に近づけてよい）
 */
const INDENT_EFFECT_MULTIPLIER = 1.12;

/** フォールバック: 連結 # が欠けるビルド向け（旧 Y＋|dx| 近似） */
const INDENT_CHORD_TEMPLATE_Y = 1063.2;
const INDENT_CHORD_TEMPLATE_ABS_DX = 242.9;
const INDENT_CHORD_Y_HALF = 52;
const INDENT_CHORD_DX_HALF = 58;

/** ポリラインへの直交距離の基準半幅（テンプレ px）— 狭いほど #218 弦より外への食み出しが減る */
const INDENT_WAIST_CORRIDOR_PERP_HALF = 46;
/**
 * 帯の連結順の端（#207/#231・#420/#444 付近）で効きを抑える。sin² で中央 1・両端 FLOOR（0 にはしない）
 */
/** 帯の上下端でも中央に対してこれ以上は弱くしない（細すぎ防止） */
const INDENT_WAIST_ARC_END_FLOOR = 0.6;
/** 胴くびれの幅乗算上乗せの上限（広がりすぎ・弦より突出の抑え） */
const INDENT_WAIST_MAX_NET_GAIN = 0.042;
/** 基準体重でもリグ後に細く見える分の乗算（体シルエット用ワープのみ on） */
const INDENT_CHORD_BASE_WIDTH_GAIN = 0.036;
/** 体重増の乗算（d=xScale-1） */
const INDENT_CHORD_WEIGHT_WIDTH_GAIN = 0.11;

/**
 * 正規化距離 s∈[0,1]（0＝弦・基準点、s＝1＝影響端）で重み 1→0。
 * `ss` と同じ quintic なので境界で C² 級に落ち、突出した段差が目立ちにくい。
 */
function indentEnvelope1D(normDist: number): number {
  const s = Math.max(0, Math.min(1, normDist));
  return ss(1 - s);
}

function closestOnPolylineDistAndArc(
  pts: [number, number][],
  x: number,
  y: number
): { dist: number; s: number; totalLen: number } | null {
  if (pts.length < 2) return null;
  let bestD = Infinity;
  let bestS = 0;
  let acc = 0;
  let totalLen = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const segLen2 = abx * abx + aby * aby;
    const segLen = Math.sqrt(segLen2);
    if (segLen < 1e-9) {
      acc += segLen;
      continue;
    }
    const apx = x - a[0];
    const apy = y - a[1];
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / segLen2));
    const qx = a[0] + t * abx;
    const qy = a[1] + t * aby;
    const d = Math.hypot(x - qx, y - qy);
    if (d < bestD) {
      bestD = d;
      bestS = acc + t * segLen;
    }
    acc += segLen;
    totalLen = acc;
  }
  return { dist: bestD, s: bestS, totalLen };
}

function indentAlongArcBulgeFactor(s: number, totalLen: number): number {
  if (totalLen < 1e-6) return 1;
  const bell = Math.sin((Math.PI * s) / totalLen) ** 2;
  return INDENT_WAIST_ARC_END_FLOOR + (1 - INDENT_WAIST_ARC_END_FLOOR) * bell;
}

function indentCorridorWeightFromPolyline(
  pts: [number, number][],
  x: number,
  y: number,
  perpHalf: number
): number {
  const info = closestOnPolylineDistAndArc(pts, x, y);
  if (!info) return 0;
  const wPerp = indentEnvelope1D(info.dist / perpHalf);
  if (wPerp <= 0) return 0;
  return wPerp * indentAlongArcBulgeFactor(info.s, info.totalLen);
}

/**
 * 左 #207–231 / 右 #420–444 の稜線帯に近いほど 1 に近い（直交 quintic × 弧長端テーパー）。
 */
function indentWaistCorridorLocalized(templateX: number, templateY: number, absDx: number): number {
  const perpHalf = INDENT_WAIST_CORRIDOR_PERP_HALF;
  const leftOk = WAIST_INDENT_LEFT_PTS.length >= 2;
  const rightOk = WAIST_INDENT_RIGHT_PTS.length >= 2;
  let loc = 0;
  if (leftOk) {
    loc = Math.max(loc, indentCorridorWeightFromPolyline(WAIST_INDENT_LEFT_PTS, templateX, templateY, perpHalf));
  }
  if (rightOk) {
    loc = Math.max(loc, indentCorridorWeightFromPolyline(WAIST_INDENT_RIGHT_PTS, templateX, templateY, perpHalf));
  }
  if (loc > 0) return loc;
  /** 左右稜の # が取れているときはここだけに限定。旧 Y+|dx| は腹・別稜まで盛り上げるため使わない */
  if (leftOk && rightOk) return 0;
  const yHalf = INDENT_CHORD_Y_HALF * INDENT_EFFECT_MULTIPLIER;
  const dxHalf = INDENT_CHORD_DX_HALF * INDENT_EFFECT_MULTIPLIER;
  const dy = Math.abs(templateY - INDENT_CHORD_TEMPLATE_Y);
  const ddx = Math.abs(absDx - INDENT_CHORD_TEMPLATE_ABS_DX);
  const r = Math.hypot(dy / yHalf, ddx / dxHalf);
  return indentEnvelope1D(r);
}

function indentWaistWidthScale(
  templateX: number,
  templateY: number,
  absDx: number,
  xScale: number,
  applyBaseRigRelief: boolean
): number {
  const localized = indentWaistCorridorLocalized(templateX, templateY, absDx);
  if (localized <= 0) return 1;
  const d = Math.max(0, xScale - 1);
  const weightGain = d > 0 ? INDENT_CHORD_WEIGHT_WIDTH_GAIN * Math.sqrt(d) : 0;
  const baseGain = applyBaseRigRelief ? INDENT_CHORD_BASE_WIDTH_GAIN : 0;
  const raw = (baseGain + weightGain) * localized;
  const capped = Math.min(raw, INDENT_WAIST_MAX_NET_GAIN);
  return 1 + capped;
}

/** 中心からの距離をスケール（左右対称・弦上の幅調整） */
function applyIndentChordWidth(cx: number, xOut: number, scale: number): number {
  if (scale <= 1 + 1e-9) return xOut;
  return cx + (xOut - cx) * scale;
}

/**
 * `deformBodyPointToRig` は骨の局所 (s,n) 写像のため、`warp` の胴くびれ帯の横幅補正が表に出ない。
 * 帯ベルの内側だけ `warped`（= `warpPlain`）へ寄せて補正を復元する。
 */
const INDENT_RIG_SKIN_BLEND_MAX = 0.9;

export function blendDeformedWithIndentWarpRelief(
  templateX: number,
  templateY: number,
  warped: [number, number],
  deformed: [number, number],
  enableIndentRelief = true
): [number, number] {
  if (!enableIndentRelief) return deformed;
  const absDx = Math.abs(templateX - BODY_CX);
  const loc = indentWaistCorridorLocalized(templateX, templateY, absDx);
  if (loc <= 0) return deformed;
  const k = Math.min(1, INDENT_RIG_SKIN_BLEND_MAX * loc * INDENT_EFFECT_MULTIPLIER * 0.88);
  return [
    deformed[0] + (warped[0] - deformed[0]) * k,
    deformed[1] + (warped[1] - deformed[1]) * k,
  ];
}

/**
 * この Y より下で `armOutlineX` より外をテンプレ固定（袖下用）。
 * 915 だと腹〜 waist まで固定され体重が効かないため、腰より下に下げる。
 */
const ARM_BAND_PIN_TEMPLATE_OUTER_BELOW_Y = 1180;

export type WarpOptions = {
  /** 互換のため残す（現在 `warp` 内では未使用） */
  heightCm?: number;
  /**
   * true のときのみ左 #207–231 / 右 #420–444 帯の基準幅補正（リグで細く見える窪み）を適用。
   * 服・服用リグの `warp` は false。
   */
  applyArmpitBaseRigRelief?: boolean;
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
  opts?: WarpOptions
): [number, number] {
  const applyArmpitBase = opts?.applyArmpitBaseRigRelief === true;
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
  /**
   * 脇〜尻の **胴の側面**（腕アウトラインより中心側）は、腕帯の `warpArmBandX`＋ブレンドを通さず放射スケールだけにする。
   * さもないと分母スケールと放射が混ざり、体重増でも脇〜腹だけ相対的に細い「くびれ」が残り、尻腰だけ広がって見える。
   */
  const y0 = BZ.armpit - TORSO_SIDE_RADIAL_ARMPIT_PAD;
  if (y >= y0 && y <= BZ.hip) {
    const rawOuter = dx < 0 ? leftArmOuterX(y) : rightArmOuterX(y);
    const medial = dx < 0 ? x > rawOuter : x < rawOuter;
    if (medial) {
      const xRad0 = BODY_CX + dx * spreadLx;
      const wScale = indentWaistWidthScale(x, y, absDx, xScale, applyArmpitBase);
      return [applyIndentChordWidth(BODY_CX, xRad0, wScale), newY];
    }
  }
  /** 0.48 だと太めで肩〜袖山が体重で広がりすぎるため弱める */
  const armThickness = 1.04 * (1 + (xScale - 1) * 0.22);
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

  const wScale = indentWaistWidthScale(x, y, absDx, xScale, applyArmpitBase);
  return [applyIndentChordWidth(BODY_CX, xOut, wScale), newY];
}

export function bodyHeight(yScale: number): number {
  return BZ.head_bot + (BODY_H - BZ.head_bot) * yScale;
}
