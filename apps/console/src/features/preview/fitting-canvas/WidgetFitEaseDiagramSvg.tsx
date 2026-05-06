import type { ReactNode } from "react";
import type { WidgetFitEaseDiagramJson, WidgetFitEaseDiagramOp } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";

function renderOp(op: WidgetFitEaseDiagramOp, key: string): ReactNode {
  switch (op.kind) {
    case "line":
      return (
        <line
          key={key}
          x1={op.x1}
          y1={op.y1}
          x2={op.x2}
          y2={op.y2}
          stroke={op.stroke}
          strokeWidth={op.strokeWidth}
          strokeDasharray={op.dash}
        />
      );
    case "filledPoly":
      return <polygon key={key} points={op.points} fill={op.fill} />;
    case "openPolyline":
      return (
        <polyline
          key={key}
          points={op.points}
          fill="none"
          stroke={op.stroke}
          strokeWidth={op.strokeWidth}
          strokeDasharray={op.dash}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    case "rect":
      return (
        <rect
          key={key}
          x={op.x}
          y={op.y}
          width={op.w}
          height={op.h}
          rx={op.rx}
          fill={op.fill}
          stroke={op.stroke}
          strokeWidth={op.strokeWidth}
        />
      );
    case "text":
      return (
        <text
          key={key}
          x={op.x}
          y={op.y}
          fontSize={op.fontSize}
          fill={op.fill}
          textAnchor={op.textAnchor}
          fontFamily='system-ui, -apple-system, "Segoe UI", sans-serif'
          fontWeight={700}
          dominantBaseline="middle"
        >
          {op.content}
        </text>
      );
    case "circle":
      return (
        <circle
          key={key}
          cx={op.cx}
          cy={op.cy}
          r={op.r}
          fill={op.fill}
          stroke={op.stroke ?? "none"}
          strokeWidth={op.stroke != null && op.stroke.length > 0 ? (op.strokeWidth ?? 0) : 0}
          strokeDasharray={op.dash}
        />
      );
    default:
      return null;
  }
}

/** 袖・裾のポインター（点線＋白カプセル）採寸図 */
export function WidgetFitEaseDiagramSvg({ diagram }: { diagram: WidgetFitEaseDiagramJson | null | undefined }) {
  if (!diagram || diagram.ops.length === 0) return null;
  return (
    <g aria-hidden>
      {diagram.ops.map((op, i) => renderOp(op, `fe-${i}`))}
    </g>
  );
}
