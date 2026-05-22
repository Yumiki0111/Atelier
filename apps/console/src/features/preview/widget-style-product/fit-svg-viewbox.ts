import { bodyHeight } from "@/app/(main)/development/fitting/lib/bodyUtils";
import { REF_HEIGHT_CM } from "@/app/(main)/development/fitting/lib/constants";
import { GARMENT_FLAT_CM_VIEWBOX } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import { DEFAULT_PREVIEW_FIT_HEIGHT_CM } from "@/lib/previewFitStorage";

/**
 * 試着プレビュー用の viewBox 高さ。衣装リグの脊髄スパンで yScale が服ごとに変わると
 * `meet` のスケールがぶれて見た目の身長が違うため、身長スライダー（cm）からだけ求める。
 * 体型シート（bodyOnly）でもメイン試着でも同じ式にし、服を表示した瞬間に身長が変わって見えないようにする。
 */
export function uniformPreviewViewBoxHeightFromHeightCm(heightCm: number): number {
  const h = Math.max(150, Math.min(195, Math.round(heightCm)));
  return Math.ceil(bodyHeight(h / REF_HEIGHT_CM));
}

/**
 * 平置き cm 体型シート: viewBox 高さを身長比で変え、`meet` でシルエットの見た目も連動させる。
 * 170cm で Figma ネイティブ 525 と揃える。
 */
export function nativeFlatCmPreviewViewBoxHeightFromHeightCm(heightCm: number): number {
  const h = Math.max(150, Math.min(195, Math.round(heightCm)));
  const parts = GARMENT_FLAT_CM_VIEWBOX.trim().split(/\s+/).map(Number);
  const refH = parts[3] ?? 525;
  return Math.ceil(refH * (h / REF_HEIGHT_CM));
}

/**
 * @deprecated 表示は {@link nativeFlatCmPreviewViewBoxHeightFromHeightCm} を使う（CSS scale は二重になりやすい）
 */
export function bodySheetPreviewHeightScale(heightCm: number): number {
  const h = Math.max(150, Math.min(195, Math.round(heightCm)));
  const raw = h / DEFAULT_PREVIEW_FIT_HEIGHT_CM;
  return Math.max(0.88, Math.min(1.0, raw));
}
