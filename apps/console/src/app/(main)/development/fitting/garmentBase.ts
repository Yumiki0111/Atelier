/**
 * トップス（シャツ・ジャケット等）共通のフィット用ベース。
 * 服ごとに「ランドマーク」だけ定義し、ボディ座標への変換はここで一括処理する。
 *
 * ■ シャツがうまく追従し本寸に近い理由
 * シャツSVGは「絵の比率」がサイズ表に近い（肩幅/着丈 など）。そのため
 * 着丈だけ合わせる uniform scale（scaleX = scaleY）をかけると、
 * 見た目も寸法も本物に近くなる。コード側の特別扱いは不要。
 *
 * ■ ジャケットで同じことをするには
 * ジャケットSVGの絵の比率がサイズ表と違う（肩幅が細い／袖スパンが広い等）と、
 * uniform scale では「着丈は合うが幅が合わない」か「幅を合わせると形が崩れる」になる。
 * totalWidth / maxWidthRatio は見た目を整える暫定策であり、本寸再現にはならない。
 * シャツ同様にするには、ジャケットのアートを「サイズ表の比率で描き直す」か、
 * 同じ採寸基準で作られた jacket SVG を用意する必要がある。
 *
 * 新規トップス追加: 1. viewBox とランドマークを測る 2. landmarks 定義 3. サイズ表 4. buildTopPlacement
 */

import type { SizeMeasure } from "./types";
import { BODY_CX, BODY_SHOULDER_WIDTH, REF_HEIGHT_CM, REF_WEIGHT_KG } from "./constants";
import { getBodyParams, getZonesAnchored, bodyHeight } from "./bodyUtils";

/** 服SVG内のランドマーク（その服の viewBox 座標系） */
export interface TopLandmarks {
  /** 肩線Y（服の上端基準） */
  shoulderY: number;
  /** 肩幅の左X */
  shoulderLx: number;
  /** 肩幅の右X */
  shoulderRx: number;
  /** 脇（アンダーアーム）Y */
  pitY: number;
  /** 脇の左X */
  pitLx: number;
  /** 脇の右X */
  pitRx: number;
  /** 裾Y */
  hemY: number;
  /** 裾中心X（前合わせ） */
  hemCx: number;
  /**
   * 服SVGの横スパン（袖先含む）。指定時のみ scaleX をキャップする（暫定）。
   * 本寸に近づけるには、SVG側の絵の比率をサイズ表に合わせる必要がある。
   */
  totalWidth?: number;
  /** totalWidth 使用時、体肩幅に対する最大幅の割合（0〜1）。本寸再現にはならない。 */
  maxWidthRatio?: number;
  /**
   * 肩ライン合わせ用。ボディの肩(zones.shoulder)に加えるオフセット(px)。
   * 負で服を上にずらし、モデルの見た目肩と袖付けを一致させる。
   */
  bodyShoulderOffsetY?: number;
  /**
   * 指定時は着丈スケールをこの値(px)で計算する。
   * 肩ライン位置は shoulderOriginY で合わせつつ、スケールだけプリセット着丈に固定したい場合に使う（例: Group 11）。
   */
  garmentLengthOverride?: number;
}

/** トップスをボディにフィットさせるための変換パラメータ */
export interface TopPlacement {
  /** 服座標 → ボディ座標の写像 */
  place: (gx: number, gy: number) => [number, number];
  /** ボディ肩Y */
  bodyShoulderY: number;
  /** ボディ中心X */
  bodyCx: number;
}

/**
 * 体と服のサイズ比:
 * - 着丈: ボディの縦スケール（身長px/身長cm）で換算し、モデルと一致させる（scaleY）
 * - 横: totalWidth 指定時は scaleX = min(scaleY, 体肩幅/totalWidth) で体をはみ出さないようにする
 */

const BASE_BMI = 60 / 2.89;

/**
 * 身長・体重・サイズから「1cmあたりのボディpx」を算出（肩幅用・横方向の目安）。
 * 基準体型 170cm/60kg で肩幅47cm ≈ 651px。
 */
export function getPxPerCm(shoulderCm: number): number {
  const BASE_SHOULDER_PX = 651;
  const BASE_SHOULDER_CM = 47;
  return BASE_SHOULDER_PX / BASE_SHOULDER_CM;
}

/**
 * WOOL_MAX_CANVAS_BLOUSON.svg（viewBox 3358×3089）: `garmentLengthOverride` 2748px = サイズ4 着丈 77cm。
 */
