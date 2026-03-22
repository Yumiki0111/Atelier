import type { ReactNode } from "react";
import type {
  GarmentType,
  ShirtSize,
  ShoulderDebug,
  CustomGarmentData,
  GenericVertexPlotHighlight,
} from "./types";
import { mirrorSleeveMeasureRangeToOppositeInner } from "./sleeveMeasureBodyExact";
import { getScalableSpec } from "./customGarmentUtils";
import { resolveGenericScalableSpec } from "./generic";

/** 連結頂点 # の文字（頂点が密なところで重なりやすいので控えめ） */
const FONT_INDEX_GARMENT = 30;
const FONT_INDEX_GARMENT_HIGHLIGHT = 34;
const FONT_INDEX_GARMENT_SHOULDER = 40;
const FONT_INDEX_SHOULDER_BADGE = 34;

function indexLabelStrokeWidth(fontSize: number): number {
  return Math.max(2.5, Math.round(fontSize * 0.12));
}

export type RigIntersectionPlotPoint = {
  label: string;
  point: [number, number];
  plotKind: "bodyFollow" | "warp" | "rigView";
};

function rigIntersectionPlotStyle(kind: RigIntersectionPlotPoint["plotKind"]): {
  fill: string;
  stroke: string;
  textFill: string;
} {
  switch (kind) {
    case "bodyFollow":
      return { fill: "#14b8a6", stroke: "#0f766e", textFill: "#0d9488" };
    case "warp":
      return { fill: "#3b82f6", stroke: "#1e3a8a", textFill: "#1d4ed8" };
    case "rigView":
      return { fill: "#e879f9", stroke: "#86198f", textFill: "#a21caf" };
    default:
      return { fill: "#64748b", stroke: "#334155", textFill: "#475569" };
  }
}

/** 袖丈・着丈の赤/紫ポリライン表示用の上限頂点 */
const MAX_MEASURE_POLYLINE_VERTICES = 24;

/** Apply 後は袖丈ポリラインの頂点が極端に多い。見た目用に間引く（端点は必ず残す） */
function subsamplePolylineForDisplay(pts: [number, number][], maxVertices: number): [number, number][] {
  if (pts.length <= maxVertices) return pts;
  const step = Math.ceil(pts.length / maxVertices);
  const out: [number, number][] = [];
  for (let j = 0; j < pts.length; j += step) out.push(pts[j]!);
  const last = pts[pts.length - 1]!;
  if (out[out.length - 1]![0] !== last[0] || out[out.length - 1]![1] !== last[1]) out.push(last);
  return out;
}

function vertexHighlightRoles(i: number, h: GenericVertexPlotHighlight | null | undefined): string[] {
  if (!h) return [];
  const roles: string[] = [];
  const pushIf = (label: string, range?: [number, number]) => {
    if (!range) return;
    const lo = Math.min(range[0], range[1]);
    const hi = Math.max(range[0], range[1]);
    if (i >= lo && i <= hi) roles.push(label);
  };
  pushIf("左・外腕", h.seamOuterLeft);
  pushIf("右・外腕", h.seamOuterRight);
  pushIf("左・脇〜袖付け", h.sleeveInnerLeft);
  pushIf("右・脇〜袖付け", h.sleeveInnerRight);
  pushIf("袖丈計測", h.sleeveMeasure);
  // 着丈計測区間は紫ポリラインのみ（頂点を緑ハイライトしない）
  return roles;
}

function mirroredSleeveMeasureRangeForPlot(
  data: CustomGarmentData,
  leftRange: [number, number]
): [number, number] | null {
  const topology = data.genericSymmetricTop?.lockedTopology ?? null;
  if (!topology) return null;
  return mirrorSleeveMeasureRangeToOppositeInner(
    data.pathDs,
    topology.sleeveInnerLeft,
    topology.sleeveInnerRight,
    leftRange
  );
}

