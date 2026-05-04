import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import type { GradingV4SizeKey } from "@/app/(main)/development/fitting/gradingV4/gradingV4Constants";
import {
  GRADING_V4_ORDERED_SIZE_LABELS,
  matchGarmentFlatCmToPreset,
} from "@/app/(main)/development/fitting/gradingV4/gradingV4GarmentCm";

const GRADING_SIZE_SET = new Set<string>(GRADING_V4_ORDERED_SIZE_LABELS);

export function parseGradingV4SizeKey(label: string): GradingV4SizeKey | null {
  const t = label.trim();
  if (GRADING_SIZE_SET.has(t)) return t as GradingV4SizeKey;
  const u = t.toUpperCase();
  if (GRADING_SIZE_SET.has(u)) return u as GradingV4SizeKey;
  return null;
}

export function matchStoredGarmentFlatCmToGradingSize(data: CustomGarmentData): GradingV4SizeKey | null {
  return matchGarmentFlatCmToPreset({
    shoulder: data.size.shoulder,
    bodyWidth: data.size.chest,
    bodyLength: data.size.length,
    sleeve: data.size.sleeve,
  });
}

/**
 * 公開 fit-svg API の `size` クエリを正規化する。
 * Grading v4 カタログ: 空・`default` は保存済み平置き cm から推定し、無ければ S。
 */
export function normalizeWidgetFitSizeQuery(size: string | null | undefined, base: CustomGarmentData): string {
  const t = (size ?? "").trim();
  if (t.length === 0 || t === "default") {
    return matchStoredGarmentFlatCmToGradingSize(base) ?? "S";
  }
  const parsed = parseGradingV4SizeKey(t);
  if (parsed) return parsed;
  return matchStoredGarmentFlatCmToGradingSize(base) ?? "S";
}
