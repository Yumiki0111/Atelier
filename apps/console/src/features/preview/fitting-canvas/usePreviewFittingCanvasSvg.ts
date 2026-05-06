"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFittingCanvasData } from "@/app/(main)/development/fitting/canvas/useFittingCanvasData";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import {
  GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE,
  GARMENT_FLAT_CM_PREVIEW_GARMENT_DEFAULT_STROKE_WIDTH,
  GARMENT_FLAT_CM_PREVIEW_GARMENT_STROKE_FALLBACK,
  garmentFlatCmGridBodyLayeredOutlinePathAfterFirst,
  garmentFlatCmUsesLayeredGridBodySilhouette,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import { landmarksEqual, pathDsContentEqual, sizeEqual } from "@/app/(main)/development/fitting/lib/fittingStateUtils";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { applyWidgetSizeToCustomGarmentData } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import { buildWidgetFitEaseDiagramFromSnapshot } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import { buildWidgetFitEaseSummaryFromSnapshot } from "@/lib/widget-fit/computeWidgetFitEaseSummary";
import { resolveWidgetFitChestBandMode } from "@/app/(main)/development/fitting/lib/fitCalc";
import { orderedSizeLabelsFromCustomGarment, resolveOrderedSizeKeysForBand } from "@/lib/widget-fit/widgetFitChestBandOrdinal";
import { weightKgFromBodyVal, isGarmentFlatCmPresetId } from "@Atelier/shared";
import { usePreviewChromeTheme } from "../WidgetPreviewChrome";
import { PREVIEW_JACKET_SIZE, PREVIEW_SHIRT_SIZE, PREVIEW_SIZE_ANIM_MS } from "../widget-style-product/fit-constants";
import { useFitSvgStage } from "../widget-style-product/fit-svg-stage";
import { resolveGarmentDataForPreviewView } from "@/lib/widget-fit/resolveGarmentDataForPreviewView";
import type { GarmentPreviewBodyView } from "@/lib/widget-fit/resolveGarmentDataForPreviewView";