function getCustomSleeveMeasureIndexRange(data: CustomGarmentData): [number, number] | null {
  const gt = data.genericSymmetricTop;
  if (
    gt?.sleeveMeasureVertexStart != null &&
    gt?.sleeveMeasureVertexEnd != null &&
    Number.isFinite(gt.sleeveMeasureVertexStart) &&
    Number.isFinite(gt.sleeveMeasureVertexEnd)
  ) {
    const a = Math.trunc(gt.sleeveMeasureVertexStart);
    const b = Math.trunc(gt.sleeveMeasureVertexEnd);
    return [Math.min(a, b), Math.max(a, b)];
  }
  const spec =
    data.presetId === "genericSymmetricTop"
      ? resolveGenericScalableSpec(data)
      : getScalableSpec(data.pathDs, data.presetId);
  const show = data.presetId === "genericSymmetricTop" && spec?.sleeveMeasureIndices;
  if (!show || !spec?.sleeveMeasureIndices) return null;
  const [a, b] = spec.sleeveMeasureIndices;
  return [Math.min(a, b), Math.max(a, b)];
}

function getCustomLengthMeasureIndexRange(data: CustomGarmentData): [number, number] | null {
  const gt = data.genericSymmetricTop;
  if (gt?.lengthMeasureVertexStart != null && gt?.lengthMeasureVertexEnd != null) {
    const a = Math.trunc(gt.lengthMeasureVertexStart);
    const b = Math.trunc(gt.lengthMeasureVertexEnd);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return [Math.min(a, b), Math.max(a, b)];
  }
  return null;
}

/** IIFE + `&&` 連鎖だと TS が `() => JSX.Element` と誤推論することがあるため関数に切り出す */
function sleeveMeasureOverlayNode(
  sd: ShoulderDebug,
  customGarmentData: CustomGarmentData
): ReactNode {
  const fromDebug = sd.sleeveMeasurePlotRange;
  let startIdx: number;
  let endIdx: number;
  if (fromDebug) {
    startIdx = Math.min(fromDebug[0], fromDebug[1]);
    endIdx = Math.max(fromDebug[0], fromDebug[1]);
  } else {
    const sleeveRange = getCustomSleeveMeasureIndexRange(customGarmentData);
    if (!sleeveRange) return null;
    [startIdx, endIdx] = sleeveRange;
  }
  const collectPts = (lo: number, hi: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = lo; i <= hi; i++) {
      const p = sd.garmentShoulderPoints[i];
      if (p) out.push(p);
    }
    return out;
  };
  const ptsL = collectPts(startIdx, endIdx);
  if (ptsL.length < 2) return null;

  let rLo: number;
  let rHi: number;
  let hasRight = false;
  if (sd.sleeveMeasurePlotRangeRight) {
    rLo = Math.min(sd.sleeveMeasurePlotRangeRight[0], sd.sleeveMeasurePlotRangeRight[1]);
    rHi = Math.max(sd.sleeveMeasurePlotRangeRight[0], sd.sleeveMeasurePlotRangeRight[1]);
    hasRight = true;
  } else {
    const mr = mirroredSleeveMeasureRangeForPlot(customGarmentData, [startIdx, endIdx]);
    if (mr) {
      rLo = Math.min(mr[0], mr[1]);
      rHi = Math.max(mr[0], mr[1]);
      hasRight = true;
    } else {
      rLo = 0;
      rHi = 0;
    }
  }
  const ptsR = hasRight ? collectPts(rLo, rHi) : [];
  const hasRightDraw = hasRight && ptsR.length >= 2;

  const ptsDrawL = subsamplePolylineForDisplay(ptsL, MAX_MEASURE_POLYLINE_VERTICES);
  const specSleeveCm = customGarmentData.size.sleeve;
  const titleSuffix = hasRightDraw ? ` · 右 #${rLo}〜#${rHi}` : "";
  return (
    <g>
      <path
        d={`M ${ptsDrawL.map(([x, y]) => `${x} ${y}`).join(" L ")}`}
        fill="none"
        stroke="#dc2626"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <title>{`袖丈計測 左 #${startIdx}〜#${endIdx}${titleSuffix} · 入力 ${specSleeveCm}cm（左右同 cm）`}</title>
      </path>
      {hasRightDraw ? (
        <path
          d={`M ${subsamplePolylineForDisplay(ptsR, MAX_MEASURE_POLYLINE_VERTICES).map(([x, y]) => `${x} ${y}`).join(" L ")}`}
          fill="none"
          stroke="#dc2626"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>{`袖丈計測 右 #${rLo}〜#${rHi} · 入力 ${specSleeveCm}cm（左右同 cm）`}</title>
        </path>
      ) : null}
    </g>
  );
}

