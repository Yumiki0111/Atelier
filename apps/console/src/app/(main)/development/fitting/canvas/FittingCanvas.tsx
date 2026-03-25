"use client";

import { useEffect, useState } from "react";
import type {
  GarmentType,
  ShirtSize,
  JacketSize,
  CustomGarmentData,
  ShoulderDebug,
  GenericVertexPlotHighlight,
} from "../lib/types";
import { useFittingCanvasData } from "./useFittingCanvasData";
import { shouldSuppressGarmentPathRender } from "../lib/pathUtils";
import { FittingCanvasPlotOverlay } from "./FittingCanvasPlotOverlay";
import { FittingCanvasMeasureOverlay } from "./FittingCanvasMeasureOverlay";
import { FittingCanvasRigAngleDiagram } from "./FittingCanvasRigAngleDiagram";

export interface FittingCanvasProps {
  height: number;
  weight: number;
  garment: GarmentType;
  shirtSize: ShirtSize;
  jacketSize: JacketSize;
  customGarmentData: CustomGarmentData | null;
  animProgress: number;
  fromSize: ShirtSize | null;
  toSize: ShirtSize | null;
  fromCustomGarmentData?: CustomGarmentData | null;
  toCustomGarmentData?: CustomGarmentData | null;
  showGarment?: boolean;
  showMeasureOverlay?: boolean;
  showPlotCoords?: boolean;
  showBodyPlotCoords?: boolean;
  /** 肩リグの「胴体水平 ↔ 上腕」のなす角を教科書風に SVG 上へリアルタイム表示 */
  showRigAngleDiagram?: boolean;
  /** model+rig.svg のボディ輪郭（rig 混ざり）を使う */
  rigBodyEnabled?: boolean;
  /** アップロード SVG 内の「服のリグ（debugRigPathDs）」を描画する */
  rigGarmentEnabled?: boolean;
  /** 左パネルで肩インデックスを表示・編集するため */
  onShoulderDebugChange?: (debug: ShoulderDebug | null) => void;
  /** 汎用フィット入力中の連結頂点範囲（服プロットを緑で強調。着丈区間は紫線のみ） */
  genericVertexPlotHighlight?: GenericVertexPlotHighlight | null;
  /** 汎用トップの role 指定用: 服の path クリック */
  onCustomPathClick?: (pathIdx: number) => void;
  /** 服プロットの連結頂点 # をホバー（袖丈 r 入力用） */
  onGarmentVertexHover?: (globalVertexIndex: number | null) => void;
  /** true のとき服の輪郭 # にポインタを当ててホバーインデックスを送る */
  garmentVertexPickEnabled?: boolean;
}

