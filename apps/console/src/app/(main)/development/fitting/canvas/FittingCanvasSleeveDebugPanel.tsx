"use client";

import type { MeasureOverlayData } from "../lib/types";

type GarmentG = NonNullable<MeasureOverlayData["garment"]>;

/**
 * 袖Y無効・入力/幾何ずれの説明は SVG 上だと文字が小さすぎるため、キャンバス直下に HTML で表示する。
 */
export function FittingCanvasSleeveDebugPanel({
  show,
  garment,
}: {
  show: boolean;
  garment: GarmentG | null | undefined;
}) {
  if (!show || !garment) return null;
  const warn = garment.sleeveMeasureMismatchWarning;
  const explain = garment.sleeveYScaleInactiveExplain;
  if (!warn && !explain) return null;

  return (
    <div
      className="mx-auto mt-3 w-full max-w-[min(100%,min(760px,90vw))] space-y-3 px-1 sm:px-2"
      role="status"
      aria-live="polite"
    >
      {warn ? (
        <div className="rounded-lg border border-amber-400/90 bg-amber-50 px-4 py-3 text-base font-semibold leading-snug text-amber-950 shadow-sm">
          {warn}
        </div>
      ) : null}
      {explain ? (
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 shadow-sm">
          <p className="text-lg font-semibold leading-tight">{explain.headline}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-800">
            {explain.bullets.map((line, i) => (
              <li key={i} className="marker:text-slate-500">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
