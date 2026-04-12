/**
 * Widget fit band helpers. Thresholds apply to geometric ease (garment vs model chord), not BMI heuristics.
 */

/** 胸まわりバンドの表示文言（「この体型では」や二重括弧は付けず、そのまま表示） */
export const WIDGET_FIT_CHEST_BAND_JA = {
  tight: "小さめなサイズ",
  ok: "おすすめのサイズ",
  loose: "大きめなサイズ",
} as const;

export type WidgetFitChestBandJaLabel =
  (typeof WIDGET_FIT_CHEST_BAND_JA)[keyof typeof WIDGET_FIT_CHEST_BAND_JA];

/**
 * Pick shirt vs jacket thresholds from product category (rule-based).
 */
export function resolveWidgetFitChestBandMode(category: string | null | undefined): "shirt" | "jacket" {
  if (category == null || typeof category !== "string") return "jacket";
  const t = category.trim();
  if (t.length === 0) return "jacket";
  if (t === "トップス") return "shirt";
  const s = t.toLowerCase();
  if (
    t.includes("トップス") ||
    s.includes("shirt") ||
    s.includes("knit") ||
    t.includes("ニット") ||
    t.includes("カットソ") ||
    s.includes("cut-and-sew") ||
    s.includes("cut and sew") ||
    t.includes("シャツ") ||
    t.includes("Tシャツ") ||
    t.includes("tシャツ") ||
    s.includes("t-shirt") ||
    s.includes("tee") ||
    t.includes("ポロ") ||
    s.includes("polo")
  ) {
    return "shirt";
  }
  return "jacket";
}

/**
 * 身長×サイズ列が使えないときのフォールバック（幾何のみ）。
 * メインは `widgetFitChestBandOrdinal` の序数ロジック。
 */
export function widgetChestEaseBand(easeCm: number, mode: "shirt" | "jacket"): "tight" | "ok" | "loose" {
  const tightBelow = 3;
  const looseFrom = mode === "shirt" ? 22 : 26;
  if (easeCm < tightBelow) return "tight";
  if (easeCm < looseFrom) return "ok";
  return "loose";
}

/** Japanese copy from ease in cm. */
export function widgetFitChestBandJaFromDiff(
  easeCm: number,
  mode: "shirt" | "jacket"
): WidgetFitChestBandJaLabel {
  const band = widgetChestEaseBand(easeCm, mode);
  if (band === "tight") return WIDGET_FIT_CHEST_BAND_JA.tight;
  if (band === "ok") return WIDGET_FIT_CHEST_BAND_JA.ok;
  return WIDGET_FIT_CHEST_BAND_JA.loose;
}
