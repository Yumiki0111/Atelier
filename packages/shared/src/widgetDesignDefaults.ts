/** Widget embed appearance defaults (shared by console, API, and bundle). */
export const WIDGET_DESIGN_INTERFACE_BG_DEFAULT = "#ffffff";
export const WIDGET_DESIGN_CANVAS_BG_DEFAULT = "#ffffff";
/** Legacy DB default was charcoal; brand uses orange for CTA consistency. */
export const WIDGET_DESIGN_CTA_ACCENT_DEFAULT = "#E86F4C";

const LEGACY_CTA_HEX = new Set(["#3d3835", "#3D3835"]);

export function normalizeWidgetCtaAccentColor(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return WIDGET_DESIGN_CTA_ACCENT_DEFAULT;
  if (LEGACY_CTA_HEX.has(v)) return WIDGET_DESIGN_CTA_ACCENT_DEFAULT;
  return v;
}