export function usePreviewFittingCanvasSvg({
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
  garmentPreviewView = "front",
  showFitEaseUi = true,
}: {
  fitHeightCm: number;
  fitBodyVal: number;
  currentSize: string;
  customGarmentData: CustomGarmentData;
  orderedSizeKeys?: string[];
  fitChestBandCategory?: string | null;
  bodyOnly?: boolean;
  bodySheetHeightScale?: boolean;
  fitEaseRevealNonce?: number;
  embedSplashSuspended?: boolean;
  /** 平置き cm: 前後ボディ切替 */
  garmentPreviewView?: GarmentPreviewBodyView;
  /** false でおすすめサイズ等の図解・脚注を出さない */
  showFitEaseUi?: boolean;
}) {
  const { bodyStroke, garmentStroke, surfaceBackground: canvasSurfaceBackground } = usePreviewChromeTheme().canvas;
  const isGarmentFlatCm = isGarmentFlatCmPresetId(customGarmentData.presetId);
  const previewBodyStroke = isGarmentFlatCm ? GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE : bodyStroke;
  const previewGarmentStrokeFallback = isGarmentFlatCm ? GARMENT_FLAT_CM_PREVIEW_GARMENT_STROKE_FALLBACK : garmentStroke;
  const previewGarmentDefaultStrokeWidth = isGarmentFlatCm ? GARMENT_FLAT_CM_PREVIEW_GARMENT_DEFAULT_STROKE_WIDTH : 1;

  const sizedTarget = useMemo(
    () => applyWidgetSizeToCustomGarmentData(customGarmentData, currentSize),
    [customGarmentData, currentSize]
  );

  const garmentForCanvas = useMemo(
    () => resolveGarmentDataForPreviewView(sizedTarget, garmentPreviewView),
    [sizedTarget, garmentPreviewView]
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
    if (currentSize === sizeCommittedRef.current) return;

    const fromSized = applyWidgetSizeToCustomGarmentData(customGarmentData, sizeCommittedRef.current);
    const toSized = applyWidgetSizeToCustomGarmentData(customGarmentData, currentSize);
    const sizeOrLandmarksChanged =
      !sizeEqual(fromSized.size, toSized.size) || !landmarksEqual(fromSized.landmarks, toSized.landmarks);
    /** 平置き cm ミラーは lerp で滑らかにする */
    const animateGarmentFlatCmMirror =
      isGarmentFlatCmPresetId(customGarmentData.presetId) && sizeOrLandmarksChanged;
    const animateSamePathsDifferentMeasure =
      pathDsContentEqual(fromSized.pathDs, toSized.pathDs) && sizeOrLandmarksChanged;

    if (animateGarmentFlatCmMirror || animateSamePathsDifferentMeasure) {
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
   * cleanup の cancelAnimationFrame がチェーンした次フレームを潰してカクつく。
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
    customGarmentData: garmentForCanvas,
    animProgress,
    fromSize: null,
    toSize: null,
    fromCustomGarmentData: fromCustom
      ? resolveGarmentDataForPreviewView(fromCustom, garmentPreviewView)
      : null,
    toCustomGarmentData: toCustom
      ? resolveGarmentDataForPreviewView(toCustom, garmentPreviewView)
      : null,
    rigBodyEnabled: false,
    bodyModelVariant: garmentForCanvas.bodyModelVariant,
  });

  const weightKg = weightKgFromBodyVal(fitBodyVal);
  const fitChestBandMode = useMemo(
    () => resolveWidgetFitChestBandMode(fitChestBandCategory),
    [fitChestBandCategory]
  );
  const bandOrdinalKeys = useMemo(
    () =>
      resolveOrderedSizeKeysForBand(
        orderedSizeLabelsFromCustomGarment(customGarmentData),
        orderedSizeKeys,
        currentSize
      ),
    [customGarmentData, orderedSizeKeys, currentSize]
  );
  const fitEaseSummary = useMemo(
    () =>
      showFitEaseUi
        ? buildWidgetFitEaseSummaryFromSnapshot(snap, weightKg, {
            fitChestBandMode,
            customGarmentData: sizedTarget,
            heightCm: bandOrdinalKeys != null ? fitHeightCm : undefined,
            orderedSizeKeys: bandOrdinalKeys ?? undefined,
            currentSize: bandOrdinalKeys != null ? currentSize : undefined,
          })
        : {
            shoulderEaseCm: null,
            chestEaseCm: null,
            sleeveFromWristCm: null,
            hemFromCrotchCm: null,
            fitChestBandJa: "",
            fitToneJa: "",
            linesJa: [] as string[],
          },
    [showFitEaseUi, snap, weightKg, fitChestBandMode, sizedTarget, fitHeightCm, bandOrdinalKeys, currentSize]
  );
  const fitEaseDiagram = useMemo(
    () =>
      showFitEaseUi && fitEaseSummary ? buildWidgetFitEaseDiagramFromSnapshot(snap, fitEaseSummary) : null,
    [showFitEaseUi, snap, fitEaseSummary]
  );

  const behindBodyGarmentPathCount =
    !bodyOnly && isGarmentFlatCmPresetId(garmentForCanvas.presetId) ? snap.behindBodyPathCount : 0;
  const viewBoxH = snap.viewBoxHeight;
  const hasEaseDiagram = showFitEaseUi && Boolean(fitEaseDiagram?.ops?.length);
  const easeDiagramRenderable = hasEaseDiagram;

  const [easeRevealDone, setEaseRevealDone] = useState(false);
  const [easeRevealKey, setEaseRevealKey] = useState(0);
  useLayoutEffect(() => {
    setEaseRevealDone(false);
    setEaseRevealKey((k) => k + 1);
  }, [customGarmentData, fitEaseRevealNonce, garmentPreviewView, showFitEaseUi]);

  const fitSvgStage = useFitSvgStage(easeDiagramRenderable, [bodyOnly, easeDiagramRenderable, easeRevealKey], {
    embedSplashSuspended: embedSplashSuspended === true,
  });
  useEffect(() => {
    if (easeRevealDone) return;
    if (fitSvgStage >= 3) setEaseRevealDone(true);
  }, [fitSvgStage, easeRevealDone]);

  const showEaseOverlay = easeRevealDone || fitSvgStage >= 2;
  const showEaseText = easeRevealDone || fitSvgStage >= 3;

  return {
    snap,
    isGarmentFlatCm,
    canvasSurfaceBackground,
    previewBodyStroke,
    previewGarmentStrokeFallback,
    previewGarmentDefaultStrokeWidth,
    sizedTarget,
    fitEaseSummary,
    fitEaseDiagram,
    behindBodyGarmentPathCount,
    viewBoxH,
    easeDiagramRenderable,
    fitSvgStage,
    showEaseOverlay,
    showEaseText,
    shouldSuppressGarmentPathRender,
    garmentFlatCmGridBodyLayeredOutlinePathAfterFirst,
    garmentFlatCmUsesLayeredGridBodySilhouette,
  };
}
