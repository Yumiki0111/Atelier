"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFittingCanvasData } from "@/app/(main)/development/fitting/canvas/useFittingCanvasData";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import { resolveCustomSvgPathRenderablePaint } from "@/app/(main)/development/fitting/customGarment/resolveCustomSvgPathRenderablePaint";
import {
  GRADING_V4_GRID_BODY_SILHOUETTE_STROKE,
  gradingV4GridBodyPathEndsClosed,
  gradingV4UsesLayeredGridBodySilhouette,
} from "@/app/(main)/development/fitting/gradingV4/gradingV4Constants";
import { landmarksEqual, pathDsContentEqual, sizeEqual } from "@/app/(main)/development/fitting/lib/fittingStateUtils";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { applyWidgetSizeToCustomGarmentData } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import {
  buildWidgetFitEaseDiagramFromSnapshot,
} from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import { buildWidgetFitEaseSummaryFromSnapshot } from "@/lib/widget-fit/computeWidgetFitEaseSummary";
import { resolveWidgetFitChestBandMode } from "@/app/(main)/development/fitting/lib/fitCalc";
import {
  orderedSizeLabelsFromCustomGarment,
  resolveOrderedSizeKeysForBand,
} from "@/lib/widget-fit/widgetFitChestBandOrdinal";
import { GradingV4EditorMirrorPreview } from "@/features/preview/GradingV4EditorMirrorPreview";
import { WidgetFitEaseDiagramSvg } from "@/features/preview/WidgetFitEaseDiagramSvg";
import { weightKgFromBodyVal } from "@Atelier/shared";
import { cn } from "@/lib/utils";
import { usePreviewChromeTheme } from "./WidgetPreviewChromeTheme";
import {
  GARMENT_FILL,
  PREVIEW_JACKET_SIZE,
  PREVIEW_SHIRT_SIZE,
  PREVIEW_SIZE_ANIM_MS,
} from "./widget-style-product-preview-fit-constants";
import { PreviewFitEaseFootnote, PreviewFitEaseSummary } from "./widget-style-product-preview-fit-ease-ui";
import { useFitSvgStage } from "./widget-style-product-preview-fit-svg-stage";
import { bodySheetPreviewHeightScale } from "./widget-style-product-preview-viewbox-helpers";

