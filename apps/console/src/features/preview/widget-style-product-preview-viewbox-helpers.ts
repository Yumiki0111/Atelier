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
 * 体型変更シート専用。身長スライダーを上げたときに、画面上のシルエットが大きく見えるようにする。
 * （viewBox 高さが伸びると `meet` で縮みやすいため、表示だけ身長比で補正する）
 */
export function bodySheetPreviewHeightScale(heightCm: number): number {
  const h = Math.max(150, Math.min(195, Math.round(heightCm)));
  const raw = h / DEFAULT_PREVIEW_FIT_HEIGHT_CM;
  return Math.max(0.88, Math.min(1.12, raw));
}