export function FittingCanvas({
  height,
  weight,
  garment,
  shirtSize,
  jacketSize = "4",
  customGarmentData,
  animProgress,
  fromSize,
  toSize,
  fromCustomGarmentData = null,
  toCustomGarmentData = null,
  showGarment = true,
  showMeasureOverlay = false,
  showPlotCoords = true,
  showBodyPlotCoords = false,
  showRigAngleDiagram = false,
  rigBodyEnabled = false,
  rigGarmentEnabled = false,
  onShoulderDebugChange,
  genericVertexPlotHighlight = null,
  onCustomPathClick,
  onGarmentVertexHover,
  garmentVertexPickEnabled = false,
}: FittingCanvasProps) {
  const modelCenterX = 752.5;
  const {
    bodyPaths,
    rigLineWarpedPaths,
    rigLineWarpedRigViewPaths,
    viewBoxHeight,
    shirtPathD,
    jacketFill,
    jacketDetail,
    customPathDs,
    customRigPathDs,
    rigLandmarksDebug,
    shoulderDebug,
    bodyPlotPoints,
    bodyOutlinePoints,
    measureOverlay,
    rigArmAngleDebug,
    rigRedLineArmDiagram,
    rigIntersectionPlotPoints,
  } = useFittingCanvasData({
    height,
    weight,
    garment,
    shirtSize,
    jacketSize,
    customGarmentData,
    animProgress,
    fromSize,
    toSize,
    fromCustomGarmentData,
    toCustomGarmentData,
    rigBodyEnabled,
    genericVertexPlotHighlight,
  });

  useEffect(() => {
    onShoulderDebugChange?.(shoulderDebug);
  }, [shoulderDebug, onShoulderDebugChange]);

  const [showCanvasDebugHud] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("DEBUG_FITTING_CANVAS") === "1";
    } catch {
      return false;
    }
  });

  const garmentCenterX = measureOverlay.garment?.hemCenter?.[0];
  const centerDeltaPx =
    garmentCenterX != null ? garmentCenterX - modelCenterX : null;

  const debugLines: string[] = [];
  if (rigGarmentEnabled && garment === "custom") {
    debugLines.push(
      `customRigPathDs: ${customRigPathDs.length} | rig place: ${
        rigLandmarksDebug?.useRigLandmarksForPlacement ? "rigLm" : "lm"
      }`
    );
  }
  if (garment === "custom" && rigLandmarksDebug) {
    debugLines.push(
      `inferRig: ${rigLandmarksDebug.inferredFromRig ? "ok" : "null"} | applied: ${
        rigLandmarksDebug.genericApplied == null ? "—" : rigLandmarksDebug.genericApplied ? "on" : "off"
      }`
    );
    debugLines.push(
      `rig(Y): ${rigLandmarksDebug.rigShoulderY?.toFixed(1) ?? "—"}/${rigLandmarksDebug.rigHemY?.toFixed(1) ?? "—"} | lm(Y): ${
        rigLandmarksDebug.usedShoulderY?.toFixed(1) ?? "—"
      }/${rigLandmarksDebug.usedHemY?.toFixed(1) ?? "—"} | place:${
        rigLandmarksDebug.useRigLandmarksForPlacement ? "rigLm" : "lm"
      }`
    );
  }
  if (rigBodyEnabled) {
    debugLines.push(
      `rig paths: 計算=${rigLineWarpedPaths.length} · 表示(基準リグ相似)=${rigLineWarpedRigViewPaths.length}`
    );
    debugLines.push(
      `body赤リグ(肩:腕1/2・鎖骨5/6): ${rigRedLineArmDiagram != null ? "ok" : "—"}`
    );
  }
  if (centerDeltaPx != null) {
    debugLines.push(`中心差: ${centerDeltaPx >= 0 ? "+" : ""}${centerDeltaPx.toFixed(1)}px`);
  }

  return (
    <div className="relative flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-lg border border-gray-200 bg-white p-4">
      {debugLines.length > 0 && showCanvasDebugHud ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            whiteSpace: "pre",
            fontFamily: "monospace",
            fontWeight: 900,
            fontSize: 12,
            color: "#111827",
            textShadow: "0 0 2px rgba(255,255,255,0.95)",
            pointerEvents: "none",
            lineHeight: "1.1",
          }}
        >
          {debugLines.join("\n")}
        </div>
      ) : null}
      <div className="relative w-full max-w-[300px]">
        <svg
          viewBox={`0 0 1505 ${viewBoxHeight}`}
          className="h-auto w-full max-w-[300px] overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
        <g fill="none" stroke="#bbb" strokeWidth={4} aria-hidden>
          {bodyPaths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {showGarment && garment === "shirt" && shirtPathD != null && (
          <g
            fill="rgba(100,140,220,0.12)"
            stroke="rgba(60,100,200,0.8)"
            strokeWidth={8}
          >
            <path d={shirtPathD} />
          </g>
        )}
        {showGarment && garment === "jacket" && jacketFill != null && jacketDetail != null && (
          <g fill="rgba(100,140,220,0.12)" stroke="rgba(60,100,200,0.8)" strokeWidth={8}>
            <path d={jacketFill} />
            <path d={jacketDetail} fill="none" />
          </g>
        )}
        {showGarment &&
          garment === "custom" &&
          customPathDs.length > 0 &&
          customPathDs.map((d, i) =>
            shouldSuppressGarmentPathRender(d) ? (
              <g key={`custom-${i}-${height}-${weight}`} />
            ) : (
              <g
                key={`custom-${i}-${height}-${weight}`}
                fill="rgba(100,140,220,0.12)"
                stroke="rgba(60,100,200,0.8)"
                strokeWidth={8}
              >
                <path
                  d={d}
                  onClick={onCustomPathClick ? () => onCustomPathClick(i) : undefined}
                  style={onCustomPathClick ? { cursor: "pointer" } : undefined}
                />
              </g>
            )
          )}

        {rigGarmentEnabled && garment === "custom" && customRigPathDs.length > 0 && (
          <g fill="none" stroke="#ef4444" strokeWidth={7} opacity={0.65} aria-hidden>
            {customRigPathDs.map((d, i) => (
              <path key={`custom-rig-${i}`} d={d} />
            ))}
          </g>
        )}

        {rigBodyEnabled && (
          <g fill="none" stroke="#ef4444" strokeWidth={3} opacity={0.95} aria-hidden>
            {(rigLineWarpedRigViewPaths.length > 0
              ? rigLineWarpedRigViewPaths
              : rigLineWarpedPaths
            ).map((d, i) => (
              <path key={`rig-line-${i}`} d={d} />
            ))}
          </g>
        )}

        {/* debug text moved to the end of SVG so it won't be covered by other overlays */}
        {/* デバッグ用中心線: 黒=モデル中心、赤=服の中心 */}
        <line x1={modelCenterX} y1={0} x2={modelCenterX} y2={viewBoxHeight} stroke="black" strokeWidth={2} strokeDasharray="10 6" opacity={0.6} />
        {(rigBodyEnabled || rigGarmentEnabled) && measureOverlay.garment?.hemCenter && (
          <line
            x1={measureOverlay.garment.hemCenter[0]}
            y1={0}
            x2={measureOverlay.garment.hemCenter[0]}
            y2={viewBoxHeight}
            stroke="red"
            strokeWidth={2}
            strokeDasharray="10 6"
            opacity={0.7}
          />
        )}
        {/* centerDeltaPx is included in the top-left debug block */}
        <FittingCanvasPlotOverlay
          showGarmentPlot={showPlotCoords}
          showBodyPlot={showBodyPlotCoords}
          bodyPlotPoints={bodyPlotPoints}
          rigIntersectionPlotPoints={rigIntersectionPlotPoints}
          bodyOutlinePoints={bodyOutlinePoints}
          shoulderDebug={shoulderDebug}
          height={height}
          weight={weight}
          garment={garment}
          shirtSize={shirtSize}
          customGarmentData={customGarmentData}
          genericVertexPlotHighlight={genericVertexPlotHighlight}
          allowPointerEvents={garmentVertexPickEnabled}
          onGarmentVertexHover={onGarmentVertexHover}
          garmentVertexPickEnabled={garmentVertexPickEnabled}
        />
        {showRigAngleDiagram ? (
          <FittingCanvasRigAngleDiagram
            debug={rigArmAngleDebug}
            rigRedLineArmDiagram={rigRedLineArmDiagram}
            bodyShoulderL={shoulderDebug?.bodyShoulderContour?.[0] ?? null}
            bodyShoulderR={
              shoulderDebug != null &&
              shoulderDebug.bodyShoulderContour.length >= 2
                ? shoulderDebug.bodyShoulderContour[shoulderDebug.bodyShoulderContour.length - 1]!
                : null
            }
          />
        ) : null}
        <FittingCanvasMeasureOverlay
          show={showMeasureOverlay}
          measureOverlay={measureOverlay}
          height={height}
        />
        </svg>
      </div>
    </div>
  );
}
