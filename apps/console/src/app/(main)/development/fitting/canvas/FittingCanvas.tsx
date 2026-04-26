"use client";

import { useState } from "react";
import type {
  GarmentType,
  ShirtSize,
  JacketSize,
  CustomGarmentData,
  ShoulderDebug,
  GenericVertexPlotHighlight,
  PlotIndexLabelDensity,
} from "../lib/types";
import {
  getBodyIndentWaistGlobalIndices,
  getRigArmTiltHeightCm,
  type BodyModelVariant,
} from "../lib/bodyModelVariant";
import { useFittingCanvasData } from "./useFittingCanvasData";
import { shouldSuppressGarmentPathRender } from "../lib/pathUtils";
import { FittingCanvasPlotOverlay } from "./FittingCanvasPlotOverlay";
import { FittingCanvasMeasureOverlay } from "./FittingCanvasMeasureOverlay";
import { FittingCanvasSleeveDebugPanel } from "./FittingCanvasSleeveDebugPanel";
import { FittingCanvasRigAngleDiagram } from "./FittingCanvasRigAngleDiagram";
import { BODY_CX } from "../lib/constants";

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
  /** 開発のみ: 線画検証ボディ（4862 系 SVG 由来）。既定は mv_model */
  bodyModelVariant?: BodyModelVariant;
  /** アップロード SVG 内の「服のリグ（debugRigPathDs）」を描画する */
  rigGarmentEnabled?: boolean;
  /** 汎用フィット入力中の連結頂点範囲（服プロットを緑で強調） */
  genericVertexPlotHighlight?: GenericVertexPlotHighlight | null;
  /** 汎用トップの role 指定用: 服の path クリック */
  onCustomPathClick?: (pathIdx: number) => void;
  /** 服プロットの連結頂点 # をホバー（袖丈 r 入力用） */
  onGarmentVertexHover?: (globalVertexIndex: number | null) => void;
  /** true のとき服の輪郭 # にポインタを当ててホバーインデックスを送る */
  garmentVertexPickEnabled?: boolean;
  garmentVertexLinkPickActive?: boolean;
  onGarmentVertexLinkToggle?: (globalVertexIndex: number) => void;
  /** 連結 # テキストの間引き（頂点の円・ツールチップはそのまま） */
  plotIndexLabelDensity?: PlotIndexLabelDensity;
  /** 間引き時もホバー中の服 # を常に表示 */
  hoveredGarmentVertexIndex?: number | null;
  /** 服プロットで表示する連結 # のみ（null / 未指定で全頂点） */
  garmentPlotVertexFilter?: number[] | null;
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
  bodyModelVariant,
  rigGarmentEnabled = false,
  genericVertexPlotHighlight = null,
  onCustomPathClick,
  onGarmentVertexHover,
  garmentVertexPickEnabled = false,
  garmentVertexLinkPickActive = false,
  onGarmentVertexLinkToggle,
  plotIndexLabelDensity = "all",
  hoveredGarmentVertexIndex = null,
  garmentPlotVertexFilter = null,
}: FittingCanvasProps) {
  const {
    bodyPaths,
    rigLineWarpedPaths,
    rigLineWarpedRigViewPaths,
    viewBoxMinX,
    viewBoxWidth,
    viewBoxHeight,
    shirtPathD,
    jacketFill,
    jacketDetail,
    customPathDs,
    customPathStrokeDasharrays,
    customPathStrokeWidths,
    customPathStrokes,
    customRigPathDs,
    rigLandmarksDebug,
    shoulderDebug,
    bodyPlotPoints,
    bodyOutlinePoints,
    measureOverlay,
    rigArmAngleDebug,
    rigRedLineArmDiagram,
    bodyVertexDebugEntries,
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
    bodyModelVariant,
    genericVertexPlotHighlight,
  });

  const modelCenterX = BODY_CX;

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

  /** 服パス（シャツ／ジャケット／カスタム）— 塗りなし・線のみ */
  const garmentStroke = "rgba(45,45,45,0.82)";

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
    if (rigLandmarksDebug.rigRequirementWarnings?.length) {
      for (const line of rigLandmarksDebug.rigRequirementWarnings) {
        debugLines.push(line);
      }
    }
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

  const canvasDebugHudLines = showCanvasDebugHud
    ? bodyModelVariant === "lineArtVerification"
      ? [
          `検証ボディ: 腕チルト参照身長 ${getRigArmTiltHeightCm(bodyModelVariant, height)}cm（実${height}cm・170固定＝線画腕角）`,
          ...debugLines,
        ]
      : debugLines
    : [];

  return (
    <div className="relative flex w-full flex-col overflow-hidden bg-background">
      {canvasDebugHudLines.length > 0 ? (
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
          {canvasDebugHudLines.join("\n")}
        </div>
      ) : null}
      <div className="flex w-full justify-center px-1 py-0.5 sm:px-2 sm:py-1">
        <div
          className="mx-auto w-full max-w-[min(100%,min(760px,90vw))] max-h-[min(78dvh,800px)]"
          style={{ aspectRatio: `${viewBoxWidth} / ${viewBoxHeight}` }}
        >
          <svg
            viewBox={`${viewBoxMinX} 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="block h-full w-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
        <g fill="none" stroke="#bbb" strokeWidth={4} aria-hidden>
          {bodyPaths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {showGarment && garment === "shirt" && shirtPathD != null && (
          <g fill="none" stroke={garmentStroke} strokeWidth={8}>
            <path d={shirtPathD} />
          </g>
        )}
        {showGarment && garment === "jacket" && jacketFill != null && jacketDetail != null && (
          <g fill="none" stroke={garmentStroke} strokeWidth={8}>
            <path d={jacketFill} />
            <path d={jacketDetail} />
          </g>
        )}
        {showGarment &&
          garment === "custom" &&
          customPathDs.length > 0 &&
          customPathDs.map((d, i) =>
            shouldSuppressGarmentPathRender(d) ? (
              <g key={`custom-${i}-${height}-${weight}`} />
            ) : (
              <path
                key={`custom-${i}-${height}-${weight}`}
                fill="none"
                stroke={customPathStrokes[i] ?? garmentStroke}
                strokeWidth={customPathStrokeWidths[i] ?? 8}
                strokeDasharray={customPathStrokeDasharrays[i] ?? undefined}
                d={d}
                onClick={onCustomPathClick ? () => onCustomPathClick(i) : undefined}
                style={onCustomPathClick ? { cursor: "pointer" } : undefined}
              />
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
          bodyVertexDebugEntries={bodyVertexDebugEntries}
          bodyOutlinePoints={bodyOutlinePoints}
          bodyIndentWaist={getBodyIndentWaistGlobalIndices(bodyModelVariant)}
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
          garmentVertexLinkPickActive={garmentVertexLinkPickActive}
          onGarmentVertexLinkToggle={onGarmentVertexLinkToggle}
          plotIndexLabelDensity={plotIndexLabelDensity}
          hoveredGarmentVertexIndex={hoveredGarmentVertexIndex}
          garmentPlotVertexFilter={garmentPlotVertexFilter}
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
      <FittingCanvasSleeveDebugPanel show={showMeasureOverlay} garment={measureOverlay.garment} />
    </div>
  );
}
