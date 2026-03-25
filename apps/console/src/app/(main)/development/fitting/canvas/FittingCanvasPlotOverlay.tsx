import type {
  GarmentType,
  ShirtSize,
  ShoulderDebug,
  CustomGarmentData,
  GenericVertexPlotHighlight,
} from "../lib/types";
import {
  lengthMeasureOverlayNode,
  sleeveMeasureOverlayNode,
} from "./fittingCanvasPlotMeasureOverlays";
import {
  FONT_INDEX_GARMENT,
  FONT_INDEX_GARMENT_HIGHLIGHT,
  FONT_INDEX_GARMENT_SHOULDER,
  FONT_INDEX_SHOULDER_BADGE,
  indexLabelStrokeWidth,
  rigIntersectionPlotStyle,
  vertexHighlightRoles,
  type RigIntersectionPlotPoint,
} from "./fittingCanvasPlotOverlayUtils";

export type { RigIntersectionPlotPoint };

interface FittingCanvasPlotOverlayProps {
  showGarmentPlot: boolean;
  showBodyPlot: boolean;
  bodyPlotPoints: { label: string; point: [number, number] }[];
  /** リグの中心軸×鎖骨交点・首平均（モデルプロット ON 時。基準170 / 現ワープ / 赤表示で色分け） */
  rigIntersectionPlotPoints?: RigIntersectionPlotPoint[];
  /** ボディ輪郭の全頂点（頭〜足まで全体を点で表示） */
  bodyOutlinePoints: [number, number][];
  shoulderDebug: ShoulderDebug | null;
  height: number;
  weight: number;
  garment: GarmentType;
  shirtSize: ShirtSize;
  customGarmentData?: CustomGarmentData | null;
  genericVertexPlotHighlight?: GenericVertexPlotHighlight | null;
  allowPointerEvents?: boolean;
  /** 服の輪郭 # のホバーで連結インデックスを親へ（袖丈 r 入力） */
  onGarmentVertexHover?: (globalVertexIndex: number | null) => void;
  garmentVertexPickEnabled?: boolean;
  /** true のとき袖丈の赤線＋px/cm 箱を出さない（採寸オーバーレイと二重になるのを防ぐ） */
  hideSleeveMeasureLine?: boolean;
}

