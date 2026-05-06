/**
 * Widget try-on preview: derive foreground and stroke colors from background
 * (pick light vs dark text by WCAG contrast, not a single luminance threshold).
 */

import { preferLightForegroundOnBackground } from "@/lib/previewChromeColorContrast";

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

type PreviewChromePaletteVariant = "interface" | "canvas";

function previewChromePalette(
  preferLightFg: boolean,
  variant: PreviewChromePaletteVariant
): PreviewChromePalette {
  if (preferLightFg) {
    const isInterface = variant === "interface";
    return {
      fg: "#f9fafb",
      mutedFg: "#a3a3a3",
      border: isInterface ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.14)",
      surfaceSubtle: isInterface ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)",
      chipIdleBg: "rgba(255,255,255,0.1)",
      chipIdleFg: "#f9fafb",
      chipIdleBorder: isInterface ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.4)",
    };
  }
  return {
    fg: "#111827",
    mutedFg: "#6b7280",
    border: "#e5e7eb",
    surfaceSubtle: "#f3f4f6",
    chipIdleBg: "#ffffff",
    chipIdleFg: "#111827",
    chipIdleBorder: "#111827",
  };
}

export function buildPreviewChromeTheme(
  interfaceBackgroundColor: string,
  canvasBackgroundColor: string
): PreviewChromeTheme {
  const iDark = preferLightForegroundOnBackground(interfaceBackgroundColor);
  const cDark = preferLightForegroundOnBackground(canvasBackgroundColor);

  return {
    interface: previewChromePalette(iDark, "interface"),
    canvas: {
      ...previewChromePalette(cDark, "canvas"),
      surfaceBackground: canvasBackgroundColor,
      bodyStroke: cDark ? "rgba(255,255,255,0.42)" : "#9ca3af",
      garmentStroke: cDark ? "rgba(255,255,255,0.85)" : "rgba(42, 42, 42, 0.9)",
    },
  };
}
