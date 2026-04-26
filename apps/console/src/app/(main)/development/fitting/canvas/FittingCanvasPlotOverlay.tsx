import { useMemo } from "react";
import type {
  GarmentType,
  ShirtSize,
  ShoulderDebug,
  CustomGarmentData,
  GenericVertexPlotHighlight,
  PlotIndexLabelDensity,
} from "../lib/types";
import {
  BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE,
  BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE,
  BODY_INDENT_WAIST_REFERENCE_CHORD_GLOBAL_INDICES,
} from "@/lib/fitting-compute/fittingCanvasDebugFlags";
import { sleeveMeasureOverlayNode } from "./fittingCanvasPlotMeasureOverlays";
import {
  FONT_INDEX_GARMENT,
  FONT_INDEX_GARMENT_HIGHLIGHT,
  FONT_INDEX_GARMENT_PLOT,
  FONT_INDEX_GARMENT_PLOT_HIGHLIGHT,
  indexLabelOrbitRadius,
  indexLabelRadialOffset,
  indexLabelStrokeWidth,
  shouldShowPlotIndexLabel,
  vertexHighlightRoles,
} from "./fittingCanvasPlotOverlayUtils";

interface FittingCanvasPlotOverlayProps {
  showGarmentPlot: boolean;
  showBodyPlot: boolean;
  bodyPlotPoints: { label: string; point: [number, number] }[];
  /** ボディ輪郭の全頂点（頭〜足まで全体を点で表示） */
  bodyOutlinePoints: [number, number][];
  /** `DEBUG_FITTING_BODY_VERTICES=1` 時: 指定連結 # をマゼンタで強調（テンプレ座標は title / console） */
  bodyVertexDebugEntries?: { globalIndex: number; template: [number, number] }[] | null;
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
  /** true のとき # をクリックで `onGarmentVertexLinkToggle`（下袖溶接 # のトグル） */
  garmentVertexLinkPickActive?: boolean;
  onGarmentVertexLinkToggle?: (globalVertexIndex: number) => void;
  /** true のとき袖丈の赤線＋px/cm 箱を出さない（採寸オーバーレイと二重になるのを防ぐ） */
  hideSleeveMeasureLine?: boolean;
  /** 連結 # テキストの間引き（`all` で全表示） */
  plotIndexLabelDensity?: PlotIndexLabelDensity;
  /** 服プロット: ホバー中の頂点は間引き時も # を出す */
  hoveredGarmentVertexIndex?: number | null;
  /** 非 null 時はこの連結 # だけ円＋（必要なら）ラベルを表示 */
  garmentPlotVertexFilter?: number[] | null;
}

