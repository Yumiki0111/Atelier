/**
 * WCAG ベースの前景色選択用（preview chrome の下地色からコントラストを見る）。
 */

const DARK_TEXT_RGB = { r: 17, g: 24, b: 39 }; // #111827
const LIGHT_TEXT_RGB = { r: 249, g: 250, b: 251 }; // #f9fafb

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function clamp255(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

function relativeLuminance255(r: number, g: number, b: number): number {
  const lin = [r, g, b].map((c) => {
    const v = clamp01(c / 255);
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

function contrastRatio(L1: number, L2: number): number {
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function parseHexChunkToRgb(h: string): { r: number; g: number; b: number } | null {
  if (h.length === 3) {
    const r = parseInt(h[0]! + h[0]!, 16);
    const g = parseInt(h[1]! + h[1]!, 16);
    const b = parseInt(h[2]! + h[2]!, 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }
  if (h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = parseInt(h.slice(6, 8), 16);
    if ([r, g, b, a].some((x) => Number.isNaN(x))) return null;
    const alpha = a / 255;
    return {
      r: clamp255(r * alpha + 255 * (1 - alpha)),
      g: clamp255(g * alpha + 255 * (1 - alpha)),
      b: clamp255(b * alpha + 255 * (1 - alpha)),
    };
  }
  return null;
}

function parseCssColorToRgb(input: string): { r: number; g: number; b: number } | null {
  const s = input.trim();
  if (!s) return null;

  if (s.startsWith("#")) {
    return parseHexChunkToRgb(s.slice(1));
  }

  const maybeHex = /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(s);
  if (maybeHex) {
    return parseHexChunkToRgb(s);
  }

  const rgbMatch = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/
  );
  if (rgbMatch) {
    const r = clamp255(parseFloat(rgbMatch[1]!));
    const g = clamp255(parseFloat(rgbMatch[2]!));
    const b = clamp255(parseFloat(rgbMatch[3]!));
    const a = rgbMatch[4] != null ? clamp01(parseFloat(rgbMatch[4]!)) : 1;
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return {
      r: clamp255(r * a + 255 * (1 - a)),
      g: clamp255(g * a + 255 * (1 - a)),
      b: clamp255(b * a + 255 * (1 - a)),
    };
  }

  return null;
}

/**
 * True when light-colored foreground (e.g. near-white text) yields better contrast than dark text.
 */
export function preferLightForegroundOnBackground(cssColor: string): boolean {
  const rgb = parseCssColorToRgb(cssColor);
  if (!rgb) return false;

  const Lbg = relativeLuminance255(rgb.r, rgb.g, rgb.b);
  const LdarkFg = relativeLuminance255(DARK_TEXT_RGB.r, DARK_TEXT_RGB.g, DARK_TEXT_RGB.b);
  const LlightFg = relativeLuminance255(LIGHT_TEXT_RGB.r, LIGHT_TEXT_RGB.g, LIGHT_TEXT_RGB.b);

  const withDarkText = contrastRatio(Lbg, LdarkFg);
  const withLightText = contrastRatio(Lbg, LlightFg);

  return withLightText > withDarkText;
}
