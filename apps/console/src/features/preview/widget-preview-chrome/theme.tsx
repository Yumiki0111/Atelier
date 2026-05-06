"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import {
  WIDGET_DESIGN_CANVAS_BG_DEFAULT,
  WIDGET_DESIGN_CTA_ACCENT_DEFAULT,
} from "@Atelier/shared";
import {
  buildPreviewChromeTheme,
  type PreviewChromeTheme,
} from "@/lib/previewChromeTheme";

export const PREVIEW_ACCENT = WIDGET_DESIGN_CTA_ACCENT_DEFAULT;

/** 試着プレビュー全体の下地（描画キャンパス・ヘッダー下・フォン画面内を同じ色に） */
export const PREVIEW_SURFACE_BG = WIDGET_DESIGN_CANVAS_BG_DEFAULT;

const DEFAULT_PREVIEW_CHROME_THEME = buildPreviewChromeTheme(
  PREVIEW_SURFACE_BG,
  PREVIEW_SURFACE_BG,
);

const PreviewChromeThemeContext = createContext<PreviewChromeTheme>(DEFAULT_PREVIEW_CHROME_THEME);

export function PreviewChromeThemeProvider({
  interfaceBackgroundColor,
  canvasBackgroundColor,
  children,
}: {
  interfaceBackgroundColor: string;
  canvasBackgroundColor: string;
  children: ReactNode;
}) {
  const value = useMemo(
    () => buildPreviewChromeTheme(interfaceBackgroundColor, canvasBackgroundColor),
    [interfaceBackgroundColor, canvasBackgroundColor],
  );
  return (
    <PreviewChromeThemeContext.Provider value={value}>{children}</PreviewChromeThemeContext.Provider>
  );
}

export function usePreviewChromeTheme(): PreviewChromeTheme {
  return useContext(PreviewChromeThemeContext);
}

/** `default` = コンソールのプレビュー（コンパクト）。`embed` = ウィジェット iframe 用（タップしやすい） */
export type PreviewChromeUiScale = "default" | "embed";

const PreviewChromeScaleContext = createContext<PreviewChromeUiScale>("default");

export function PreviewChromeScaleProvider({
  value,
  children,
}: {
  value: PreviewChromeUiScale;
  children: ReactNode;
}) {
  return (
    <PreviewChromeScaleContext.Provider value={value}>{children}</PreviewChromeScaleContext.Provider>
  );
}

export function usePreviewChromeScale(): PreviewChromeUiScale {
  return useContext(PreviewChromeScaleContext);
}
