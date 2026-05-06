import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import type { FlatCmSizeKey } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import {
  GARMENT_FLAT_CM_ORDERED_SIZE_LABELS,
  matchGarmentFlatCmToPreset,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingMeasurements";

const FLAT_CM_SIZE_SET = new Set<string>(GARMENT_FLAT_CM_ORDERED_SIZE_LABELS);

export function parseFlatCmSizeKey(label: string): FlatCmSizeKey | null {
  const t = label.trim();
  if (FLAT_CM_SIZE_SET.has(t)) return t as FlatCmSizeKey;
  const u = t.toUpperCase();
  if (FLAT_CM_SIZE_SET.has(u)) return u as FlatCmSizeKey;
  return null;
}

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
export function normalizeWidgetFitSizeQuery(size: string | null | undefined, base: CustomGarmentData): string {
  const t = (size ?? "").trim();
  if (t.length === 0 || t === "default") {
    return inferGarmentFlatCmSizeKey(base) ?? "S";
  }
  const parsed = parseFlatCmSizeKey(t);
  if (parsed) return parsed;
  return inferGarmentFlatCmSizeKey(base) ?? "S";
}
