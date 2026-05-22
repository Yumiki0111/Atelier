import type { GarmentFlatCm } from "./garmentFlatCmGradingMeasurements";
import type { GarmentFlatCmPresetsState } from "./garmentFlatCmGradingPresetsStorage";
import { widgetFitSizeLabelFromPreset } from "@/lib/widget-fit/widgetFitSizeLabels";

/**
 * 開発画面の保存プリセット＋現在編集中の平置き cm から、ウィジェット用サイズチップ候補を復元する。
 * 並びは登録一覧の上から（プレビューでは左）。
 */
export function flatCmOfferedSizeLabelsForRegister(
  state: GarmentFlatCmPresetsState | null | undefined,
  currentGarmentCm: GarmentFlatCm
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (key: string | null) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    ordered.push(key);
  };
  for (const p of state?.userPresets ?? []) {
    add(widgetFitSizeLabelFromPreset(p.cm, p.name));
  }
  const activePreset = state?.activeUserPresetId
    ? state.userPresets.find((p) => p.id === state.activeUserPresetId)
    : undefined;
  add(widgetFitSizeLabelFromPreset(currentGarmentCm, activePreset?.name ?? ""));
  return ordered;
}

/**
 * 登録済みプリセットの平置き cm をラベル別に保存する（キーは `flatCmOfferedSizeLabels` と同一文字列）。
 */
export function flatCmOfferedSizeCmForRegister(
  state: GarmentFlatCmPresetsState | null | undefined,
  currentGarmentCm: GarmentFlatCm
): Record<string, GarmentFlatCm> | undefined {
  const out: Record<string, GarmentFlatCm> = {};
  const assign = (key: string, cm: GarmentFlatCm) => {
    out[key] = { ...cm };
  };
  const activePreset = state?.activeUserPresetId
    ? state.userPresets.find((p) => p.id === state.activeUserPresetId)
    : undefined;
  const curKey = widgetFitSizeLabelFromPreset(currentGarmentCm, activePreset?.name ?? "");
  if (curKey) assign(curKey, currentGarmentCm);
  for (const p of state?.userPresets ?? []) {
    const key = widgetFitSizeLabelFromPreset(p.cm, p.name);
    if (key) assign(key, p.cm);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
