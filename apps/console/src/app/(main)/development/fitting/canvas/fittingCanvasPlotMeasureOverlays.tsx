import type { ReactNode } from "react";
import type { CustomGarmentData, GenericVertexPlotHighlight, ShoulderDebug } from "../lib/types";
import {
  getCustomLengthMeasureIndexRange,
  getCustomSleeveMeasureIndexRange,
  MAX_MEASURE_POLYLINE_VERTICES,
  mirrorSleeveVertexChainForPlot,
  mirroredSleeveMeasureRangeForPlot,
  subsamplePolylineForDisplay,
} from "./fittingCanvasPlotOverlayUtils";

/** IIFE + `&&` 連鎖だと TS が `() => JSX.Element` と誤推論することがあるため関数に切り出す */
export function sleeveMeasureOverlayNode(
  sd: ShoulderDebug,
  customGarmentData: CustomGarmentData,
  genericVertexPlotHighlight?: GenericVertexPlotHighlight | null
): ReactNode {
  const chainGt = customGarmentData.genericSymmetricTop?.sleeveMeasureVertexChain;
  const chainHl = genericVertexPlotHighlight?.sleeveMeasureVertexChain;
  const chain = chainHl != null && chainHl.length >= 2 ? chainHl : chainGt;
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
  const collectPtsByIndices = (indices: number[]): [number, number][] => {
    const out: [number, number][] = [];
    for (const gi of indices) {
      const p = sd.garmentShoulderPoints[gi];
      if (p) out.push(p);
    }
    return out;
  };

  let ptsL: [number, number][];
  let titleLeft: string;
  if (chain != null && chain.length >= 2) {
    ptsL = collectPtsByIndices(chain);
    titleLeft = `#${chain.join(",#")}`;
  } else {
    ptsL = collectPts(startIdx, endIdx);
    titleLeft = `#${startIdx}〜#${endIdx}`;
  }
  if (ptsL.length < 2) return null;

  let rLo = 0;
  let rHi = 0;
  let hasRight = false;
  let ptsR: [number, number][] = [];
  if (sd.sleeveMeasurePlotRangeRight) {
    rLo = Math.min(sd.sleeveMeasurePlotRangeRight[0], sd.sleeveMeasurePlotRangeRight[1]);
    rHi = Math.max(sd.sleeveMeasurePlotRangeRight[0], sd.sleeveMeasurePlotRangeRight[1]);
    hasRight = true;
    ptsR = collectPts(rLo, rHi);
  } else if (chain != null && chain.length >= 2) {
    const rightChain = mirrorSleeveVertexChainForPlot(customGarmentData, chain);
    if (rightChain && rightChain.length >= 2) {
      ptsR = collectPtsByIndices(rightChain);
      rLo = Math.min(...rightChain);
      rHi = Math.max(...rightChain);
      hasRight = ptsR.length >= 2;
    }
  } else {
    const mr = mirroredSleeveMeasureRangeForPlot(customGarmentData, [startIdx, endIdx]);
    if (mr) {
      rLo = Math.min(mr[0], mr[1]);
      rHi = Math.max(mr[0], mr[1]);
      hasRight = true;
      ptsR = collectPts(rLo, rHi);
    } else {
      rLo = 0;
      rHi = 0;
    }
  }
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
        <title>{`袖丈計測 左 ${titleLeft}${titleSuffix} · 入力 ${specSleeveCm}cm（左右同 cm）`}</title>
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

export function lengthMeasureOverlayNode(sd: ShoulderDebug, customGarmentData: CustomGarmentData): ReactNode {
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
    dbg != null ? ` · 幾何数値 ${dbg.cm.toFixed(1)}cm（|ΔY| ${dbg.px.toFixed(0)}px）` : "";
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
        <title>{`着丈計測 #${startIdx}〜#${endIdx} · 入力値 ${specLengthCm}cm${titleExtra}`}</title>
      </path>
    </g>
  );
}
