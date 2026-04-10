"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type {
  GarmentType,
  ShirtSize,
  JacketSize,
  CustomGarmentData,
  ShoulderDebug,
  GenericVertexPlotHighlight,
} from "../lib/types";
import { calcFitFromSize, jacketFitLabel, shirtFitLabel } from "../lib/fitCalc";
import { measureSleeveLengthFromPath, vertexRangeToCoveringPathRange } from "../lib/pathUtils";
import { appendSleeveMeasureVertexWithR, parseLineRangeInput, parseSleeveMeasureVertexInput } from "../generic";
import { FittingControlsCustomPanels } from "./FittingControlsCustomPanels";
import { FittingControlsPathCatalogPanel } from "./FittingControlsPathCatalogPanel";
import { FittingControlsSvgUploadSection } from "./FittingControlsSvgUploadSection";
import { DevPanelSection, PanelSwitchRow } from "./FittingControlsUI";
import { useFittingControlsGenericDraftSync } from "./useFittingControlsGenericDraftSync";

interface FittingControlsProps {
  height: number;
  weight: number;
  garment: GarmentType;
  shirtSize: ShirtSize;
  jacketSize: JacketSize;
  customGarmentData: CustomGarmentData | null;
  showGarment: boolean;
  showMeasureOverlay: boolean;
  showPlotCoords: boolean;
  showBodyPlotCoords: boolean;
  showRigAngleDiagram: boolean;
  rigBodyEnabled: boolean;
  rigGarmentEnabled: boolean;
  /** キャンバス計算の肩デバッグ（カスタム服の連結頂点インデックス表示用） */
  shoulderDebug: ShoulderDebug | null;
  onHeightChange: (v: number) => void;
  onWeightChange: (v: number) => void;
  onGarmentChange: (g: GarmentType) => void;
  onShirtSizeChange: (s: ShirtSize) => void;
  onJacketSizeChange: (s: JacketSize) => void;
  onCustomGarmentApply: (data: CustomGarmentData) => void;
  onToggleGarment: () => void;
  onToggleMeasureOverlay: () => void;
  onTogglePlotCoords: () => void;
  onToggleBodyPlotCoords: () => void;
  onToggleRigAngleDiagram: () => void;
  onToggleRigBody: () => void;
  onToggleRigGarment: () => void;
  /** 汎用フィットの入力範囲を服プロットで緑表示するため（着丈区間は除く） */
  onGenericVertexPlotHighlightChange?: (highlight: GenericVertexPlotHighlight | null) => void;
  /** 服プロット上でホバー中の連結頂点 #（袖丈 r 入力用） */
  hoveredGarmentVertexIndex?: number | null;
  /** 開発ページレイアウト用（下バー時は w-full など） */
  className?: string;
}