export function FittingCanvasPlotOverlay({
  showGarmentPlot,
  showBodyPlot,
  bodyPlotPoints,
  rigIntersectionPlotPoints = [],
  bodyOutlinePoints,
  shoulderDebug: sd,
  height,
  weight,
  garment,
  shirtSize,
  customGarmentData,
  genericVertexPlotHighlight = null,
  allowPointerEvents = false,
  onGarmentVertexHover,
  garmentVertexPickEnabled = false,
  hideSleeveMeasureLine = false,
}: FittingCanvasPlotOverlayProps) {
  const debugKey = `shoulder-debug-${height}-${weight}-${garment}-${
    garment === "shirt" ? shirtSize : ""
  }`;

  if (!showGarmentPlot && !showBodyPlot) return null;

  return (
    <g key={debugKey} aria-hidden={true} pointerEvents={allowPointerEvents ? "auto" : "none"}>
      {showBodyPlot && (
        <g data-overlay="body-plot">
          {bodyOutlinePoints.map(([x, y], i) => {
            const labelSize = FONT_INDEX_GARMENT;
            const r = 7;
            const dx = Math.round(labelSize * 0.82);
            const indexStrokeW = indexLabelStrokeWidth(labelSize);
            return (
              <g key={`body-${i}-${x}-${y}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill="#22c55e"
                  fillOpacity={0.88}
                  stroke="#166534"
                  strokeWidth={1.8}
                >
                  <title>ボディ輪郭 #{i} ({Math.round(x)}, {Math.round(y)})</title>
                </circle>
                <text
                  x={x + dx}
                  y={y}
                  dominantBaseline="middle"
                  fontSize={labelSize}
                  fill="#22c55e"
                  fontFamily="monospace"
                  fontWeight="bold"
                  stroke="white"
                  strokeWidth={indexStrokeW}
                  paintOrder="stroke fill"
                >
                  {`#${i}`}
                </text>
              </g>
            );
          })}
          {bodyPlotPoints.map(({ label, point }: { label: string; point: [number, number] }) => {
            const [x, y] = point;
            const labelSize = FONT_INDEX_GARMENT_HIGHLIGHT;
            const dx = Math.round(labelSize * 0.82);
            const indexStrokeW = indexLabelStrokeWidth(labelSize);
            return (
              <g key={label}>
                <circle
                  cx={x}
                  cy={y}
                  r={9}
                  fill="#16a34a"
                  fillOpacity={0.92}
                  stroke="#14532d"
                  strokeWidth={2}
                >
                  <title>ボディ: {label}</title>
                </circle>
                <text
                  x={x + dx}
                  y={y}
                  dominantBaseline="middle"
                  fontSize={labelSize}
                  fill="#15803d"
                  fontFamily="monospace"
                  fontWeight="bold"
                  stroke="white"
                  strokeWidth={indexStrokeW}
                  paintOrder="stroke fill"
                >
                  {label}
                </text>
              </g>
            );
          })}
          {rigIntersectionPlotPoints.map(({ label, point, plotKind }) => {
            const [x, y] = point;
            const { fill, stroke, textFill } = rigIntersectionPlotStyle(plotKind);
            const labelSize = FONT_INDEX_GARMENT_HIGHLIGHT;
            const dx = Math.round(labelSize * 0.82);
            const indexStrokeW = indexLabelStrokeWidth(labelSize);
            return (
              <g key={`rig-axis-${label}`}>
                <circle cx={x} cy={y} r={10} fill={fill} fillOpacity={0.9} stroke={stroke} strokeWidth={2.2}>
                  <title>
                    リグ交点: {label} ({Math.round(x)}, {Math.round(y)})
                  </title>
                </circle>
                <text
                  x={x + dx}
                  y={y}
                  dominantBaseline="middle"
                  fontSize={labelSize}
                  fill={textFill}
                  fontFamily="monospace"
                  fontWeight="bold"
                  stroke="white"
                  strokeWidth={indexStrokeW}
                  paintOrder="stroke fill"
                >
                  {label}
                </text>
              </g>
            );
          })}
          {sd !== null && sd.bodyShoulderContour.length >= 2 && (
            <path
              d={`M ${sd.bodyShoulderContour.map(([x, y]) => `${x} ${y}`).join(" L ")}`}
              fill="none"
              stroke="red"
              strokeWidth={4}
              strokeDasharray="8 5"
            >
              <title>ボディの肩ライン（腕が胴に付く高さ）</title>
            </path>
          )}
        </g>
      )}
      {showGarmentPlot && sd !== null && (
        <g data-overlay="garment-plot">
          <g data-overlay="garment-plot-inner">
            {sd.shoulderPointIndex != null && (
              <g>
                <rect
                  x={8}
                  y={4}
                  width={280}
                  height={48}
                  rx={8}
                  fill="white"
                  fillOpacity={0.95}
                  stroke="red"
                  strokeWidth={2}
                />
                <text x={20} y={36} fontSize={FONT_INDEX_SHOULDER_BADGE} fill="red" fontFamily="monospace" fontWeight="bold">
                  肩 #{sd.shoulderPointIndex}
                </text>
              </g>
            )}
            <g
              onPointerLeave={() => {
                if (garmentVertexPickEnabled) onGarmentVertexHover?.(null);
              }}
            >
            {sd.garmentShoulderPoints.map(([x, y], i) => {
              const shoulderIdx = sd.shoulderPointIndex;
              const isShoulder = shoulderIdx != null ? i === shoulderIdx : false;
              const hlRoles = vertexHighlightRoles(i, genericVertexPlotHighlight);
              const isHl = hlRoles.length > 0;
              const labelSize = isShoulder
                ? FONT_INDEX_GARMENT_SHOULDER
                : isHl
                  ? FONT_INDEX_GARMENT_HIGHLIGHT
                  : FONT_INDEX_GARMENT;
              const r = isShoulder ? 10 : isHl ? 8 : 7;
              const dx = Math.round(labelSize * 0.82);
              const indexStrokeW = indexLabelStrokeWidth(labelSize);
              const fill = isShoulder ? "red" : isHl ? "#4ade80" : "blue";
              const stroke = isShoulder ? "darkred" : isHl ? "#166534" : "navy";
              const hlNote = isHl ? ` [${hlRoles.join(" · ")}]` : "";
              return (
                <g key={`pt-${i}-${x}-${y}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={fill}
                    fillOpacity={isShoulder ? 0.95 : isHl ? 0.92 : 0.88}
                    stroke={stroke}
                    strokeWidth={isShoulder ? 2.2 : isHl ? 2 : 1.8}
                    style={garmentVertexPickEnabled ? { cursor: "crosshair" } : undefined}
                    onPointerEnter={() => {
                      if (garmentVertexPickEnabled) onGarmentVertexHover?.(i);
                    }}
                  >
                    <title>
                      {isShoulder
                        ? `肩基準点 #${i}${hlNote}`
                        : `服の輪郭 #${i}${hlNote}${garmentVertexPickEnabled ? " · r で袖丈連結に追加" : ""}`}
                    </title>
                  </circle>
                  <text
                    x={x + dx}
                    y={y}
                    dominantBaseline="middle"
                    fontSize={labelSize}
                    fill={fill}
                    fontFamily="monospace"
                    fontWeight="bold"
                    stroke="white"
                    strokeWidth={indexStrokeW}
                    paintOrder="stroke fill"
                    pointerEvents="none"
                  >
                    {`#${i}`}
                  </text>
                </g>
              );
            })}
            </g>
            {(() => {
              if (garment !== "custom" || !customGarmentData || hideSleeveMeasureLine) return null;
              return (
                <>
                  {sleeveMeasureOverlayNode(sd, customGarmentData, genericVertexPlotHighlight)}
                  {lengthMeasureOverlayNode(sd, customGarmentData)}
                </>
              );
            })()}
          </g>
        </g>
      )}
    </g>
  );
}
