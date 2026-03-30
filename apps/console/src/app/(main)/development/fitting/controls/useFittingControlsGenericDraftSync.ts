"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  startTransition,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { CustomGarmentData, GenericVertexPlotHighlight, JacketSize } from "../lib/types";
import {
  formatLineRangeInput,
  parseLineRangeInput,
  parseSleeveMeasureVertexInput,
  parseSleeveMeasureVertexList,
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

/** 連結 # の入力中に毎キーで onCustomGarmentApply → 服の再計算が走りシルエットが跳ぶのを防ぐ */
const MEASURE_VERTEX_SYNC_DEBOUNCE_MS = 450;

function numberArraysEqual(a: number[] | undefined, b: number[] | undefined): boolean {
  if (a === b) return true;
  if (a == null || b == null || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

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
  flushMeasureVertexDraftToParent: () => void;
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

  const customGarmentDataRef = useRef(customGarmentData);
  useLayoutEffect(() => {
    customGarmentDataRef.current = customGarmentData;
  }, [customGarmentData]);

  const onCustomGarmentApplyRef = useRef(onCustomGarmentApply);
  useLayoutEffect(() => {
    onCustomGarmentApplyRef.current = onCustomGarmentApply;
  }, [onCustomGarmentApply]);

  const measureVertexRangeSectionFocusedRef = useRef(false);
  const measureVertexSyncTimerRef = useRef<number | null>(null);
  /** 親の genericDraft 同期が一度でも反映されるまで true にしない（未同期の空ドラフトで親の採寸・ベースラインを消さない） */
  const measureDraftSyncedFromParentRef = useRef(false);

  const genericPathDsRef = useRef<string[] | null>(null);

  const presetSizeKey: "3" | "4" | "5" =
    jacketSize === "3" || jacketSize === "4" || jacketSize === "5" ? jacketSize : "4";
  const measureSyncPresetKeyRef = useRef(presetSizeKey);

  useEffect(() => {
    if (!customGarmentData || !isGenericTopActive) {
      setGenericDraft(emptyGenericDraft());
      genericPathDsRef.current = null;
      measureSyncPresetKeyRef.current = presetSizeKey;
      measureDraftSyncedFromParentRef.current = false;
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
      const sleeveStr =
        gt.sleeveMeasureVertexChain != null && gt.sleeveMeasureVertexChain.length >= 2
          ? gt.sleeveMeasureVertexChain.join(",")
          : measureVertexRangeStr(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd);
      const sleeveMirrorStr =
        gt.sleeveMirrorMeasureVertexChain != null && gt.sleeveMirrorMeasureVertexChain.length >= 2
          ? gt.sleeveMirrorMeasureVertexChain.join(",")
          : measureVertexRangeStr(gt.sleeveMirrorMeasureVertexStart, gt.sleeveMirrorMeasureVertexEnd);
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
            parseSleeveMeasureVertexInput,
          );
      const sleeveMirrorCoalesced = skipMeasureCoalesce
        ? {
            range: d.sleeveMirrorMeasureRange,
            vs: d.sleeveMirrorMeasureVertexStart,
            ve: d.sleeveMirrorMeasureVertexEnd,
          }
        : coalesceMeasureDraftFromGt(
            sleeveMirrorStr,
            d.sleeveMirrorMeasureRange,
            d.sleeveMirrorMeasureVertexStart,
            d.sleeveMirrorMeasureVertexEnd,
            forceMeasureFromGt,
            parseSleeveMeasureVertexInput,
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
            parseLineRangeInput,
          );
      setGenericDraft({
        seamOuterLeft: formatLineRangeInput(gt.seamOuterLeft),
        seamOuterRight: formatLineRangeInput(gt.seamOuterRight),
        sleeveInnerLeft: formatLineRangeInput(gt.sleeveInnerLeft),
        sleeveInnerRight: formatLineRangeInput(gt.sleeveInnerRight),
        sleeveMeasureRange: sleeveCoalesced.range,
        sleeveMirrorMeasureRange: sleeveMirrorCoalesced.range,
        lengthMeasureRange: lengthCoalesced.range,
        sleeveMeasureVertexStart: sleeveCoalesced.vs,
        sleeveMeasureVertexEnd: sleeveCoalesced.ve,
        sleeveMirrorMeasureVertexStart: sleeveMirrorCoalesced.vs,
        sleeveMirrorMeasureVertexEnd: sleeveMirrorCoalesced.ve,
        lengthMeasureVertexStart: lengthCoalesced.vs,
        lengthMeasureVertexEnd: lengthCoalesced.ve,
      });
      measureSyncPresetKeyRef.current = presetSizeKey;
      measureDraftSyncedFromParentRef.current = true;
      return;
    }

    if (pathDsChanged) {
      setGenericDraft(emptyGenericDraft());
      measureDraftSyncedFromParentRef.current = true;
    }
    measureSyncPresetKeyRef.current = presetSizeKey;
  }, [isGenericTopActive, customGarmentData, presetSizeKey]);

  const commitMeasureVertexDraftToParent = useCallback(() => {
    const dataSnap = customGarmentDataRef.current;
    if (!dataSnap) return;
    const d = genericDraftRef.current;
    const synced = measureDraftSyncedFromParentRef.current;
    const gt0 = dataSnap.genericSymmetricTop ?? {};
    const merged: Record<string, unknown> = { ...gt0 };
    const sleeveRaw = d.sleeveMeasureRange.trim();
    const lengthRaw = d.lengthMeasureRange.trim();
    const nextS = parseSleeveMeasureVertexInput(sleeveRaw);
    const nextL = parseLineRangeInput(lengthRaw);
    const sleeveIncomplete = sleeveRaw !== "" && nextS == null;
    const lengthIncomplete = lengthRaw !== "" && nextL == null;
    const norm = (pair: [number, number]): [number, number] => [
      Math.min(pair[0], pair[1]),
      Math.max(pair[0], pair[1]),
    ];
    const nextSn = nextS ? norm(nextS) : null;
    const nextLn = nextL ? norm(nextL) : null;
    /** 単一 # のみ（例: 入力途中の「8」）は区間未確定として gt に載せない（再計算で服が跳ぶのを防ぐ） */
    const sleeveDegenerate = nextSn != null && nextSn[0] === nextSn[1];
    const lengthDegenerate = nextLn != null && nextLn[0] === nextLn[1];
    const mirrorRaw = d.sleeveMirrorMeasureRange.trim();
    const nextMirror = parseSleeveMeasureVertexInput(mirrorRaw);
    const mirrorIncomplete = mirrorRaw !== "" && nextMirror == null;
    const mirrorDegenerate = nextMirror != null && nextMirror[0] === nextMirror[1];
    const nextMirrorN = nextMirror && !mirrorDegenerate ? norm(nextMirror) : null;

    const curS =
      gt0.sleeveMeasureVertexStart != null && gt0.sleeveMeasureVertexEnd != null
        ? norm([gt0.sleeveMeasureVertexStart, gt0.sleeveMeasureVertexEnd])
        : null;
    const curMirror =
      gt0.sleeveMirrorMeasureVertexStart != null && gt0.sleeveMirrorMeasureVertexEnd != null
        ? norm([gt0.sleeveMirrorMeasureVertexStart, gt0.sleeveMirrorMeasureVertexEnd])
        : null;
    const curL =
      gt0.lengthMeasureVertexStart != null && gt0.lengthMeasureVertexEnd != null
        ? norm([gt0.lengthMeasureVertexStart, gt0.lengthMeasureVertexEnd])
        : null;
    const same = (a: [number, number] | null, b: [number, number] | null) =>
      (a == null && b == null) || (a != null && b != null && a[0] === b[0] && a[1] === b[1]);
    let touched = false;
    if (!sleeveIncomplete && !sleeveDegenerate) {
      if (nextSn == null) {
        if (curS != null && synced) {
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
    if (!mirrorIncomplete) {
      if (nextMirrorN == null) {
        if (curMirror != null && synced) {
          delete merged.sleeveMirrorMeasureVertexStart;
          delete merged.sleeveMirrorMeasureVertexEnd;
          touched = true;
        }
      } else if (!same(nextMirrorN, curMirror)) {
        merged.sleeveMirrorMeasureVertexStart = nextMirrorN[0];
        merged.sleeveMirrorMeasureVertexEnd = nextMirrorN[1];
        touched = true;
      }
    }
    if (!lengthIncomplete && !lengthDegenerate) {
      if (nextLn == null) {
        if (curL != null && synced) {
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
    if (!sleeveIncomplete) {
      const nextList = parseSleeveMeasureVertexList(sleeveRaw);
      const chainValid =
        nextList != null &&
        nextList.length >= 2 &&
        nextList[0] !== nextList[nextList.length - 1];
      const curChain = gt0.sleeveMeasureVertexChain;
      if (chainValid && nextList) {
        if (!numberArraysEqual(nextList, curChain)) {
          merged.sleeveMeasureVertexChain = [...nextList];
          touched = true;
        }
      } else if (curChain != null && curChain.length > 0 && synced) {
        delete merged.sleeveMeasureVertexChain;
        touched = true;
      }
    }
    if (!mirrorIncomplete) {
      const nextList = parseSleeveMeasureVertexList(mirrorRaw);
      const chainValid =
        nextList != null &&
        nextList.length >= 2 &&
        nextList[0] !== nextList[nextList.length - 1];
      const curChain = gt0.sleeveMirrorMeasureVertexChain;
      if (chainValid && nextList) {
        if (!numberArraysEqual(nextList, curChain)) {
          merged.sleeveMirrorMeasureVertexChain = [...nextList];
          touched = true;
        }
      } else if (curChain != null && curChain.length > 0 && synced) {
        delete merged.sleeveMirrorMeasureVertexChain;
        touched = true;
      }
    }
    if (!touched) return;
    const keys = Object.keys(merged);
    onCustomGarmentApplyRef.current({
      ...dataSnap,
      ...(keys.length > 0
        ? { genericSymmetricTop: merged as NonNullable<CustomGarmentData["genericSymmetricTop"]> }
        : { genericSymmetricTop: undefined }),
    });
  }, []);

  const flushMeasureVertexDraftToParent = useCallback(() => {
    if (measureVertexSyncTimerRef.current != null) {
      clearTimeout(measureVertexSyncTimerRef.current);
      measureVertexSyncTimerRef.current = null;
    }
    commitMeasureVertexDraftToParent();
  }, [commitMeasureVertexDraftToParent]);

  useEffect(() => {
    if (!isGenericTopActive) {
      if (measureVertexSyncTimerRef.current != null) {
        clearTimeout(measureVertexSyncTimerRef.current);
        measureVertexSyncTimerRef.current = null;
      }
      return;
    }
    if (measureVertexSyncTimerRef.current != null) {
      clearTimeout(measureVertexSyncTimerRef.current);
      measureVertexSyncTimerRef.current = null;
    }
    const t = window.setTimeout(() => {
      measureVertexSyncTimerRef.current = null;
      /** startTransition だけでは計算回数は減らない。採寸欄フォーカス中は親へ載せず、blur で flush する。 */
      if (measureVertexRangeSectionFocusedRef.current) return;
      commitMeasureVertexDraftToParent();
    }, MEASURE_VERTEX_SYNC_DEBOUNCE_MS);
    measureVertexSyncTimerRef.current = t;
    return () => {
      clearTimeout(t);
      if (measureVertexSyncTimerRef.current === t) {
        measureVertexSyncTimerRef.current = null;
      }
    };
  }, [
    isGenericTopActive,
    genericDraft.sleeveMeasureRange,
    genericDraft.sleeveMirrorMeasureRange,
    genericDraft.lengthMeasureRange,
    commitMeasureVertexDraftToParent,
  ]);

  useLayoutEffect(() => {
    if (!isGenericTopActive || !customGarmentData) return;
    const gt = customGarmentData.genericSymmetricTop;
    if (!gt) return;
    const placeholderNoPaths = customGarmentData.pathDs.length === 0;
    if (!placeholderNoPaths) return;
    const s = customGarmentData.size;
    const slvOk = Number.isFinite(s.sleeve) && s.sleeve > 0;
    const slvBaselineOk =
      gt.gradingBaselineSleeveCm != null &&
      Number.isFinite(gt.gradingBaselineSleeveCm) &&
      gt.gradingBaselineSleeveCm > 0;
    /** 着丈ベースラインは `size.length` でシードしない（s=1 で胴グレード無効→Y 再スケール頼みになる）。紫 # 確定後にパイプラインが model+rig 換算で解決。 */
    if (!slvOk || slvBaselineOk) return;
    startTransition(() => {
      onCustomGarmentApplyRef.current({
        ...customGarmentData,
        genericSymmetricTop: { ...gt, gradingBaselineSleeveCm: s.sleeve },
      });
    });
  }, [isGenericTopActive, customGarmentData]);

  useEffect(() => {
    if (!onGenericVertexPlotHighlightChange) return;
    if (!isGenericTopActive) {
      onGenericVertexPlotHighlightChange(null);
      return;
    }
    const next: GenericVertexPlotHighlight = {};
    const slRaw = genericDraft.sleeveMeasureRange.trim();
    const slList = parseSleeveMeasureVertexList(slRaw);
    if (slList != null && slList.length >= 2 && slList[0] !== slList[slList.length - 1]) {
      next.sleeveMeasureVertexChain = slList;
      const a = slList[0]!;
      const b = slList[slList.length - 1]!;
      next.sleeveMeasure = [Math.min(a, b), Math.max(a, b)];
    } else {
      const sm0 = genericDraft.sleeveMeasureVertexStart;
      const sm1 = genericDraft.sleeveMeasureVertexEnd;
      if (
        sm0 != null &&
        sm1 != null &&
        Number.isFinite(sm0) &&
        Number.isFinite(sm1) &&
        sm0 !== sm1
      ) {
        next.sleeveMeasure = [Math.min(sm0, sm1), Math.max(sm0, sm1)];
      }
    }
    const lm0 = genericDraft.lengthMeasureVertexStart;
    const lm1 = genericDraft.lengthMeasureVertexEnd;
    if (lm0 != null && lm1 != null && Number.isFinite(lm0) && Number.isFinite(lm1)) {
      next.lengthMeasure = [Math.min(lm0, lm1), Math.max(lm0, lm1)];
    }
    onGenericVertexPlotHighlightChange(next);
  }, [
    isGenericTopActive,
    genericDraft.sleeveMeasureRange,
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
    flushMeasureVertexDraftToParent,
    presetSizeKey,
  };
}
