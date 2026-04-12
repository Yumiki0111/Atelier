/** JPY price label for widget/embed; em dash when unset. Coerces numeric strings from DB. */
export function formatPriceYenForDisplay(
  priceYen: number | string | null | undefined
): string {
  if (priceYen == null || priceYen === "") return "—";
  const n =
    typeof priceYen === "number"
      ? priceYen
      : Number(String(priceYen).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return "—";
  return `¥${Math.trunc(n).toLocaleString("ja-JP")}`;
}
