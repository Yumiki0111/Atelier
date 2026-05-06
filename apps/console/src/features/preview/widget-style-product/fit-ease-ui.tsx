"use client";

import type { WidgetFitEaseSummaryJson } from "@/lib/widget-fit/computeWidgetFitEaseSummary";
import { usePreviewChromeTheme } from "../WidgetPreviewChrome";

export function fitChestBandBadgeClass(band: string): string {
  if (band === "小さめなサイズ") return "bg-rose-50 text-rose-900";
  if (band === "おすすめのサイズ") return "bg-emerald-50 text-emerald-950";
  if (band === "ゆったりなサイズ") return "bg-sky-50 text-sky-950";
  return "bg-slate-100 text-slate-800";
}

export function PreviewFitEaseSummary({ summary }: { summary: WidgetFitEaseSummaryJson | null | undefined }) {
  const theme = usePreviewChromeTheme();
  const band = summary?.fitChestBandJa?.trim() ?? "";
  const tone = summary?.fitToneJa?.trim() ?? "";
  const lines = summary?.linesJa?.filter((l) => l.trim().length > 0) ?? [];
  if (!band && !tone && lines.length === 0) return null;
  const toneClass =
    tone.includes("きつめ")
      ? "bg-rose-50 text-rose-900"
      : tone.includes("ゆったり")
        ? "bg-sky-50 text-sky-950"
        : tone.includes("バランス良")
          ? "bg-emerald-50 text-emerald-950"
          : tone.includes("短め")
            ? "bg-amber-50 text-amber-950"
            : tone.includes("長め")
              ? "bg-indigo-50 text-indigo-950"
              : "bg-slate-100 text-slate-800";
  return (
    <div className="w-full max-w-full shrink-0 px-1 pb-0.5 text-center">
      {band ? (
        <div
          className={`mx-auto mb-1 inline-block rounded-md px-3 py-1 text-center text-[10px] font-bold leading-tight ${fitChestBandBadgeClass(band)}`}
        >
          {band}
        </div>
      ) : null}
      {tone ? (
        <div
          className={`mx-auto mb-1 inline-block rounded-md px-3 py-1 text-center text-[9px] font-semibold leading-tight ${toneClass}`}
        >
          {tone}
        </div>
      ) : null}
      {lines.length > 0 ? (
        <div className="text-left text-[11px] leading-snug" style={{ color: theme.canvas.fg }}>
          {lines.map((line, i) => (
            <div key={i} className="flex gap-1 py-px">
              <span className="shrink-0" style={{ color: theme.canvas.mutedFg }} aria-hidden>
                ・
              </span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PreviewFitEaseFootnote({ summary }: { summary: WidgetFitEaseSummaryJson | null | undefined }) {
  const band = summary?.fitChestBandJa?.trim() ?? "";
  const tone = summary?.fitToneJa?.trim() ?? "";
  if (!band && !tone) return null;
  const toneClass =
    tone.includes("きつめ")
      ? "bg-rose-50 text-rose-900"
      : tone.includes("ゆったり")
        ? "bg-sky-50 text-sky-950"
        : tone.includes("バランス良")
          ? "bg-emerald-50 text-emerald-950"
          : tone.includes("短め")
            ? "bg-amber-50 text-amber-950"
            : tone.includes("長め")
              ? "bg-indigo-50 text-indigo-950"
              : "bg-slate-100 text-slate-800";
  return (
    <div className="w-full max-w-full shrink-0 px-1 pb-0.5 text-center">
      {band ? (
        <div
          className={`mx-auto mb-0.5 inline-block rounded-md px-3 py-1 text-center text-[9px] font-bold leading-tight ${fitChestBandBadgeClass(band)}`}
        >
          {band}
        </div>
      ) : null}
      {tone ? (
        <div
          className={`mx-auto inline-block rounded-md px-3 py-1 text-center text-[9px] font-semibold leading-tight ${toneClass}`}
        >
          {tone}
        </div>
      ) : null}
    </div>
  );
}
