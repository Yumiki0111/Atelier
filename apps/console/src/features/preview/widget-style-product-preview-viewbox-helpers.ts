import { bodyHeight } from "@/app/(main)/development/fitting/lib/bodyUtils";
import { REF_HEIGHT_CM } from "@/app/(main)/development/fitting/lib/constants";
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
 * 体型変更シート専用。低身長側はやや縮小してバランスを取る。
 * 上限は 1.0：それ以上の拡大は `transform` でキャンバスからはみ出しやすい（特に 195cm 付近）。
 */
export function bodySheetPreviewHeightScale(heightCm: number): number {
  const h = Math.max(150, Math.min(195, Math.round(heightCm)));
  const raw = h / DEFAULT_PREVIEW_FIT_HEIGHT_CM;
  return Math.max(0.88, Math.min(1.0, raw));
}
