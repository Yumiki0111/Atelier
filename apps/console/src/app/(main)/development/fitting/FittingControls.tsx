"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { cn } from "@/lib/utils";
import type {
  GarmentType,
  ShirtSize,
  JacketSize,
  CustomGarmentData,
  ShoulderDebug,
  GenericVertexPlotHighlight,
} from "./types";
import { calcFitFromSize, jacketFitLabel } from "./fitCalc";
import { GENERIC_TOP_SIZE_BY_KEY } from "./generic/genericDevDefaults";
import { FileText, ImagePlus } from "lucide-react";
import { getPathPoints, measureSleeveLengthFromPath, vertexRangeToCoveringPathRange } from "./pathUtils";
import { getGenericSymmetricTopPreset } from "./generic/getGenericSymmetricTopPreset";
import { inferLengthCmFromLandmarks } from "./garmentBase";
import { REF_HEIGHT_CM } from "./constants";
import {
  formatLineRangeInput,
  genericMeasureOnlyGradingActive,
  parseLineRangeInput,
} from "./generic";
import {
  emptyGenericDraft,
  type GenericDraft,
  isLineTupleStored,
  computePathCatalogRows,
} from "./FittingControlsGenericUtils";
import {
  splitGarmentPathsFromSvg,
  getLandmarksFromPaths,
  parseSvgPaths,
} from "./customGarmentUtils";
import { getEffectiveCustomLandmarks, inferLandmarksFromRigPaths } from "./customLandmarkResolve";
import { FittingControlsCustomPanels } from "./FittingControlsCustomPanels";
import { FittingControlsPathCatalogPanel } from "./FittingControlsPathCatalogPanel";
import { DevPanelSection, PanelSwitchRow } from "./FittingControlsUI";
import { computeRigArmAngleDebug } from "./fittingCanvasCompute";

function formatRigDeg(v: number): string {
  return Number.isFinite(v) ? `${v.toFixed(1)}°` : "—";
}

function measureVertexRangeStr(a: number | undefined, b: number | undefined): string {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return "";
  const lo = Math.min(Math.trunc(a), Math.trunc(b));
  const hi = Math.max(Math.trunc(a), Math.trunc(b));
  return formatLineRangeInput([lo, hi]);
}

type MeasureDraftSlice = {
  range: string;
  vs: number | undefined;
  ve: number | undefined;
};

