/**
 * 開発用汎用トップの既定（サイズ表・プレースホルダー座標）。
 * 同梱 SVG には依存しない。アップロード前の空状態と applySvgText のベースに使う。
 */
import type { CustomLandmarks, SizeMeasure } from "../lib/types";

/** サイズ 3,4,5（着丈A, 肩幅B, 身幅C, 袖丈D cm）— 旧ブローゾン表と同一数値 */
export const GENERIC_TOP_SIZE_BY_KEY: Record<"3" | "4" | "5", SizeMeasure> = {
  "3": { length: 75.0, shoulder: 58, chest: 68, sleeve: 63.5 },
  "4": { length: 77.0, shoulder: 60, chest: 70, sleeve: 65.0 },
  "5": { length: 79.0, shoulder: 62, chest: 72, sleeve: 66.5 },
};

/** アップロード前の仮ランドマーク（viewBox 系の開発 UI 用。アップロードで上書き） */
export const GENERIC_DEV_PLACEHOLDER_LANDMARKS: CustomLandmarks = {
  shoulderY: 341,
  shoulderLx: 960,
  shoulderRx: 2398,
  hemY: 3089,
  hemCx: 1679,
  garmentLengthOverride: 2748,
};

/** 互換用: SVGアップロード直後に採寸未入力状態へ戻す空サイズ */
export const GENERIC_EMPTY_SIZE: SizeMeasure = {
  length: 0,
  shoulder: 0,
  chest: 0,
  sleeve: 0,
};

export function genericTopSizeForKey(sizeKey: "3" | "4" | "5"): SizeMeasure {
  return GENERIC_TOP_SIZE_BY_KEY[sizeKey] ?? GENERIC_TOP_SIZE_BY_KEY["4"];
}

/**
 * サイズプリセットの並び: 着丈 → 袖丈（いずれも数値）→ ラベル（数値なら数値順、それ以外は locale 比較）。
 */
export function compareGenericSizePresetRow(
  a: { label: string; length: number; sleeve: number },
  b: { label: string; length: number; sleeve: number }
): number {
  if (a.length !== b.length) return a.length - b.length;
  if (a.sleeve !== b.sleeve) return a.sleeve - b.sleeve;
  const na = Number(a.label);
  const nb = Number(b.label);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
}

/** 旧ブローゾン表（3/4/5）に相当する 3 行。初期データには載せず、必要なら UI から追加する想定 */
export function genericTopSizePresets(): { label: "3" | "4" | "5"; length: number; sleeve: number }[] {
  const rows = (["3", "4", "5"] as const).map((k) => {
    const s = genericTopSizeForKey(k);
    return { label: k, length: s.length, sleeve: s.sleeve };
  });
  return [...rows].sort(compareGenericSizePresetRow);
}