export const CALIB_GARMENT_LENGTH_SPAN_PX = 2748;
export const CALIB_GARMENT_LENGTH_CM = 77;

export function inferLengthCmFromDesignGarmentSpan(spanPx: number): number | null {
  if (!Number.isFinite(spanPx) || spanPx < 80) return null;
  const cm = (spanPx * CALIB_GARMENT_LENGTH_CM) / CALIB_GARMENT_LENGTH_SPAN_PX;
  const clamped = Math.max(40, Math.min(125, cm));
  return Math.round(clamped * 10) / 10;
}

/** `garmentLengthOverride` があれば優先、なければ hemY − shoulderY */
export function inferLengthCmFromLandmarks(lm: Pick<TopLandmarks, "shoulderY" | "hemY" | "garmentLengthOverride">): number | null {
  const span = lm.garmentLengthOverride ?? lm.hemY - lm.shoulderY;
  return inferLengthCmFromDesignGarmentSpan(span);
}

/**
 * トップス用の配置。着丈で scaleY を決め、横は totalWidth 指定時は体の肩幅を超えないように scaleX をキャップする。
 * 体重 w により `getBodyParams` の横スケール比を place の X に掛け、胴・脇が体の太りに追従する。
 * @param shoulderOriginY - 指定時はこのYだけボディ肩ラインに合わせる（スケールは landmarks.shoulderY で計算）
 * @param lengthCalibrationHeightCm - 指定時は着丈→scaleY の bodyPxPerCm だけこの身長で計算（肩・ゾーンは h に追従）。未指定時は従来どおり h。カスタム服で身長スライダーに着丈スケールを載せないときは `REF_HEIGHT_CM`。
 */
export function buildTopPlacement(
  h: number,
  w: number,
  size: SizeMeasure,
  landmarks: TopLandmarks,
  shoulderOriginY?: number,
  rigLinePaths?: string[] | null,
  lengthCalibrationHeightCm?: number
): TopPlacement {
  const rig = rigLinePaths ?? null;
  const { yScale, xScale: lateralAtW } = getBodyParams(h, w, rig);
  const { xScale: lateralRef } = getBodyParams(h, REF_WEIGHT_KG, rig);
  const lateralWeightFactor = lateralRef > 1e-9 ? lateralAtW / lateralRef : 1;
  const zones = getZonesAnchored(yScale);
  const bodyShoulderY = zones.shoulder + (landmarks.bodyShoulderOffsetY ?? 0);
  const bodyCx = BODY_CX;

  const hCal = lengthCalibrationHeightCm ?? h;
  const safeHCal = hCal > 1e-6 ? hCal : REF_HEIGHT_CM;
  const { yScale: yScaleCal } = getBodyParams(safeHCal, w, rig);
  const bodyPxPerCm = bodyHeight(yScaleCal) / safeHCal;

  const garmentLength =
    landmarks.garmentLengthOverride ?? landmarks.hemY - landmarks.shoulderY;
  const bodyLength = size.length * bodyPxPerCm;
  // 着丈が 0 や極端に小さいと scaleY が爆発して服が巨大表示になるためガード
  const MIN_GARMENT_LENGTH = 50;
  const effectiveGarmentLength = Math.max(garmentLength, MIN_GARMENT_LENGTH);
  const scaleYRaw = bodyLength / effectiveGarmentLength;
  if (garmentLength < MIN_GARMENT_LENGTH && garmentLength > 0) {
    console.warn("[buildTopPlacement] garmentLength too small, clamping", {
      garmentLength,
      shoulderY: landmarks.shoulderY,
      hemY: landmarks.hemY,
      bodyLength,
      sizeLength: size.length,
    });
  }
  const MAX_SCALE = 5;
  const scaleY = Math.min(scaleYRaw, MAX_SCALE);

  const ratio = landmarks.maxWidthRatio ?? 1;
  const capWidth =
    landmarks.totalWidth != null
      ? (BODY_SHOULDER_WIDTH * ratio) / landmarks.totalWidth
      : null;
  const scaleX =
    capWidth != null ? Math.min(scaleY, capWidth) : scaleY;

  const originX = (landmarks.shoulderLx + landmarks.shoulderRx) / 2;
  const originY = shoulderOriginY ?? landmarks.shoulderY;

  function place(gx: number, gy: number): [number, number] {
    const bx = bodyCx + (gx - originX) * scaleX * lateralWeightFactor;
    const by = bodyShoulderY + (gy - originY) * scaleY;
    return [bx, by];
  }

  return { place, bodyShoulderY, bodyCx };
}
