import type { WidgetFitCmLabelsPayload } from "@/lib/widget/widgetFitCmLabels";

/** ゆとりなし。手首から／またから（着丈cm）のテキストのみ。 */
export function WidgetFitCmLabelsSvg({ labels }: { labels: WidgetFitCmLabelsPayload | null | undefined }) {
  if (!labels) return null;
  const fs = 44;
  const font = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  return (
    <g aria-hidden>
      {labels.wristFromCm != null && Number.isFinite(labels.wristFromCm) ? (
        <text
          x={labels.wristTextX}
          y={labels.wristTextY}
          fontSize={fs}
          fontWeight={700}
          fill="#0f172a"
          fontFamily={font}
        >
          {`手首から ${labels.wristFromCm.toFixed(1)}cm`}
        </text>
      ) : null}
      {labels.groinFromCm != null && Number.isFinite(labels.groinFromCm) ? (
        <text
          x={labels.groinTextX}
          y={labels.groinTextY}
          fontSize={fs}
          fontWeight={700}
          fill="#0f172a"
          fontFamily={font}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {`またから ${labels.groinFromCm.toFixed(1)}cm`}
        </text>
      ) : null}
    </g>
  );
}