export function FittingControls({
  height,
  weight,
  garment,
  shirtSize,
  jacketSize = "4",
  customGarmentData,
  showGarment,
  showMeasureOverlay,
  showPlotCoords,
  showBodyPlotCoords,
  showRigAngleDiagram,
  rigBodyEnabled,
  rigGarmentEnabled,
  shoulderDebug,
  onHeightChange,
  onWeightChange,
  onGarmentChange,
  onShirtSizeChange,
  onJacketSizeChange,
  onCustomGarmentApply,
  onToggleGarment,
  onToggleMeasureOverlay,
  onTogglePlotCoords,
  onToggleBodyPlotCoords,
  onToggleRigAngleDiagram,
  onToggleRigBody,
  onToggleRigGarment,
  onGenericVertexPlotHighlightChange,
  hoveredGarmentVertexIndex = null,
  className,
}: FittingControlsProps) {
  const isGenericTopActive = customGarmentData?.presetId === "genericSymmetricTop";
  const hasUploadedGenericSvg =
    isGenericTopActive && customGarmentData != null && customGarmentData.pathDs.length > 0;

  const {
    genericDraft,
    setGenericDraft,
    measureVertexRangeSectionFocusedRef,
    flushMeasureVertexDraftToParent,
    presetSizeKey,
  } = useFittingControlsGenericDraftSync({
      isGenericTopActive,
      customGarmentData,
      jacketSize,
      onCustomGarmentApply,
      onGenericVertexPlotHighlightChange,
    });

  useEffect(() => {
    if (!showPlotCoords || hoveredGarmentVertexIndex == null || !isGenericTopActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "r" && e.key !== "R") return;
      if (e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const hi = hoveredGarmentVertexIndex;
      if (hi == null || !Number.isFinite(hi)) return;
      e.preventDefault();
      setGenericDraft((p) => {
        const next = appendSleeveMeasureVertexWithR(p.sleeveMeasureRange, hi);
        const parsed = parseSleeveMeasureVertexInput(next);
        const degeneratePair = parsed != null && parsed[0] === parsed[1];
        return {
          ...p,
          sleeveMeasureRange: next,
          sleeveMeasureVertexStart: parsed && !degeneratePair ? parsed[0] : undefined,
          sleeveMeasureVertexEnd: parsed && !degeneratePair ? parsed[1] : undefined,
        };
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPlotCoords, hoveredGarmentVertexIndex, isGenericTopActive, setGenericDraft]);

  const fit = calcFitFromSize(height, weight, customGarmentData?.size ?? null);
  const fitLabel =
    garment === "shirt" ? shirtFitLabel(fit.chestDiff) : jacketFitLabel(fit.chestDiff);
  const sizeSpec = customGarmentData?.size ?? null;

  return (
    <div
      className={cn(
        "flex min-h-0 max-h-full w-[min(17rem,100%)] shrink-0 flex-col gap-4 overflow-y-auto py-1 text-[12px]",
        className
      )}
    >
      <header className="shrink-0 border-b border-slate-200/80 pb-2">
        <h1 className="text-sm font-bold tracking-tight text-slate-900">フィット検証</h1>
        <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
          参照 SVG を読み込み、採寸は数値入力・パス一覧で商品に合わせてください。
        </p>
      </header>

      <DevPanelSection title="体型">
        <div className="space-y-3">
          <div>
            <label className="flex items-baseline justify-between text-[11px] text-slate-600">
              <span>身長</span>
              <span className="font-semibold tabular-nums text-slate-900">{height} cm</span>
            </label>
            <input
              type="range"
              min={150}
              max={195}
              value={height}
              step={1}
              onChange={(e) => onHeightChange(+e.target.value)}
              className="mt-1.5 h-2 w-full cursor-pointer accent-sky-600"
            />
          </div>
          <div>
            <label className="flex items-baseline justify-between text-[11px] text-slate-600">
              <span>体重</span>
              <span className="font-semibold tabular-nums text-slate-900">{weight} kg</span>
            </label>
            <input
              type="range"
              min={40}
              max={100}
              value={weight}
              step={1}
              onChange={(e) => onWeightChange(+e.target.value)}
              className="mt-1.5 h-2 w-full cursor-pointer accent-slate-600"
            />
          </div>
        </div>
      </DevPanelSection>

      <FittingControlsSvgUploadSection
        hasUploadedGenericSvg={hasUploadedGenericSvg}
        presetSizeKey={presetSizeKey}
        onGarmentChange={onGarmentChange}
        onCustomGarmentApply={onCustomGarmentApply}
      />

      <DevPanelSection title="採寸・フィット">
        <div className="text-[11px] leading-snug text-slate-600">
        {sizeSpec && (
          <>
            <b className="text-gray-800">
              {hasUploadedGenericSvg ? "カスタム SVG の採寸" : "採寸（入力値）"}
            </b>
            <table className="my-0.5 w-full border-collapse text-[11px]">
              <tbody>
                <tr className="text-gray-400">
                  <td>着丈(A)</td>
                  <td>肩幅(B)</td>
                  <td>身幅(C)</td>
                  <td>袖丈(D)</td>
                </tr>
                <tr>
                  <td>
                    <b>{sizeSpec.length}cm</b>
                  </td>
                  <td>
                    <b>{sizeSpec.shoulder}cm</b>
                  </td>
                  <td>
                    <b>{sizeSpec.chest}cm</b>
                  </td>
                  <td>
                    <b>{sizeSpec.sleeve}cm</b>
                    {customGarmentData?.pathDs && customGarmentData.landmarks && (() => {
                      const lm = customGarmentData.landmarks;
                      const refLength = 75.0;
                      const pxPerCm = (lm.hemY - lm.shoulderY) / (sizeSpec?.length ?? refLength) || 34.3;
                      const innerRange = parseLineRangeInput(genericDraft.sleeveInnerLeft);
                      const sleevePathIdx = innerRange
                        ? vertexRangeToCoveringPathRange(
                            customGarmentData.pathDs,
                            innerRange[0],
                            innerRange[1]
                          )?.from
                        : undefined;
                      const sleevePath =
                        typeof sleevePathIdx === "number" &&
                        Number.isFinite(sleevePathIdx) &&
                        customGarmentData.pathDs[sleevePathIdx]
                          ? customGarmentData.pathDs[sleevePathIdx]
                          : null;
                      if (!sleevePath) return null;
                      const measured = measureSleeveLengthFromPath(sleevePath, lm.shoulderY, pxPerCm);
                      return measured > 0 ? ` (計測: ${measured.toFixed(1)}cm)` : null;
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
            {garment === "custom" && (sizeSpec.length < 40 || sizeSpec.length > 95) && (
              <p className="mt-1 text-[10px] text-amber-700">
                着丈が通常範囲外です。採寸表の列順（着丈・肩幅・身幅・袖丈）を確認してください。
              </p>
            )}
            <div className="h-2 shrink-0" aria-hidden />
            <span className="text-gray-400">推定胸囲</span> <b>{fit.estChest}cm</b>
            <br />
            <span className="text-gray-400">胸のゆとり（身幅×2−推定胸囲）</span>{" "}
            <b
              className={
                fitLabel === "tight"
                  ? "text-red-600"
                  : fitLabel === "ok"
                    ? "text-green-600"
                    : "text-blue-600"
              }
            >
              約 {fit.chestDiff > 0 ? "+" : ""}
              {Math.round(fit.chestDiff * 10) / 10}cm
            </b>
            {garment === "custom" && (
              <>
                <br />
                <span className="text-gray-400">着丈差分</span>{" "}
                <b>
                  {fit.hemDiff > 0 ? "+" : ""}
                  {fit.hemDiff}cm
                </b>
              </>
            )}
            <div
              className={cn(
                "mt-3 rounded-md px-2 py-2 text-center text-[11px] font-bold",
                fitLabel === "tight" && "bg-red-50 text-red-700",
                fitLabel === "ok" && "bg-emerald-50 text-emerald-800",
                fitLabel === "loose" && "bg-sky-50 text-sky-800"
              )}
            >
              {fitLabel === "tight" && "きつめ"}
              {fitLabel === "ok" && "ちょうどいい"}
              {fitLabel === "loose" && "ゆったり"}
            </div>
            <p className="mt-2 rounded-md bg-slate-800 px-2 py-1.5 text-[10px] leading-snug text-slate-100">
              数値は推定です。素材の伸縮性により、実際の着用感と異なる場合があります。
            </p>
          </>
        )}
        {!sizeSpec && (
          <p className="text-[11px] leading-snug text-slate-500">
            採寸（着丈・肩・身幅・袖）を入力すると、胸のゆとりとざっくりした体感を表示します。
          </p>
        )}
        </div>
      </DevPanelSection>

      {garment === "custom" && customGarmentData ? (
        <FittingControlsCustomPanels
          customGarmentData={customGarmentData}
          onCustomGarmentApply={onCustomGarmentApply}
          height={height}
          weight={weight}
          shirtSize={shirtSize}
          jacketSize={jacketSize}
        />
      ) : null}

      {isGenericTopActive && customGarmentData && customGarmentData.pathDs.length > 0 ? (
        <FittingControlsPathCatalogPanel
          showMeasureVertexControls={isGenericTopActive}
          genericDraft={genericDraft}
          setGenericDraft={setGenericDraft}
          measureVertexRangeSectionFocusedRef={measureVertexRangeSectionFocusedRef}
          flushMeasureVertexDraftToParent={flushMeasureVertexDraftToParent}
          hoveredGarmentVertexIndex={hoveredGarmentVertexIndex}
        />
      ) : null}

      <details className="group rounded-lg border border-slate-200/80 bg-slate-50/40 [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none px-2 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100/60">
          <span className="mr-1 inline-block text-slate-400 transition-transform group-open:rotate-90">▶</span>
          表示・オーバーレイ・リグ（開発用）
        </summary>
        <div className="border-t border-slate-200/60 px-2 pb-2 pt-1">
          <div className="flex flex-col gap-0.5">
            <PanelSwitchRow
              id="dev-fit-show-garment"
              label="服の表示"
              checked={showGarment}
              onToggle={onToggleGarment}
            />
            <PanelSwitchRow
              id="dev-fit-measure-overlay"
              label="採寸オーバーレイ"
              checked={showMeasureOverlay}
              onToggle={onToggleMeasureOverlay}
            />
            <PanelSwitchRow
              id="dev-fit-plot-garment"
              label="服のプロット"
              checked={showPlotCoords}
              onToggle={onTogglePlotCoords}
            />
            <PanelSwitchRow
              id="dev-fit-plot-body"
              label="モデルのプロット"
              checked={showBodyPlotCoords}
              onToggle={onToggleBodyPlotCoords}
            />
            <PanelSwitchRow
              id="dev-fit-rig-angle-diagram"
              label="肩リグ角度（図）"
              checked={showRigAngleDiagram}
              onToggle={onToggleRigAngleDiagram}
            />
            <PanelSwitchRow
              id="dev-fit-show-rig-body"
              label="リグボディ"
              checked={rigBodyEnabled}
              onToggle={onToggleRigBody}
            />
            <PanelSwitchRow
              id="dev-fit-show-rig-garment"
              label="服のリグ"
              checked={rigGarmentEnabled}
              onToggle={onToggleRigGarment}
            />
          </div>
          <p className="mt-2 text-[10px] leading-snug text-slate-400">
            コンソール:{" "}
            <code className="rounded bg-slate-100 px-0.5 font-mono text-[9px]">DEBUG_FITTING_MEASURE</code>
            （開発ビルドのみ。本番ではログ出力なし）/{" "}
            <code className="rounded bg-slate-100 px-0.5 font-mono text-[9px]">DEBUG_FITTING_CANVAS</code> /{" "}
            <code className="rounded bg-slate-100 px-0.5 font-mono text-[9px]">DEBUG_RIG_ARM</code>
          </p>
        </div>
      </details>
    </div>
  );
}
