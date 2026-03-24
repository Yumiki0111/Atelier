"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { CustomGarmentData, GenericVertexPlotHighlight, JacketSize } from "../lib/types";
import {
  formatLineRangeInput,
  genericMeasureOnlyGradingActive,
  parseLineRangeInput,
} from "../generic";
import {
  emptyGenericDraft,
  type GenericDraft,
  isLineTupleStored,
} from "./FittingControlsGenericUtils";
import {
  coalesceMeasureDraftFromGt,
  measureVertexRangeStr,
} from "./FittingControlsMeasureDraft";

export function useFittingControlsGenericDraftSync(params: {
  isGenericTopActive: boolean;
  customGarmentData: CustomGarmentData | null;
  jacketSize: JacketSize;
  onCustomGarmentApply: (data: CustomGarmentData) => void;
  onGenericVertexPlotHighlightChange?: (highlight: GenericVertexPlotHighlight | null) => void;
}): {
  genericDraft: GenericDraft;
  setGenericDraft: Dispatch<SetStateAction<GenericDraft>>;
  measureVertexRangeSectionFocusedRef: MutableRefObject<boolean>;
  presetSizeKey: "3" | "4" | "5";
} {
  const {
    isGenericTopActive,
    customGarmentData,
    jacketSize,
    onCustomGarmentApply,
    onGenericVertexPlotHighlightChange,
  } = params;

  const [genericDraft, setGenericDraft] = useState<GenericDraft>(emptyGenericDraft());
  const genericDraftRef = useRef(genericDraft);
  useLayoutEffect(() => {
    genericDraftRef.current = genericDraft;
  }, [genericDraft]);

  const measureVertexRangeSectionFocusedRef = useRef(false);

  const genericPathDsRef = useRef<string[] | null>(null);

  const presetSizeKey: "3" | "4" | "5" =
    jacketSize === "3" || jacketSize === "4" || jacketSize === "5" ? jacketSize : "4";
  const measureSyncPresetKeyRef = useRef(presetSizeKey);

  useEffect(() => {
    if (!customGarmentData || !isGenericTopActive) {
      setGenericDraft(emptyGenericDraft());
      genericPathDsRef.current = null;
      measureSyncPresetKeyRef.current = presetSizeKey;
      return;
    }

    const presetBumped = measureSyncPresetKeyRef.current !== presetSizeKey;

    const pathDs = customGarmentData.pathDs;
    const pathDsChanged = genericPathDsRef.current !== pathDs;
    if (pathDsChanged) {
      genericPathDsRef.current = pathDs;
    }

    const gt = customGarmentData.genericSymmetricTop;
    const allFourStored =
      isLineTupleStored(gt?.seamOuterLeft) &&
      isLineTupleStored(gt?.seamOuterRight) &&
      isLineTupleStored(gt?.sleeveInnerLeft) &&
      isLineTupleStored(gt?.sleeveInnerRight);

    if (allFourStored) {
      const sleeveStr = measureVertexRangeStr(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd);
      const lengthStr = measureVertexRangeStr(gt.lengthMeasureVertexStart, gt.lengthMeasureVertexEnd);
      const d = genericDraftRef.current;
      const forceMeasureFromGt = presetBumped || pathDsChanged;
      const skipMeasureCoalesce =
        measureVertexRangeSectionFocusedRef.current && !forceMeasureFromGt;
      const sleeveCoalesced = skipMeasureCoalesce
        ? {
            range: d.sleeveMeasureRange,
            vs: d.sleeveMeasureVertexStart,
            ve: d.sleeveMeasureVertexEnd,
          }
        : coalesceMeasureDraftFromGt(
            sleeveStr,
            d.sleeveMeasureRange,
            d.sleeveMeasureVertexStart,
            d.sleeveMeasureVertexEnd,
            forceMeasureFromGt,
          );
      const lengthCoalesced = skipMeasureCoalesce
        ? {
            range: d.lengthMeasureRange,
            vs: d.lengthMeasureVertexStart,
            ve: d.lengthMeasureVertexEnd,
          }
        : coalesceMeasureDraftFromGt(
            lengthStr,
            d.lengthMeasureRange,
            d.lengthMeasureVertexStart,
            d.lengthMeasureVertexEnd,
            forceMeasureFromGt,
          );
      setGenericDraft({
        seamOuterLeft: formatLineRangeInput(gt.seamOuterLeft),
        seamOuterRight: formatLineRangeInput(gt.seamOuterRight),
        sleeveInnerLeft: formatLineRangeInput(gt.sleeveInnerLeft),
        sleeveInnerRight: formatLineRangeInput(gt.sleeveInnerRight),
        sleeveMeasureRange: sleeveCoalesced.range,
        lengthMeasureRange: lengthCoalesced.range,
        sleeveMeasureVertexStart: sleeveCoalesced.vs,
        sleeveMeasureVertexEnd: sleeveCoalesced.ve,
        lengthMeasureVertexStart: lengthCoalesced.vs,
        lengthMeasureVertexEnd: lengthCoalesced.ve,
      });
      measureSyncPresetKeyRef.current = presetSizeKey;
      return;
    }

    if (pathDsChanged) {
      setGenericDraft(emptyGenericDraft());
    }
    measureSyncPresetKeyRef.current = presetSizeKey;
  }, [isGenericTopActive, customGarmentData, presetSizeKey]);

  useEffect(() => {
    if (!customGarmentData) return;
    if (!isGenericTopActive) return;
    const dataSnap = customGarmentData;
    const t = window.setTimeout(() => {
      const d = genericDraftRef.current;
      const gt0 = dataSnap.genericSymmetricTop ?? {};
      const merged: Record<string, unknown> = { ...gt0 };
      const sleeveRaw = d.sleeveMeasureRange.trim();
      const lengthRaw = d.lengthMeasureRange.trim();
      const nextS = parseLineRangeInput(sleeveRaw);
      const nextL = parseLineRangeInput(lengthRaw);
      const sleeveIncomplete = sleeveRaw !== "" && nextS == null;
      const lengthIncomplete = lengthRaw !== "" && nextL == null;
      const norm = (pair: [number, number]): [number, number] => [
        Math.min(pair[0], pair[1]),
        Math.max(pair[0], pair[1]),
      ];
      const nextSn = nextS ? norm(nextS) : null;
      const nextLn = nextL ? norm(nextL) : null;
      const curS =
        gt0.sleeveMeasureVertexStart != null && gt0.sleeveMeasureVertexEnd != null
          ? norm([gt0.sleeveMeasureVertexStart, gt0.sleeveMeasureVertexEnd])
          : null;
      const curL =
        gt0.lengthMeasureVertexStart != null && gt0.lengthMeasureVertexEnd != null
          ? norm([gt0.lengthMeasureVertexStart, gt0.lengthMeasureVertexEnd])
          : null;
      const same = (a: [number, number] | null, b: [number, number] | null) =>
        (a == null && b == null) || (a != null && b != null && a[0] === b[0] && a[1] === b[1]);
      let touched = false;
      if (!sleeveIncomplete) {
        if (nextSn == null) {
          if (curS != null) {
            delete merged.sleeveMeasureVertexStart;
            delete merged.sleeveMeasureVertexEnd;
            touched = true;
          }
        } else if (!same(nextSn, curS)) {
          merged.sleeveMeasureVertexStart = nextSn[0];
          merged.sleeveMeasureVertexEnd = nextSn[1];
          touched = true;
        }
      }
      if (!lengthIncomplete) {
        if (nextLn == null) {
          if (curL != null) {
            delete merged.lengthMeasureVertexStart;
            delete merged.lengthMeasureVertexEnd;
            touched = true;
          }
        } else if (!same(nextLn, curL)) {
          merged.lengthMeasureVertexStart = nextLn[0];
          merged.lengthMeasureVertexEnd = nextLn[1];
          touched = true;
        }
      }
      if (!touched) return;
      const keys = Object.keys(merged);
      onCustomGarmentApply({
        ...dataSnap,
        ...(keys.length > 0
          ? { genericSymmetricTop: merged as NonNullable<CustomGarmentData["genericSymmetricTop"]> }
          : { genericSymmetricTop: undefined }),
      });
    }, 0);
    return () => clearTimeout(t);
  }, [isGenericTopActive, customGarmentData, genericDraft.sleeveMeasureRange, genericDraft.lengthMeasureRange, onCustomGarmentApply]);

  useLayoutEffect(() => {
    if (!isGenericTopActive || !customGarmentData) return;
    const gt = customGarmentData.genericSymmetricTop;
    if (!gt) return;
    const placeholderNoPaths = customGarmentData.pathDs.length === 0;
    const gradingReady =
      genericMeasureOnlyGradingActive(gt) || gt.applied === true || placeholderNoPaths;
    if (!gradingReady) return;
    if (
      gt.gradingBaselineLengthCm != null &&
      Number.isFinite(gt.gradingBaselineLengthCm) &&
      gt.gradingBaselineLengthCm > 0
    ) {
      return;
    }
    const s = customGarmentData.size;
    if (!Number.isFinite(s.length) || s.length <= 0 || !Number.isFinite(s.sleeve) || s.sleeve <= 0) {
      return;
    }
    onCustomGarmentApply({
      ...customGarmentData,
      genericSymmetricTop: {
        ...gt,
        gradingBaselineLengthCm: s.length,
        gradingBaselineSleeveCm: s.sleeve,
      },
    });
  }, [isGenericTopActive, customGarmentData, onCustomGarmentApply]);

  useEffect(() => {
    if (!onGenericVertexPlotHighlightChange) return;
    if (!isGenericTopActive) {
      onGenericVertexPlotHighlightChange(null);
      return;
    }
    const next: GenericVertexPlotHighlight = {};
    const sm0 = genericDraft.sleeveMeasureVertexStart;
    const sm1 = genericDraft.sleeveMeasureVertexEnd;
    if (sm0 != null && sm1 != null && Number.isFinite(sm0) && Number.isFinite(sm1)) {
      next.sleeveMeasure = [Math.min(sm0, sm1), Math.max(sm0, sm1)];
    }
    const lm0 = genericDraft.lengthMeasureVertexStart;
    const lm1 = genericDraft.lengthMeasureVertexEnd;
    if (lm0 != null && lm1 != null && Number.isFinite(lm0) && Number.isFinite(lm1)) {
      next.lengthMeasure = [Math.min(lm0, lm1), Math.max(lm0, lm1)];
    }
    onGenericVertexPlotHighlightChange(next);
  }, [
    isGenericTopActive,
    genericDraft.sleeveMeasureVertexStart,
    genericDraft.sleeveMeasureVertexEnd,
    genericDraft.lengthMeasureVertexStart,
    genericDraft.lengthMeasureVertexEnd,
    onGenericVertexPlotHighlightChange,
  ]);

  return {
    genericDraft,
    setGenericDraft,
    measureVertexRangeSectionFocusedRef,
    presetSizeKey,
  };
}
