"use client";

import { cn } from "@/lib/utils";

/**
 * 試着不可・フォールバック用の正面シルエット線画。
 * `WidgetStyleProductPreview` の非試着モードと同一パス。
 */
export function PreviewBodySilhouette({
  className,
  stroke = "#c8c8c8",
}: {
  className?: string;
  /** Default outline color when not overridden. */
  stroke?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 260"
      fill="none"
      className={cn("opacity-85", className)}
      aria-hidden
    >
      <path
        d="M60 22c9 0 16-7 16-16S69 0 60 0s-16 7-16 16 7 16 16 16zm0 18c-12 0-22 8-24 19l-4 22 8 2 6-14 2 48-8 52 10 2 10-38 10 38 10-2-8-52 2-48 6 14 8-2-4-22c-2-11-12-19-24-19z"
        stroke={stroke}
        strokeWidth="1.4"
      />
    </svg>
  );
}
