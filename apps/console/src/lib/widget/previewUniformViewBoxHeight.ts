import { bodyHeight } from "@/app/(main)/development/fitting/lib/bodyUtils";
import { REF_HEIGHT_CM } from "@/app/(main)/development/fitting/lib/constants";

/**
 * プレビュー／埋め込み試着の SVG viewBox 高さ（身長スライダーの cm のみから決める）。
 * 服リグ由来の `computeFittingCanvasSnapshot().viewBoxHeight` より短いと `meet` でシルエットが大きく見えるため、表示はこちらに揃える。
 */
export function previewUniformViewBoxHeightFromHeightCm(heightCm: number): number {
  const h = Math.max(150, Math.min(195, Math.round(heightCm)));
  return Math.ceil(bodyHeight(h / REF_HEIGHT_CM));
}