/** 親 `gt` へ同期するとき、入力途中（parse 不能）や Apply 前の確定値を上書きしない */
function coalesceMeasureDraftFromGt(
  gtStr: string,
  draftRaw: string,
  draftVs: number | undefined,
  draftVe: number | undefined,
  forceFromGt: boolean,
): MeasureDraftSlice {
  if (forceFromGt) {
    const sp = parseLineRangeInput(gtStr);
    return { range: gtStr, vs: sp ? sp[0] : undefined, ve: sp ? sp[1] : undefined };
  }
  const trimmed = draftRaw.trim();
  const parsedDraft = trimmed === "" ? undefined : parseLineRangeInput(trimmed);
  if (trimmed !== "" && parsedDraft == null) {
    return { range: draftRaw, vs: draftVs, ve: draftVe };
  }
  const parsedGt = gtStr.trim() === "" ? undefined : parseLineRangeInput(gtStr);
  const norm = (p: [number, number]) => {
    const lo = Math.min(p[0], p[1]);
    const hi = Math.max(p[0], p[1]);
    return [lo, hi] as const;
  };
  const dN = parsedDraft ? norm(parsedDraft) : null;
  const gN = parsedGt ? norm(parsedGt) : null;
  const pairsEqual =
    dN == null && gN == null
      ? true
      : dN != null && gN != null && dN[0] === gN[0] && dN[1] === gN[1];
  if (parsedDraft != null && !pairsEqual) {
    return { range: draftRaw, vs: draftVs, ve: draftVe };
  }
  const sp = parseLineRangeInput(gtStr);
  return { range: gtStr, vs: sp ? sp[0] : undefined, ve: sp ? sp[1] : undefined };
}

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
  className,
}: FittingControlsProps) {
  const rigArmAngleUi = useMemo(() => computeRigArmAngleDebug(height, weight), [height, weight]);

  const isGenericTopActive = customGarmentData?.presetId === "genericSymmetricTop";
  /** アップロード等で path が入っている汎用トップ */
  const hasUploadedGenericSvg =
    isGenericTopActive && customGarmentData != null && customGarmentData.pathDs.length > 0;

  const handleSelectGenericSymmetricTop = (size?: "3" | "4" | "5") => {
    onGarmentChange("custom");
    const presetKey = size ?? "4";
    const tmpl = getGenericSymmetricTopPreset(presetKey);
    const prev = customGarmentData;

    if (!size && hasUploadedGenericSvg && prev) {
      if (prev.presetId !== "genericSymmetricTop") {
        onCustomGarmentApply({
          ...prev,
          presetId: "genericSymmetricTop",
          genericSymmetricTop: {
            ...(prev.genericSymmetricTop ?? { applied: false }),
            sizePresets:
              prev.genericSymmetricTop?.sizePresets ?? tmpl.genericSymmetricTop?.sizePresets,
          },
        });
      }
      return;
    }

    const pg = prev?.genericSymmetricTop;
    const fourSeams =
      isLineTupleStored(pg?.seamOuterLeft) &&
      isLineTupleStored(pg?.seamOuterRight) &&
      isLineTupleStored(pg?.sleeveInnerLeft) &&
      isLineTupleStored(pg?.sleeveInnerRight);
    const pathMatchOrUpload =
      prev?.presetId === "genericSymmetricTop" &&
      (hasUploadedGenericSvg || prev.pathDs === tmpl.pathDs);
    const prevKeepsRanges = pathMatchOrUpload && fourSeams;

    let next: CustomGarmentData =
      hasUploadedGenericSvg && prev
        ? { ...prev, size: tmpl.size, presetId: "genericSymmetricTop" }
        : { ...tmpl };

    const sameMeasureAsPrev =
      prev != null && prev.size.length === tmpl.size.length && prev.size.sleeve === tmpl.size.sleeve;

    if (prevKeepsRanges && pg) {
      const hadAppliedFit = pg.applied === true;
      const preserveGradingState = hadAppliedFit || sameMeasureAsPrev;
      next = {
        ...next,
        genericSymmetricTop: {
          applied: hadAppliedFit ? true : sameMeasureAsPrev ? (pg.applied ?? false) : false,
          seamOuterLeft: pg.seamOuterLeft!,
          seamOuterRight: pg.seamOuterRight!,
          sleeveInnerLeft: pg.sleeveInnerLeft!,
          sleeveInnerRight: pg.sleeveInnerRight!,
          sizePresets: pg.sizePresets ?? tmpl.genericSymmetricTop?.sizePresets,
          ...(pg.sleeveMeasureVertexStart != null ? { sleeveMeasureVertexStart: pg.sleeveMeasureVertexStart } : {}),
          ...(pg.sleeveMeasureVertexEnd != null ? { sleeveMeasureVertexEnd: pg.sleeveMeasureVertexEnd } : {}),
          ...(pg.lengthMeasureVertexStart != null ? { lengthMeasureVertexStart: pg.lengthMeasureVertexStart } : {}),
          ...(pg.lengthMeasureVertexEnd != null ? { lengthMeasureVertexEnd: pg.lengthMeasureVertexEnd } : {}),
          ...(preserveGradingState && pg.lockedTopology ? { lockedTopology: pg.lockedTopology } : {}),
          ...(preserveGradingState && pg.gradingBaselineLengthCm != null
            ? { gradingBaselineLengthCm: pg.gradingBaselineLengthCm }
            : {}),
          ...(preserveGradingState && pg.gradingBaselineSleeveCm != null
            ? { gradingBaselineSleeveCm: pg.gradingBaselineSleeveCm }
            : {}),
        },
      };
    } else if (hasUploadedGenericSvg && prev) {
      next = {
        ...prev,
        size: tmpl.size,
        presetId: "genericSymmetricTop",
        genericSymmetricTop: {
          ...(prev.genericSymmetricTop ?? { applied: false }),
          sizePresets: tmpl.genericSymmetricTop?.sizePresets ?? prev.genericSymmetricTop?.sizePresets,
        },
      };
    }

    onCustomGarmentApply(next);
  };
  const [genericDraft, setGenericDraft] = useState<GenericDraft>(emptyGenericDraft());
  const genericDraftRef = useRef(genericDraft);
  genericDraftRef.current = genericDraft;
  /** 袖丈・着丈 # の入力中は親 `customGarmentData` 同期でテキストを上書きしない（古い gt で 9-16→1-86 になるのを防ぐ） */
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

  /** 汎用トップ: 袖丈・着丈の連結 # を `genericSymmetricTop` に即時反映（Apply なし） */
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
      // 「8-」のようにハイフン直後は parse が失敗する。ここで gt を消すと親が更新され draft が空に戻るので書き戻ししない。
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

  /**
   * 着丈グレードの分母が未設定だと `bodyLengthCm` が毎回 `size.length` と一致し s≈1 になり、数値を変えても伸縮しない。
   * アップロード SVG には 4 シームが無いが採寸 # だけで measure-only が動くため、four は要求しない。
   */
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

  const currentTopPresetSize = (): "3" | "4" | "5" | null => {
    if (!customGarmentData?.size) return null;
    const s = customGarmentData.size;
    for (const key of ["3", "4", "5"] as const) {
      const o = GENERIC_TOP_SIZE_BY_KEY[key];
      if (o.length === s.length && o.shoulder === s.shoulder && o.chest === s.chest && o.sleeve === s.sleeve)
        return key;
    }
    return null;
  };

  const fit = calcFitFromSize(height, weight, customGarmentData?.size ?? null);
  const fitLabel = jacketFitLabel(fit.chestDiff);
  const sizeSpec = customGarmentData?.size ?? null;

  const svgInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingSvg, setIsDraggingSvg] = useState(false);

  const applySvgText = useCallback(
    (text: string) => {
      const rawPathDs = parseSvgPaths(text);
      const { garmentPathDs, rigPathDs } = splitGarmentPathsFromSvg(rawPathDs);
      if (garmentPathDs.length === 0) {
        setUploadError(`SVG 解析失敗: path がありません（raw: ${rawPathDs.length}）`);
        return;
      }
      setUploadError(null);
      const autoLm = getLandmarksFromPaths(garmentPathDs);
      const rigLm = rigPathDs.length >= 6 ? inferLandmarksFromRigPaths(rigPathDs) : null;
      const base = getGenericSymmetricTopPreset(presetSizeKey);
      const MODEL_RIG_H = 6431;
      const rigShoulderY = rigLm?.shoulderY ?? null;
      const effectiveHemY =
        autoLm?.hemY != null && rigShoulderY != null && autoLm.hemY > (rigLm?.hemY ?? 0)
          ? autoLm.hemY
          : (rigLm?.hemY ?? null);
      const effectiveLenPx =
        effectiveHemY != null && rigShoulderY != null ? effectiveHemY - rigShoulderY : null;
      const rigLenCm =
        effectiveLenPx != null && Number.isFinite(effectiveLenPx)
          ? (effectiveLenPx * REF_HEIGHT_CM) / MODEL_RIG_H
          : null;

      const mergedLandmarks =
        rigLm != null ? { ...rigLm, hemY: effectiveHemY ?? rigLm.hemY } : (autoLm ?? base.landmarks);
      const lengthFromLandmarks = inferLengthCmFromLandmarks(mergedLandmarks);
      const lengthCm =
        lengthFromLandmarks != null
          ? lengthFromLandmarks
          : rigLenCm != null && Number.isFinite(rigLenCm)
            ? rigLenCm
            : base.size.length;

      onGarmentChange("custom");
      onCustomGarmentApply({
        ...base,
        pathDs: garmentPathDs,
        debugRigPathDs: rigPathDs,
        landmarks: mergedLandmarks,
        landmarkIndexMode: rigLm != null ? "auto" : base.landmarkIndexMode,
        landmarkVertexIndices: rigLm != null ? {} : base.landmarkVertexIndices,
        size: {
          shoulder: base.size.shoulder,
          chest: base.size.chest,
          length: lengthCm,
          sleeve: base.size.sleeve,
        },
        useShoulderSeamYFromLandmarks: rigLm != null,
        presetId: "genericSymmetricTop",
        genericSymmetricTop: {
          applied: false,
          sizePresets: getGenericSymmetricTopPreset(presetSizeKey).genericSymmetricTop?.sizePresets,
          // アップロードでは 4 シームが無いが measure-only 胴グレードに baseline が要る（シード effect が four で弾かれていた）
          gradingBaselineLengthCm: lengthCm,
          gradingBaselineSleeveCm: base.size.sleeve,
        },
      });
    },
    [presetSizeKey, onCustomGarmentApply, onGarmentChange]
  );

  const onSvgFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => applySvgText(reader.result as string);
      reader.readAsText(file);
    },
    [applySvgText]
  );

  const onSvgInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      onSvgFile(file);
      e.target.value = "";
    },
    [onSvgFile]
  );

  // path カタログ（path 一覧パネル用）
  const pathCatalogRows = useMemo(
    () => (isGenericTopActive && customGarmentData ? computePathCatalogRows(customGarmentData.pathDs) ?? [] : []),
    [isGenericTopActive, customGarmentData]
  );

  return (
    <div
      className={cn(
        "flex min-h-0 max-h-full w-[min(17rem,100%)] shrink-0 flex-col gap-4 overflow-y-auto py-1 text-[12px]",
        className
      )}
    >
      <div className="shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-slate-700">参照 SVG をアップロード</span>
          <FileText className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
        </div>
        <input
          ref={svgInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={onSvgInputChange}
        />
        <button
          type="button"
          aria-label="SVG ファイルを選択またはドロップ"
          onClick={() => svgInputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDraggingSvg(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDraggingSvg(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingSvg(false);
            const f = e.dataTransfer.files?.[0];
            if (f && (f.type === "image/svg+xml" || f.name.toLowerCase().endsWith(".svg"))) {
              onSvgFile(f);
            } else {
              setUploadError(".svg ファイルをドロップしてください");
            }
          }}
          className={cn(
            "flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-slate-50/80 px-3 py-6 text-center transition-colors",
            isDraggingSvg
              ? "border-sky-400 bg-sky-50/90"
              : "border-slate-300/90 hover:border-sky-300 hover:bg-slate-50"
          )}
        >
          <div className="relative text-slate-400">
            <ImagePlus className="h-14 w-14" strokeWidth={1.25} aria-hidden />
          </div>
          {hasUploadedGenericSvg ? (
            <span className="text-[9px] font-medium text-sky-700">SVG 読込済み（再アップロードで切替）</span>
          ) : null}
        </button>
        {uploadError ? <p className="text-center text-[10px] text-red-600">{uploadError}</p> : null}
      </div>

      {garment === "custom" && customGarmentData ? (
        <FittingControlsCustomPanels
          customGarmentData={customGarmentData}
          shoulderDebug={shoulderDebug}
          hasUploadedGenericSvg={hasUploadedGenericSvg}
          onCustomGarmentApply={onCustomGarmentApply}
        />
      ) : null}

      {isGenericTopActive && customGarmentData && pathCatalogRows.length > 0 ? (
        <FittingControlsPathCatalogPanel
          pathCatalogRows={pathCatalogRows}
          showMeasureVertexControls={isGenericTopActive}
          customGarmentData={customGarmentData}
          genericDraft={genericDraft}
          setGenericDraft={setGenericDraft}
          measureVertexRangeSectionFocusedRef={measureVertexRangeSectionFocusedRef}
        />
      ) : null}

      <header className="shrink-0 pb-1">
        <h1 className="text-sm font-bold tracking-tight text-slate-900">フィット検証</h1>
      </header>

      <DevPanelSection title="キャンバス表示">
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
          {garment === "custom" && customGarmentData ? (
            <PanelSwitchRow
              id="dev-fit-use-rig-landmarks"
              label="リグ肩/裾ランドマーク"
              checked={customGarmentData.useShoulderSeamYFromLandmarks ?? false}
              onToggle={() => {
                const next = !(customGarmentData.useShoulderSeamYFromLandmarks ?? false);
                if (!next) {
                  const autoLm = getLandmarksFromPaths(customGarmentData.pathDs) ?? customGarmentData.landmarks;
                  onCustomGarmentApply({
                    ...customGarmentData,
                    useShoulderSeamYFromLandmarks: false,
                    landmarkIndexMode: "auto",
                    landmarks: autoLm,
                    landmarkVertexIndices: {},
                  });
                  return;
                }
                const ds = customGarmentData.debugRigPathDs ?? [];
                const rigLm = ds.length ? inferLandmarksFromRigPaths(ds) : null;
                if (!rigLm) {
                  onCustomGarmentApply({ ...customGarmentData, useShoulderSeamYFromLandmarks: false });
                  return;
                }
                const autoLmToggle = getLandmarksFromPaths(customGarmentData.pathDs);
                const effHemYToggle =
                  autoLmToggle?.hemY != null && autoLmToggle.hemY > rigLm.hemY
                    ? autoLmToggle.hemY
                    : rigLm.hemY;
                const MODEL_RIG_H_T = 6431;
                const lenPxToggle = effHemYToggle - rigLm.shoulderY;
                const rigLenCmToggle = Number.isFinite(lenPxToggle)
                  ? (lenPxToggle * REF_HEIGHT_CM) / MODEL_RIG_H_T
                  : null;
                onCustomGarmentApply({
                  ...customGarmentData,
                  useShoulderSeamYFromLandmarks: true,
                  landmarkIndexMode: "auto",
                  landmarks: { ...rigLm, hemY: effHemYToggle },
                  landmarkVertexIndices: {},
                  size: {
                    ...customGarmentData.size,
                    ...(rigLenCmToggle != null ? { length: rigLenCmToggle } : {}),
                  },
                });
              }}
            />
          ) : null}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-slate-400">
          開発: 採寸の入力と画面上の差をコンソールに出す{" "}
          <code className="rounded bg-slate-100 px-0.5 font-mono text-[9px]">sessionStorage.DEBUG_FITTING_MEASURE=1</code>
          。キャンバス左上のリグ等テキストは{" "}
          <code className="rounded bg-slate-100 px-0.5 font-mono text-[9px]">DEBUG_FITTING_CANVAS=1</code>
        </p>
      </DevPanelSection>

      <DevPanelSection title="モデル腕リグ（数値）">
        <p className="mb-1.5 text-[10px] leading-snug text-slate-500">
          <code className="rounded bg-slate-100 px-0.5 font-mono text-[9px]">DEBUG_RIG_ARM</code>{" "}
          と同じ定義。肩角度＝中心縦（下向き）との内角 ψ、袖付け根＝体の外側水平との内角、θ＝肩→袖先の方位（atan2、+Y
          下）。
        </p>
        <div className="rounded-md border border-slate-200/80 bg-white/50 px-2 py-1.5">
          <table className="w-full border-collapse text-[11px] tabular-nums text-slate-800">
            <thead>
              <tr className="text-left text-[9px] font-medium text-slate-400">
                <th className="pb-1 pr-2 font-normal">側</th>
                <th className="pb-1 pr-2 font-normal">肩 ψ</th>
                <th className="pb-1 pr-2 font-normal">袖付け根</th>
                <th className="pb-1 font-normal">θ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-0.5 pr-2 text-slate-500">左</td>
                <td className="py-0.5 pr-2">{formatRigDeg(rigArmAngleUi.interiorShoulderVerticalDegL)}</td>
                <td className="py-0.5 pr-2">{formatRigDeg(rigArmAngleUi.sleeveRootHorizontalDegL)}</td>
                <td className="py-0.5">{formatRigDeg(rigArmAngleUi.warpedArmAxisDegL)}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-2 text-slate-500">右</td>
                <td className="py-0.5 pr-2">{formatRigDeg(rigArmAngleUi.interiorShoulderVerticalDegR)}</td>
                <td className="py-0.5 pr-2">{formatRigDeg(rigArmAngleUi.sleeveRootHorizontalDegR)}</td>
                <td className="py-0.5">{formatRigDeg(rigArmAngleUi.warpedArmAxisDegR)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1.5 border-t border-slate-200/60 pt-1 text-[9px] tabular-nums text-slate-400">
            胴スキニング Δθ　L {formatRigDeg(rigArmAngleUi.skinningDeltaThetaDegL)}　R{" "}
            {formatRigDeg(rigArmAngleUi.skinningDeltaThetaDegR)}
          </p>
        </div>
      </DevPanelSection>

      <div className="flex shrink-0 flex-col gap-4">
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

        <DevPanelSection title="服のプリセット">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSelectGenericSymmetricTop()}
              className={cn(
                "w-full rounded-lg px-3 py-2.5 text-left text-[11px] font-bold transition-colors",
                isGenericTopActive
                  ? "bg-emerald-700 text-white hover:bg-emerald-600"
                  : "bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/80"
              )}
            >
              {hasUploadedGenericSvg ? "汎用フィット（アップロード中）" : "汎用フィット（トップ）"}
            </button>
            {hasUploadedGenericSvg ? (
              <p className="text-[9px] leading-snug text-slate-500">
                SVG アップロード済み。袖丈・着丈の連結 # を入れると自動反映され、プレースを保ったままグレーディングできます。
              </p>
            ) : (
              <p className="text-[9px] leading-snug text-slate-500">
                参照 SVG をアップロードするか、サイズ 3/4/5 で採寸プリセットを選んでから調整してください。
              </p>
            )}
          </div>
        </DevPanelSection>
      </div>

      {!hasUploadedGenericSvg ? (
        <DevPanelSection title="サイズ（採寸プリセット）">
          <div className="flex gap-2">
            {(["3", "4", "5"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelectGenericSymmetricTop(s)}
                className={cn(
                  "min-h-10 min-w-0 flex-1 rounded-lg text-sm font-bold transition-colors",
                  currentTopPresetSize() === s
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </DevPanelSection>
      ) : null}

      <DevPanelSection title="採寸・フィット">
        <div className="text-[11px] leading-snug text-slate-600">
        {sizeSpec && (
          <>
            <b className="text-gray-800">
              {hasUploadedGenericSvg ? "アップロード SVG 採寸" : "Auralee 汎用トップ 採寸（プリセット）"}
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
                      const lm = getEffectiveCustomLandmarks(customGarmentData);
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
            <span className="text-gray-400">身幅ゆとり</span>{" "}
            <b
              className={
                fitLabel === "tight"
                  ? "text-red-600"
                  : fitLabel === "ok"
                    ? "text-green-600"
                    : "text-blue-600"
              }
            >
              {fit.chestDiff > 0 ? "+" : ""}
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
          </>
        )}
        </div>
        <div
          className={cn(
            "mt-3 rounded-md px-2 py-2 text-center text-[11px] font-bold",
            fitLabel === "tight" && "bg-red-50 text-red-700",
            fitLabel === "ok" && "bg-emerald-50 text-emerald-800",
            fitLabel === "loose" && "bg-sky-50 text-sky-800"
          )}
        >
          {fitLabel === "tight" && "⚠ きつめ"}
          {fitLabel === "ok" && "✓ 適正"}
          {fitLabel === "loose" && "↔ ゆったり"}
        </div>
      </DevPanelSection>
    </div>
  );
}