export function PreviewFittingCanvasSvg({
  fitHeightCm,
  fitBodyVal,
  currentSize,
  customGarmentData,
  orderedSizeKeys = [],
  fitChestBandCategory = null,
  bodyOnly = false,
  bodySheetHeightScale = false,
  fitEaseRevealNonce = 0,
  embedSplashSuspended = false,
  embeddedWidgetUi = false,
}: {
  fitHeightCm: number;
  fitBodyVal: number;
  currentSize: string;
  customGarmentData: CustomGarmentData;
  /** 小→大。未指定は `sizePresets` 順 */
  orderedSizeKeys?: string[];
  /** `products.category` 相当。未指定はジャケット基準のしきい値 */
  fitChestBandCategory?: string | null;
  /** 体型調整シートなど：体型ラインのみ（服パスを描かない） */
  bodyOnly?: boolean;
  /** 体型変更オーバーレイ：身長に応じて表示を拡大（`meet` による見かけの縮小を補う） */
  bodySheetHeightScale?: boolean;
  /** 増やすたびに図解・胸バンド文言の段階表示をやり直す（体型適用など） */
  fitEaseRevealNonce?: number;
  /** 親ウィジェットのスプラッシュ中は図解・脚注の段階表示を保留 */
  embedSplashSuspended?: boolean;
  /**
   * フォン枠プレビュー（埋め込み iframe とコンソールのウィジェットデザインプレビュー共通）向け:
   * SVG ブロックに縦上限（max-h 88%/94%）を付け、はみ出しを防ぐ。
   */
  embeddedWidgetUi?: boolean;
}) {
  const { bodyStroke, garmentStroke, surfaceBackground: canvasSurfaceBackground } = usePreviewChromeTheme().canvas;
  const isGradingV4 = customGarmentData.presetId === "gradingV4";
  const previewBodyStroke = isGradingV4 ? GRADING_V4_GRID_BODY_SILHOUETTE_STROKE : bodyStroke;
  const previewGarmentStrokeFallback = isGradingV4 ? "rgba(45,45,45,0.9)" : garmentStroke;
  const previewGarmentDefaultStrokeWidth = 1;
  const sizedTarget = useMemo(
    () => applyWidgetSizeToCustomGarmentData(customGarmentData, currentSize),
    [customGarmentData, currentSize]
  );

  const [animProgress, setAnimProgress] = useState(1);
  const [fromCustom, setFromCustom] = useState<CustomGarmentData | null>(null);
  const [toCustom, setToCustom] = useState<CustomGarmentData | null>(null);
  const sizeCommittedRef = useRef<string | null>(null);
  const animRunIdRef = useRef(0);
  const startRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    sizeCommittedRef.current = null;
  }, [customGarmentData]);

  useLayoutEffect(() => {
    if (sizeCommittedRef.current === null) {
      sizeCommittedRef.current = currentSize;
      setAnimProgress(1);
      setFromCustom(null);
      setToCustom(null);
      return;
    }
    if (currentSize === sizeCommittedRef.current) {
      return;
    }
    const fromSized = applyWidgetSizeToCustomGarmentData(customGarmentData, sizeCommittedRef.current);
    const toSized = applyWidgetSizeToCustomGarmentData(customGarmentData, currentSize);
    const sizeOrLandmarksChanged =
      !sizeEqual(fromSized.size, toSized.size) || !landmarksEqual(fromSized.landmarks, toSized.landmarks);
    /** Grading v4 ミラーは平置き cm の lerp で滑らかにする。pathDs がサイズごとに違っても従来のアニメ分岐に乗せる */
    const animateGradingV4Mirror =
      customGarmentData.presetId === "gradingV4" && sizeOrLandmarksChanged;
    const animateSamePathsDifferentMeasure =
      pathDsContentEqual(fromSized.pathDs, toSized.pathDs) && sizeOrLandmarksChanged;

    if (animateGradingV4Mirror || animateSamePathsDifferentMeasure) {
      setFromCustom(fromSized);
      setToCustom(toSized);
      setAnimProgress(0);
      startRef.current = null;
    } else {
      sizeCommittedRef.current = currentSize;
      setAnimProgress(1);
      setFromCustom(null);
      setToCustom(null);
    }
  }, [customGarmentData, currentSize]);

  /**
   * `animProgress` を依存に入れると毎フレーム effect が再実行され、
   * cleanup の cancelAnimationFrame が **チェーンした次フレーム** を潰してカクつく。
   * from/to が揃ったときだけ 1 本の RAF チェーンを走らせ、runId で打ち切る。
   */
  useEffect(() => {
    if (fromCustom == null || toCustom == null) return;

    const runId = ++animRunIdRef.current;
    startRef.current = null;

    const step = (ts: number) => {
      if (runId !== animRunIdRef.current) return;
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const next = Math.min(elapsed / PREVIEW_SIZE_ANIM_MS, 1);
      setAnimProgress(next);
      if (next < 1) {
        requestAnimationFrame(step);
      } else {
        sizeCommittedRef.current = currentSize;
        setFromCustom(null);
        setToCustom(null);
      }
    };

    const id = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(id);
      animRunIdRef.current += 1;
    };
  }, [fromCustom, toCustom, currentSize]);

  const snap = useFittingCanvasData({
    height: fitHeightCm,
    weight: weightKgFromBodyVal(fitBodyVal),
    garment: "custom",
    shirtSize: PREVIEW_SHIRT_SIZE,
    jacketSize: PREVIEW_JACKET_SIZE,
    customGarmentData: sizedTarget,
    animProgress,
    fromSize: null,
    toSize: null,
    fromCustomGarmentData: fromCustom,
    toCustomGarmentData: toCustom,
    rigBodyEnabled: false,
    bodyModelVariant: sizedTarget.bodyModelVariant,
  });
  const weightKg = weightKgFromBodyVal(fitBodyVal);
  const fitChestBandMode = useMemo(
    () => resolveWidgetFitChestBandMode(fitChestBandCategory),
    [fitChestBandCategory]
  );
  const bandOrdinalKeys = useMemo(
    () => resolveOrderedSizeKeysForBand(orderedSizeLabelsFromCustomGarment(customGarmentData), orderedSizeKeys, currentSize),
    [customGarmentData, orderedSizeKeys, currentSize]
  );
  const fitEaseSummary = useMemo(
    () =>
      buildWidgetFitEaseSummaryFromSnapshot(snap, weightKg, {
        fitChestBandMode,
        customGarmentData: sizedTarget,
        heightCm: bandOrdinalKeys != null ? fitHeightCm : undefined,
        orderedSizeKeys: bandOrdinalKeys ?? undefined,
        currentSize: bandOrdinalKeys != null ? currentSize : undefined,
      }),
    [snap, weightKg, fitChestBandMode, sizedTarget, fitHeightCm, bandOrdinalKeys, currentSize]
  );
  const fitEaseDiagram = useMemo(
    () => buildWidgetFitEaseDiagramFromSnapshot(snap, fitEaseSummary),
    [snap, fitEaseSummary]
  );
  /** パス・採寸オーバーレイと同じ `snap.viewBoxHeight`（身長＋体重の yScale）。ここをずらすと図解が viewBox 外に出る。 */
  const viewBoxH = snap.viewBoxHeight;
  const gradingBehindN =
    !bodyOnly && sizedTarget.presetId === "gradingV4" ? snap.gradingV4BehindBodyPathCount : 0;

  const sheetScale = bodySheetHeightScale ? bodySheetPreviewHeightScale(fitHeightCm) : 1;
  /** 袖・裾カプセル図解。Grading v4 も試着 `snap` と同一 viewBox で重ねる */
  const hasEaseDiagram = Boolean(fitEaseDiagram?.ops?.length);
  const easeDiagramRenderable = hasEaseDiagram;
  /** 商品切替・体型適用（`fitEaseRevealNonce`）のときに段階表示をやり直す。サイズ変更のみではリセットしない */
  const [easeRevealDone, setEaseRevealDone] = useState(false);
  const [easeRevealKey, setEaseRevealKey] = useState(0);
  useLayoutEffect(() => {
    setEaseRevealDone(false);
    setEaseRevealKey((k) => k + 1);
  }, [customGarmentData, fitEaseRevealNonce]);
  const fitSvgStage = useFitSvgStage(easeDiagramRenderable, [bodyOnly, easeDiagramRenderable, easeRevealKey], {
    embedSplashSuspended: embedSplashSuspended === true,
  });
  useEffect(() => {
    if (easeRevealDone) return;
    if (fitSvgStage >= 3) setEaseRevealDone(true);
  }, [fitSvgStage, easeRevealDone]);
  const showEaseOverlay = easeRevealDone || fitSvgStage >= 2;
  const showEaseText = easeRevealDone || fitSvgStage >= 3;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 max-w-full flex-col items-center justify-center gap-1",
        embeddedWidgetUi ? "overflow-hidden" : "overflow-visible",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 items-center justify-center",
          embeddedWidgetUi
            ? "min-h-0 w-full min-w-0 max-w-full max-h-[88%] overflow-hidden sm:max-h-[94%]"
            : "overflow-visible",
        )}
        style={
          bodySheetHeightScale
            ? {
                transform: `scale(${sheetScale})`,
                transformOrigin: "center center",
              }
            : undefined
        }
      >
        {isGradingV4 && !bodyOnly ? (
          <div
            className={cn(
              "relative isolate flex h-full min-h-0 w-full max-w-full flex-col items-center",
              embeddedWidgetUi ? "overflow-hidden" : "overflow-visible",
            )}
          >
            <GradingV4EditorMirrorPreview
              canvasSurfaceColor={canvasSurfaceBackground}
              fitSvgStage={fitSvgStage}
              garmentDefaultStrokeWidth={previewGarmentDefaultStrokeWidth}
              garmentStrokeFallback={previewGarmentStrokeFallback}
              previewBodyStroke={previewBodyStroke}
              snap={snap}
            />
            {easeDiagramRenderable && isGradingV4 && fitEaseDiagram != null ? (
              <svg
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[40] size-full overflow-visible"
                viewBox={`${snap.viewBoxMinX} 0 ${snap.viewBoxWidth} ${viewBoxH}`}
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g
                  style={{
                    opacity: showEaseOverlay ? 1 : 0,
                    transition: "opacity 0.35s ease-out",
                  }}
                >
                  <WidgetFitEaseDiagramSvg diagram={fitEaseDiagram} />
                </g>
              </svg>
            ) : null}
          </div>
        ) : (
          <svg
            viewBox={`${snap.viewBoxMinX} 0 ${snap.viewBoxWidth} ${viewBoxH}`}
            preserveAspectRatio="xMidYMid meet"
            className="block h-auto max-h-full w-auto min-h-0 max-w-full overflow-visible box-border"
            style={{ aspectRatio: `${snap.viewBoxWidth} / ${viewBoxH}` }}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            {!bodyOnly && gradingBehindN > 0 ? (
              <g
                fill={GARMENT_FILL}
                style={{
                  opacity: fitSvgStage >= 1 ? 1 : 0,
                  transition: "opacity 0.42s ease-out",
                }}
              >
                {snap.customPathDs.slice(0, gradingBehindN).map((d, j) => {
                  const i = j;
                  if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
                  const paint = resolveCustomSvgPathRenderablePaint({
                    garmentStrokeFallback: previewGarmentStrokeFallback,
                    pathStroke: snap.customPathStrokes[i],
                    pathFill: snap.customPathFills[i],
                    pathStrokeWidth: snap.customPathStrokeWidths[i],
                    defaultStrokeWidth: previewGarmentDefaultStrokeWidth,
                    allPathStrokes: snap.customPathStrokes,
                    pathIndex: i,
                    preserveFillOnlyPaths: isGradingV4,
                  });
                  if (paint.omit === true) return null;
                  return (
                    <path
                      key={`g-back-${i}`}
                      d={d}
                      fill={paint.fill}
                      stroke={paint.stroke}
                      strokeWidth={paint.strokeWidth}
                      strokeDasharray={snap.customPathStrokeDasharrays[i] ?? undefined}
                    />
                  );
                })}
              </g>
            ) : null}
            <g
              style={{
                opacity: fitSvgStage >= 1 ? 1 : 0,
                transition: "opacity 0.42s ease-out",
              }}
            >
              {isGradingV4 && gradingV4UsesLayeredGridBodySilhouette(snap.bodyPaths.length) ? (
                <>
                  <g fill={canvasSurfaceBackground} stroke="none">
                    {snap.bodyPaths.map((d, i) => (
                      <path
                        key={`bf-${i}`}
                        d={d}
                        fill={
                          gradingV4GridBodyPathEndsClosed(d) ? canvasSurfaceBackground : "none"
                        }
                      />
                    ))}
                  </g>
                  <g fill="none" stroke={previewBodyStroke} strokeWidth={4} pointerEvents="none">
                    {snap.bodyPaths[0] ? (
                      <path key="bo" d={snap.bodyPaths[0]} />
                    ) : null}
                    {snap.bodyPaths.map((d, i) =>
                      i > 0 && !gradingV4GridBodyPathEndsClosed(d) ? (
                        <path key={`bs-${i}`} d={d} />
                      ) : null
                    )}
                  </g>
                </>
              ) : (
                <g fill={canvasSurfaceBackground} stroke={previewBodyStroke} strokeWidth={4}>
                  {snap.bodyPaths.map((d, i) => (
                    <path key={`b-${i}`} d={d} />
                  ))}
                </g>
              )}
            </g>
            {!bodyOnly ? (
              <g
                fill={GARMENT_FILL}
                style={{
                  opacity: fitSvgStage >= 1 ? 1 : 0,
                  transition: "opacity 0.42s ease-out",
                }}
              >
                {(gradingBehindN > 0
                  ? snap.customPathDs.slice(gradingBehindN)
                  : snap.customPathDs
                ).map((d, ji) => {
                  const i = gradingBehindN > 0 ? ji + gradingBehindN : ji;
                  if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
                  const paint = resolveCustomSvgPathRenderablePaint({
                    garmentStrokeFallback: previewGarmentStrokeFallback,
                    pathStroke: snap.customPathStrokes[i],
                    pathFill: snap.customPathFills[i],
                    pathStrokeWidth: snap.customPathStrokeWidths[i],
                    defaultStrokeWidth: previewGarmentDefaultStrokeWidth,
                    allPathStrokes: snap.customPathStrokes,
                    pathIndex: i,
                    preserveFillOnlyPaths: isGradingV4,
                  });
                  if (paint.omit === true) return null;
                  return (
                    <path
                      key={`g-${i}`}
                      d={d}
                      fill={paint.fill}
                      stroke={paint.stroke}
                      strokeWidth={paint.strokeWidth}
                      strokeDasharray={snap.customPathStrokeDasharrays[i] ?? undefined}
                    />
                  );
                })}
              </g>
            ) : null}
            {!bodyOnly && easeDiagramRenderable ? (
              <g
                style={{
                  opacity: showEaseOverlay ? 1 : 0,
                  transition: "opacity 0.35s ease-out",
                }}
              >
                <WidgetFitEaseDiagramSvg diagram={fitEaseDiagram} />
              </g>
            ) : null}
          </svg>
        )}
      </div>
      {!bodyOnly && easeDiagramRenderable ? (
        <div
          style={{
            opacity: showEaseText ? 1 : 0,
            transition: "opacity 0.35s ease-out",
          }}
        >
          <PreviewFitEaseFootnote summary={fitEaseSummary} />
        </div>
      ) : !bodyOnly && !easeDiagramRenderable && !isGradingV4 ? (
        <div
          style={{
            opacity: showEaseText ? 1 : 0,
            transition: "opacity 0.35s ease-out",
          }}
        >
          <PreviewFitEaseSummary summary={fitEaseSummary} />
        </div>
      ) : null}
    </div>
  );
}
