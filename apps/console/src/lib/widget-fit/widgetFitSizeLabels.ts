import type { FlatCmSizeKey } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import {
  GARMENT_FLAT_CM_ORDERED_SIZE_LABELS,
  matchGarmentFlatCmToPreset,
  type GarmentFlatCm,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingMeasurements";

const FLAT_CM_SIZE_SET = new Set<string>(GARMENT_FLAT_CM_ORDERED_SIZE_LABELS);

export function parseFlatCmSizeKey(label: string): FlatCmSizeKey | null {
  const t = label.trim();
  if (FLAT_CM_SIZE_SET.has(t)) return t as FlatCmSizeKey;
  const u = t.toUpperCase();
  if (FLAT_CM_SIZE_SET.has(u)) return u as FlatCmSizeKey;
  return null;
}

export function normalizeWidgetFitSizeLabel(label: string): string {
  return label.trim();
}

/** プリセット名（SIZE 1 等）またはカタログ XS…XXL */
export function widgetFitSizeLabelFromPreset(cm: GarmentFlatCm, presetName: string): string | null {
  const byName = parseFlatCmSizeKey(presetName);
  if (byName) return byName;
  const byCm = matchGarmentFlatCmToPreset(cm);
  if (byCm) return byCm;
  const n = normalizeWidgetFitSizeLabel(presetName);
  return n.length > 0 ? n : null;
}

/** 重複を除き、配列の並び（登録・編集順）をそのまま使う */
export function dedupeWidgetFitSizeLabelsInOrder(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = normalizeWidgetFitSizeLabel(String(raw));
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

/** カタログ XS…XXL 優先の並び（レガシー・フォールバック用） */
export function sortWidgetFitSizeLabels(labels: string[]): string[] {
  const uniq = dedupeWidgetFitSizeLabelsInOrder(labels);
  const orderIndex = new Map(GARMENT_FLAT_CM_ORDERED_SIZE_LABELS.map((k, i) => [k, i] as const));
  return [...uniq].sort((a, b) => {
    const ia = orderIndex.get(a as FlatCmSizeKey);
    const ib = orderIndex.get(b as FlatCmSizeKey);
    if (ia != null && ib != null) return ia - ib;
    if (ia != null) return -1;
    if (ib != null) return 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
}
