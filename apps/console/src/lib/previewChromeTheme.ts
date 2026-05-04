/**
 * Widget try-on preview: derive foreground and stroke colors from background
 * (pick light vs dark text by WCAG contrast, not a single luminance threshold).
 */

export type PreviewChromePalette = {
  fg: string;
  mutedFg: string;
  border: string;
  surfaceSubtle: string;
  chipIdleBg: string;
  chipIdleFg: string;
  chipIdleBorder: string;
};

export type PreviewChromeTheme = {
  interface: PreviewChromePalette;
  canvas: PreviewChromePalette & {
    /** 試着キャンバス下地として渡された色（ウィジェット等の指定色と一致させる） */
    surfaceBackground: string;
    bodyStroke: string;
    garmentStroke: string;
  };
};

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

/** WCAG 2 contrast ratio for two relative luminances in [0,1]. */
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

/** Parse common CSS color forms for contrast heuristics. */
export function parseCssColorToRgb(input: string): { r: number; g: number; b: number } | null {
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

/** @deprecated Use preferLightForegroundOnBackground; kept for call-site clarity. */
export function isDarkUiBackground(cssColor: string): boolean {
  return preferLightForegroundOnBackground(cssColor);
}

export function buildPreviewChromeTheme(
  interfaceBackgroundColor: string,
  canvasBackgroundColor: string
): PreviewChromeTheme {
  const iDark = preferLightForegroundOnBackground(interfaceBackgroundColor);
  const cDark = preferLightForegroundOnBackground(canvasBackgroundColor);

  const interfacePalette: PreviewChromePalette = iDark
    ? {
        fg: "#f9fafb",
        mutedFg: "#a3a3a3",
        border: "rgba(255,255,255,0.16)",
        surfaceSubtle: "rgba(255,255,255,0.08)",
        chipIdleBg: "rgba(255,255,255,0.1)",
        chipIdleFg: "#f9fafb",
        chipIdleBorder: "rgba(255,255,255,0.35)",
      }
    : {
        fg: "#111827",
        mutedFg: "#6b7280",
        border: "#e5e7eb",
        surfaceSubtle: "#f3f4f6",
        chipIdleBg: "#ffffff",
        chipIdleFg: "#111827",
        chipIdleBorder: "#111827",
      };

  const canvasPaletteBase: PreviewChromePalette = cDark
    ? {
        fg: "#f9fafb",
        mutedFg: "#a3a3a3",
        border: "rgba(255,255,255,0.14)",
        surfaceSubtle: "rgba(255,255,255,0.06)",
        chipIdleBg: "rgba(255,255,255,0.1)",
        chipIdleFg: "#f9fafb",
        chipIdleBorder: "rgba(255,255,255,0.4)",
      }
    : {
        fg: "#111827",
        mutedFg: "#6b7280",
        border: "#e5e7eb",
        surfaceSubtle: "#f3f4f6",
        chipIdleBg: "#ffffff",
        chipIdleFg: "#111827",
        chipIdleBorder: "#111827",
      };

  return {
    interface: interfacePalette,
    canvas: {
      ...canvasPaletteBase,
      surfaceBackground: canvasBackgroundColor,
      bodyStroke: cDark ? "rgba(255,255,255,0.42)" : "#9ca3af",
      garmentStroke: cDark ? "rgba(255,255,255,0.78)" : "rgba(55, 55, 55, 0.82)",
    },
  };
}