function lengthMeasureOverlayNode(sd: ShoulderDebug, customGarmentData: CustomGarmentData): ReactNode {
  const fromDebug = sd.lengthMeasurePlotRange;
  let startIdx: number;
  let endIdx: number;
  if (fromDebug) {
    startIdx = Math.min(fromDebug[0], fromDebug[1]);
    endIdx = Math.max(fromDebug[0], fromDebug[1]);
  } else {
    const lr = getCustomLengthMeasureIndexRange(customGarmentData);
    if (!lr) return null;
    [startIdx, endIdx] = lr;
  }
  if (startIdx >= endIdx) return null;
  const pLo = sd.garmentShoulderPoints[startIdx];
  const pHi = sd.garmentShoulderPoints[endIdx];
  if (!pLo || !pHi) return null;
  const iTop = pLo[1] <= pHi[1] ? startIdx : endIdx;
  const iBot = pLo[1] <= pHi[1] ? endIdx : startIdx;
  const ptsOrdered: [number, number][] = [];
  if (iTop <= iBot) {
    for (let i = iTop; i <= iBot; i++) {
      const p = sd.garmentShoulderPoints[i];
      if (p) ptsOrdered.push(p);
    }
  } else {
    for (let i = iTop; i >= iBot; i--) {
      const p = sd.garmentShoulderPoints[i];
      if (p) ptsOrdered.push(p);
    }
  }
  if (ptsOrdered.length < 2) return null;
  const ptsDraw = subsamplePolylineForDisplay(ptsOrdered, MAX_MEASURE_POLYLINE_VERTICES);
  const specLengthCm = customGarmentData.size.length;
  const dbg = sd.lengthPathLengthDebug;
  const titleExtra =
    dbg != null ? ` · 画面上換算 ${dbg.cm.toFixed(1)}cm（|ΔY| ${dbg.px.toFixed(0)}px）` : "";
  return (
    <g>
      <path
        d={`M ${ptsDraw.map(([x, y]) => `${x} ${y}`).join(" L ")}`}
        fill="none"
        stroke="#7c3aed"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <title>{`着丈計測 #${startIdx}〜#${endIdx} · 入力 ${specLengthCm}cm${titleExtra}`}</title>
      </path>
    </g>
  );
}

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
  hideSleeveMeasureLine = false,
}: FittingCanvasPlotOverlayProps) {
  const debugKey = `shoulder-debug-${height}-${weight}-${garment}-${
    garment === "shirt" ? shirtSize : ""
  }`;

  if (!showGarmentPlot && !showBodyPlot) return null;

  return (
    <g key={debugKey} aria-hidden={true} pointerEvents={allowPointerEvents ? "auto" : "none"}>
      {/* モデル（ボディ）のプロット座標：輪郭全頂点 ＋ ランドマーク（腕山・肩）＋ 肩ライン */}
      {showBodyPlot && (
        <g data-overlay="body-plot">
          {/* ボディ輪郭：服と同様、連結順の各頂点に # を付与（間引きなし） */}
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
          {/* ランドマーク4点（大きめ＋ラベル） */}
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
      {/* 服のプロット：連結順の各頂点に # を付与（間引きなし。ハイライトは色・サイズのみ） */}
      {showGarmentPlot && sd !== null && (
        <g data-overlay="garment-plot">
          <g data-overlay="garment-plot-inner">
            {/* 肩インデックスを枠内の固定位置に常表示（何番かわかるように） */}
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
                  >
                    <title>
                      {isShoulder ? `肩基準点 #${i}${hlNote}` : `服の輪郭 #${i}${hlNote}`}
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
                  >
                    {`#${i}`}
                  </text>
                </g>
              );
            })}
            {/* 袖丈: 採寸オーバーレイ ON 時はそちらに一本化（ここは古い連結インデックスベースでズレる） */}
            {(() => {
              if (garment !== "custom" || !customGarmentData || hideSleeveMeasureLine) return null;
              return (
                <>
                  {sleeveMeasureOverlayNode(sd, customGarmentData)}
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