export function FittingCanvasPlotOverlay({
  showGarmentPlot,
  showBodyPlot,
  bodyPlotPoints,
  bodyOutlinePoints,
  bodyVertexDebugEntries = null,
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
  garmentVertexLinkPickActive = false,
  onGarmentVertexLinkToggle,
  hideSleeveMeasureLine = false,
  plotIndexLabelDensity = "all",
  hoveredGarmentVertexIndex = null,
  garmentPlotVertexFilter = null,
}: FittingCanvasPlotOverlayProps) {
  const debugKey = `shoulder-debug-${height}-${weight}-${garment}-${
    garment === "shirt" ? shirtSize : ""
  }`;

  const garmentPlotFilterSet = useMemo(() => {
    if (garmentPlotVertexFilter == null || garmentPlotVertexFilter.length === 0) return null;
    return new Set(garmentPlotVertexFilter);
  }, [garmentPlotVertexFilter]);

  const bodyVertexDbgTpl = useMemo(() => {
    const m = new Map<number, [number, number]>();
    for (const e of bodyVertexDebugEntries ?? []) m.set(e.globalIndex, e.template);
    return m;
  }, [bodyVertexDebugEntries]);

  const indentWaistGuidePathDs = useMemo(() => {
    const build = (lo: number, hi: number): string | null => {
      const parts: string[] = [];
      for (let g = lo; g <= hi; g++) {
        const p = bodyOutlinePoints[g];
        if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
        parts.push(`${p[0]} ${p[1]}`);
      }
      if (parts.length < 2) return null;
      return `M ${parts.join(" L ")}`;
    };
    const leftD = build(BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE[0], BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE[1]);
    const rightD = build(BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE[0], BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE[1]);
    if (leftD == null && rightD == null) return null;
    return { leftD, rightD };
  }, [bodyOutlinePoints]);

  const indentWaistReferenceChord = useMemo(() => {
    const [a, b] = BODY_INDENT_WAIST_REFERENCE_CHORD_GLOBAL_INDICES;
    const pa = bodyOutlinePoints[a];
    const pb = bodyOutlinePoints[b];
    if (!pa || !pb) return null;
    const [ax, ay] = pa;
    const [bx, by] = pb;
    if (![ax, ay, bx, by].every(Number.isFinite)) return null;
    return { ax, ay, bx, by, a, b };
  }, [bodyOutlinePoints]);

  if (!showGarmentPlot && !showBodyPlot) return null;

  return (
    <g key={debugKey} aria-hidden={true} pointerEvents={allowPointerEvents ? "auto" : "none"}>
      {showBodyPlot && (
        <g data-overlay="body-plot">
          {indentWaistGuidePathDs != null && (
            <g pointerEvents="none">
              {indentWaistGuidePathDs.leftD != null && (
                <path
                  d={indentWaistGuidePathDs.leftD}
                  fill="none"
                  stroke="#c026d3"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  strokeOpacity={0.92}
                >
                  <title>{`胴くびれ帯 左 #${BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE[0]}–#${BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE[1]}（bodyWarp と同じ連結 #）`}</title>
                </path>
              )}
              {indentWaistGuidePathDs.rightD != null && (
                <path
                  d={indentWaistGuidePathDs.rightD}
                  fill="none"
                  stroke="#c026d3"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  strokeOpacity={0.92}
                >
                  <title>{`胴くびれ帯 右 #${BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE[0]}–#${BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE[1]}（bodyWarp と同じ連結 #）`}</title>
                </path>
              )}
            </g>
          )}
          {indentWaistReferenceChord != null && (
            <line
              x1={indentWaistReferenceChord.ax}
              y1={indentWaistReferenceChord.ay}
              x2={indentWaistReferenceChord.bx}
              y2={indentWaistReferenceChord.by}
              fill="none"
              stroke="#7c3aed"
              strokeWidth={2.2}
              strokeDasharray="4 5"
              strokeOpacity={0.95}
              pointerEvents="none"
            >
              <title>{`胴くびれ参照弦 #${indentWaistReferenceChord.a}–#${indentWaistReferenceChord.b}（補正帯は左 #${BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE[0]}–#${BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE[1]}／右 #${BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE[0]}–#${BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE[1]}）`}</title>
            </line>
          )}
          {bodyOutlinePoints.map(([x, y], i) => {
            const dbgTpl = bodyVertexDbgTpl.get(i);
            const isVtxDbg = dbgTpl != null;
            const labelSize = FONT_INDEX_GARMENT;
            const r = isVtxDbg ? 4 : 3;
            const orbit = indexLabelOrbitRadius(r, labelSize);
            const { ox, oy } = indexLabelRadialOffset(i, orbit);
            const indexStrokeW = indexLabelStrokeWidth(labelSize);
            const fill = isVtxDbg ? "#c026d3" : "#22c55e";
            const stroke = isVtxDbg ? "#86198f" : "#166534";
            const textFill = isVtxDbg ? "#a21caf" : "#22c55e";
            const showIndexText = shouldShowPlotIndexLabel(i, plotIndexLabelDensity, isVtxDbg);
            return (
              <g key={`body-${i}-${x}-${y}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={fill}
                  fillOpacity={0.88}
                  stroke={stroke}
                  strokeWidth={isVtxDbg ? 1.4 : 1.1}
                >
                  <title>
                    {isVtxDbg
                      ? `DEBUG 指定頂点 #${i} — テンプレ (${Math.round(dbgTpl[0])},${Math.round(
                          dbgTpl[1]
                        )}) · 表示はワープ＋リグ後 (${Math.round(x)},${Math.round(
                          y
                        )}) · sessionStorage DEBUG_FITTING_BODY_VERTICES=1`
                      : `ボディ輪郭 #${i} (${Math.round(x)}, ${Math.round(y)}) — 連結順: BPATHS_MODEL の各 path を順に結合した 0 始まり`}
                  </title>
                </circle>
                {showIndexText ? (
                  <text
                    x={x + ox}
                    y={y + oy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={labelSize}
                    fill={textFill}
                    fontFamily="monospace"
                    fontWeight="bold"
                    stroke="white"
                    strokeWidth={indexStrokeW}
                    paintOrder="stroke fill"
                  >
                    {`#${i}`}
                  </text>
                ) : null}
              </g>
            );
          })}
          {bodyPlotPoints.map(({ label, point }: { label: string; point: [number, number] }, bi) => {
            const [x, y] = point;
            const labelSize = FONT_INDEX_GARMENT_HIGHLIGHT;
            const cr = 3.5;
            const orbit = indexLabelOrbitRadius(cr, labelSize);
            const { ox, oy } = indexLabelRadialOffset(bi + 17, orbit);
            const indexStrokeW = indexLabelStrokeWidth(labelSize);
            return (
              <g key={label}>
                <circle
                  cx={x}
                  cy={y}
                  r={cr}
                  fill="#16a34a"
                  fillOpacity={0.92}
                  stroke="#14532d"
                  strokeWidth={1.2}
                >
                  <title>ボディ: {label}</title>
                </circle>
                <text
                  x={x + ox}
                  y={y + oy}
                  textAnchor="middle"
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
        </g>
      )}
      {showGarmentPlot && sd !== null && (
        <g data-overlay="garment-plot">
          <g data-overlay="garment-plot-inner">
            <g
              onPointerLeave={() => {
                if (garmentVertexPickEnabled) onGarmentVertexHover?.(null);
              }}
            >
            {sd.garmentShoulderPoints.map(([x, y], i) => {
              if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
              if (garmentPlotFilterSet != null && !garmentPlotFilterSet.has(i)) return null;
              const hlRoles = vertexHighlightRoles(i, genericVertexPlotHighlight);
              const isSnapBody =
                genericVertexPlotHighlight?.lowerSleeveFollowLinkedGlobals?.includes(i) === true;
              const isHl = hlRoles.length > 0;
              const labelSize = isHl ? FONT_INDEX_GARMENT_PLOT_HIGHLIGHT : FONT_INDEX_GARMENT_PLOT;
              const r = isSnapBody ? 6.5 : isHl ? 5.5 : 5;
              const orbit = indexLabelOrbitRadius(r, labelSize);
              const { ox, oy } = indexLabelRadialOffset(i, orbit);
              const indexStrokeW = indexLabelStrokeWidth(labelSize);
              const outlineOnly = !isHl && !isSnapBody;
              const circleFill = isSnapBody ? "#67e8f9" : isHl ? "#4ade80" : "none";
              const labelFill = isSnapBody ? "#0e7490" : isHl ? "#4ade80" : "#334155";
              const stroke = isSnapBody ? "#155e75" : isHl ? "#166534" : "#334155";
              const hlNote = isHl ? ` [${hlRoles.join(" · ")}]` : "";
              const isWidgetFitGlow = hlRoles.includes("ウィジェット体型");
              const showIndexText = shouldShowPlotIndexLabel(
                i,
                plotIndexLabelDensity,
                isHl || isSnapBody || hoveredGarmentVertexIndex === i || garmentPlotFilterSet != null
              );
              return (
                <g
                  key={`pt-${i}-${x}-${y}`}
                  style={
                    isWidgetFitGlow
                      ? {
                          filter:
                            "drop-shadow(0 0 10px rgba(74, 222, 128, 0.92)) drop-shadow(0 0 4px rgba(22, 163, 74, 0.88))",
                        }
                      : undefined
                  }
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={circleFill}
                    fillOpacity={outlineOnly ? undefined : isSnapBody ? 0.9 : 0.92}
                    stroke={stroke}
                    strokeWidth={isSnapBody ? 1.3 : isHl ? 1.1 : 1.5}
                    style={
                      garmentVertexPickEnabled
                        ? {
                            cursor: garmentVertexLinkPickActive ? "pointer" : "crosshair",
                          }
                        : undefined
                    }
                    onPointerEnter={() => {
                      if (garmentVertexPickEnabled) onGarmentVertexHover?.(i);
                    }}
                    onPointerDown={(e) => {
                      if (!garmentVertexLinkPickActive || !onGarmentVertexLinkToggle) return;
                      e.preventDefault();
                      e.stopPropagation();
                      onGarmentVertexLinkToggle(i);
                    }}
                  >
                    <title>
                      {`服の輪郭 #${i}${hlNote}${
                        garmentVertexPickEnabled ? " · r で袖丈連結に追加" : ""
                      }`}
                    </title>
                  </circle>
                  {showIndexText ? (
                    <text
                      x={x + ox}
                      y={y + oy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={labelSize}
                      fill={labelFill}
                      fontFamily="monospace"
                      fontWeight="bold"
                      stroke="white"
                      strokeWidth={indexStrokeW}
                      paintOrder="stroke fill"
                      pointerEvents="none"
                    >
                      {`#${i}`}
                    </text>
                  ) : null}
                </g>
              );
            })}
            </g>
            {(() => {
              const pair = customGarmentData?.genericSymmetricTop?.fitCompareVertexGlobalPair;
              if (garment !== "custom" || !pair || sd == null) return null;
              const [ga, gb] = pair;
              const pa = sd.garmentShoulderPoints[ga];
              const pb = sd.garmentShoulderPoints[gb];
              if (!pa || !pb) return null;
              return (
                <line
                  x1={pa[0]}
                  y1={pa[1]}
                  x2={pb[0]}
                  y2={pb[1]}
                  stroke="#d97706"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  pointerEvents="none"
                  opacity={0.95}
                >
                  <title>{`ウィジェット 服 #${ga}–#${gb}`}</title>
                </line>
              );
            })()}
            {(() => {
              if (garment !== "custom" || !customGarmentData || hideSleeveMeasureLine) return null;
              return (
                <>{sleeveMeasureOverlayNode(sd, customGarmentData, genericVertexPlotHighlight)}</>
              );
            })()}
          </g>
        </g>
      )}
    </g>
  );
}
