"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFittingCanvasData } from "@/app/(main)/development/fitting/canvas/useFittingCanvasData";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
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
import { WidgetFitEaseDiagramSvg } from "@/features/preview/WidgetFitEaseDiagramSvg";
import { weightKgFromBodyVal } from "@Atelier/shared";
import { usePreviewChromeTheme } from "./WidgetPreviewChromeTheme";
import {
  GARMENT_FILL,
  PREVIEW_JACKET_SIZE,
  PREVIEW_SHIRT_SIZE,
  PREVIEW_SIZE_ANIM_MS,
  VIEWBOX_W,
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
}) {
  const { bodyStroke, garmentStroke } = usePreviewChromeTheme().canvas;
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
    if (
      pathDsContentEqual(fromSized.pathDs, toSized.pathDs) &&
      (!sizeEqual(fromSized.size, toSized.size) || !landmarksEqual(fromSized.landmarks, toSized.landmarks))
    ) {
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
    genericVertexPlotHighlight: null,
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
  const sheetScale = bodySheetHeightScale ? bodySheetPreviewHeightScale(fitHeightCm) : 1;
  const hasEaseDiagram = Boolean(fitEaseDiagram?.ops?.length);
  /** 商品切替・体型適用（`fitEaseRevealNonce`）のときに段階表示をやり直す。サイズ変更のみではリセットしない */
  const [easeRevealDone, setEaseRevealDone] = useState(false);
  const [easeRevealKey, setEaseRevealKey] = useState(0);
  useLayoutEffect(() => {
    setEaseRevealDone(false);
    setEaseRevealKey((k) => k + 1);
  }, [customGarmentData, fitEaseRevealNonce]);
  const fitSvgStage = useFitSvgStage(hasEaseDiagram, [bodyOnly, hasEaseDiagram, easeRevealKey], {
    embedSplashSuspended: embedSplashSuspended === true,
  });
  useEffect(() => {
    if (easeRevealDone) return;
    if (fitSvgStage >= 3) setEaseRevealDone(true);
  }, [fitSvgStage, easeRevealDone]);
  const showEaseOverlay = easeRevealDone || fitSvgStage >= 2;
  const showEaseText = easeRevealDone || fitSvgStage >= 3;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col items-center justify-center gap-1 overflow-visible">
      <div
        className="flex min-h-0 w-full flex-1 items-center justify-center overflow-visible"
        style={
          bodySheetHeightScale
            ? {
                transform: `scale(${sheetScale})`,
                transformOrigin: "center center",
              }
            : undefined
        }
      >
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${viewBoxH}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-auto max-h-full w-full min-w-0 max-w-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <g
            fill="none"
            stroke={bodyStroke}
            strokeWidth={4}
            style={{
              opacity: fitSvgStage >= 1 ? 1 : 0,
              transition: "opacity 0.42s ease-out",
            }}
          >
            {snap.bodyPaths.map((d, i) => (
              <path key={`b-${i}`} d={d} />
            ))}
          </g>
          {!bodyOnly ? (
            <g
              fill={GARMENT_FILL}
              style={{
                opacity: fitSvgStage >= 1 ? 1 : 0,
                transition: "opacity 0.42s ease-out",
              }}
            >
              {snap.customPathDs.map((d, i) => {
                if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
                return (
                  <path
                    key={`g-${i}`}
                    d={d}
                    fill="none"
                    stroke={snap.customPathStrokes[i] ?? garmentStroke}
                    strokeWidth={snap.customPathStrokeWidths[i] ?? 8}
                    strokeDasharray={snap.customPathStrokeDasharrays[i] ?? undefined}
                  />
                );
              })}
            </g>
          ) : null}
          {!bodyOnly && hasEaseDiagram ? (
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
      </div>
      {!bodyOnly && hasEaseDiagram ? (
        <div
          style={{
            opacity: showEaseText ? 1 : 0,
            transition: "opacity 0.35s ease-out",
          }}
        >
          <PreviewFitEaseFootnote summary={fitEaseSummary} />
        </div>
      ) : !bodyOnly ? (
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
