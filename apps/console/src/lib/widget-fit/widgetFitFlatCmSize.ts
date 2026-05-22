import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import type { FlatCmSizeKey } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import { isGarmentFlatCmPresetId } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";
import { matchGarmentFlatCmToPreset, type GarmentFlatCm } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingMeasurements";
import {
  normalizeWidgetFitSizeLabel,
  parseFlatCmSizeKey,
} from "@/lib/widget-fit/widgetFitSizeLabels";

export { parseFlatCmSizeKey } from "@/lib/widget-fit/widgetFitSizeLabels";

/** 保存済み `size`（cm）からカタログ上の XS…XXL を推定 */
export function inferGarmentFlatCmSizeKey(data: CustomGarmentData): FlatCmSizeKey | null {
  return matchGarmentFlatCmToPreset({
    shoulder: data.size.shoulder,
    bodyWidth: data.size.chest,
    bodyLength: data.size.length,
    sleeve: data.size.sleeve,
  });
}

/**
 * 公開 fit-svg API の `size` クエリを正規化する。
 * 平置き cm カタログ: 空・`default` は保存済み平置き cm から推定し、無ければ S。
 */
function savedGarmentFlatCm(data: CustomGarmentData): GarmentFlatCm {
  return {
    shoulder: data.size.shoulder,
    bodyWidth: data.size.chest,
    bodyLength: data.size.length,
    sleeve: data.size.sleeve,
  };
}

function garmentFlatCmNearEqual(a: GarmentFlatCm, b: GarmentFlatCm, eps = 0.08): boolean {
  return (
    Math.abs(a.shoulder - b.shoulder) < eps &&
    Math.abs(a.bodyWidth - b.bodyWidth) < eps &&
    Math.abs(a.bodyLength - b.bodyLength) < eps &&
    Math.abs(a.sleeve - b.sleeve) < eps
  );
}

function labelMatchingSavedCm(data: CustomGarmentData, sizeKeys: string[]): string | null {
  const saved = savedGarmentFlatCm(data);
  const offered = data.flatCmOfferedSizeCm;
  if (offered) {
    for (const label of sizeKeys) {
      const cm = offered[label];
      if (cm && garmentFlatCmNearEqual(cm, saved)) return label;
    }
  }
  const labels = data.flatCmOfferedSizeLabels;
  if (labels?.length) {
    for (const raw of labels) {
      const label = normalizeWidgetFitSizeLabel(String(raw));
      if (sizeKeys.includes(label)) return label;
    }
  }
  return null;
}

export function normalizeWidgetFitSizeQuery(size: string | null | undefined, base: CustomGarmentData): string {
  const t = normalizeWidgetFitSizeLabel(size ?? "");
  if (t.length === 0 || t === "default") {
    const inferred = inferGarmentFlatCmSizeKey(base);
    return inferred ?? "S";
  }
  if (base.flatCmOfferedSizeCm?.[t] != null) return t;
  if (base.flatCmOfferedSizeLabels?.map((l) => normalizeWidgetFitSizeLabel(String(l))).includes(t)) {
    return t;
  }
  const parsed = parseFlatCmSizeKey(t);
  if (parsed) return parsed;
  return inferGarmentFlatCmSizeKey(base) ?? t;
}

/** プレビュー／ウィジェットの初期選択サイズ（登録済み `size` を優先） */
export function resolveWidgetFitInitialSize(
  preferred: string | null | undefined,
  garmentSpec: CustomGarmentData | null | undefined,
  sizeKeys: string[]
): string {
  const pref = (preferred ?? "").trim();
  if (pref.length > 0 && sizeKeys.includes(pref)) return pref;
  if (garmentSpec != null && isGarmentFlatCmPresetId(garmentSpec.presetId)) {
    const matched = labelMatchingSavedCm(garmentSpec, sizeKeys);
    if (matched) return matched;
    const inferred = inferGarmentFlatCmSizeKey(garmentSpec);
    if (inferred != null && sizeKeys.includes(inferred)) return inferred;
  }
  return sizeKeys[0] ?? "M";
}
