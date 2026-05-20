import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import {
  getBodyRigLinePathsTemplate,
  type BodyModelVariant,
} from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import { computeFittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasCompute";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";
import {
  GARMENT_FLAT_CM_BACK_LAYER_IDS,
  GARMENT_FLAT_CM_PATH_ZONES,
  MEASURE_BODY_LENGTH_BASE_PX,
  MEASURE_SLEEVE_L_VERTS,
  BDY_L_X,
  BDY_R_X,
  SH_L_X,
  SH_R_X,
} from "./garmentFlatCmGradingConstants";
import { flatCmGarmentPointDelta, rewriteFlatCmGarmentPath } from "./garmentFlatCmGradingPathDeform";
import {
  GARMENT_FLAT_CM_BASE,
  garmentFlatCmToShapeDeltas,
  garmentFlatCmSleeveEffectivePxPerCm,
  type GarmentFlatCm,
} from "./garmentFlatCmGradingMeasurements";
import { getCmForActive, type GarmentFlatCmPresetsState } from "./garmentFlatCmGradingPresetsStorage";
import {
  buildGarmentFlatCmGradingSpecFromFrontAndBackSvg,
  mergeRearGarmentMarkupIntoFlatCmSpec,
} from "./buildGarmentFlatCmGradingSpecForProductDb";
import { resolveGarmentDataForPreviewView } from "@/lib/widget-fit/resolveGarmentDataForPreviewView";
import { flatCmOfferedSizeLabelsForRegister } from "./flatCmOfferedSizeLabelsForRegister";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import {
  PREVIEW_JACKET_SIZE,
  PREVIEW_SHIRT_SIZE,
} from "@/features/preview/widget-style-product/fit-constants";
import {
  installGradedGarmentDomFromMarkup,
  maybeWarnGarmentFlatCmViewBox,
  validateUploadedGarmentFlatCmMarkup,
} from "./garmentFlatCmGradingFittingDom";
import {
  collectGarmentFlatCmBackLayerPathElementsByIdOrder,
  collectGarmentFlatCmOutlinePathElements,
  isGarmentFlatCmMeasureConstructionStroke,
  resolveGarmentFlatCmDeformZone,
} from "./garmentFlatCmGradingSvgOutline";
import {
  flatCmEqual,
  fmtMeasureLabel,
  formatCmInputValue,
  measureOpenPolylineLength,
  parseCmInputDraft,
  clampGarmentCmKey,
  round1,
} from "./garmentFlatCmGradingFittingMeasureFormat";
import { useGarmentFlatCmPresets } from "./useGarmentFlatCmPresets";

export { GARMENT_FLAT_CM_BASE };
export type { GarmentFlatCm, GarmentFlatCmPresetsState };
export { flatCmEqual, formatCmInputValue, parseCmInputDraft, clampGarmentCmKey, round1 };

const GARMENT_SRC = "/fitting-models/garment-flat-cm-template-garment.svg";

const GRID_PREVIEW_BODY_VARIANTS = {
  front: "gridSvgBody" as BodyModelVariant,
  back: "gridSvgBodyBack" as BodyModelVariant,
};

export function useGarmentFlatCmGradingFitting(height: number, weight: number) {
  const [tab, setTab] = useState<"garment" | "model">("garment");
  const [garmentCm, setGarmentCm] = useState<GarmentFlatCm>(() => ({
    ...GARMENT_FLAT_CM_BASE,
  }));
  const [outlineGradeBaselineCm, setOutlineGradeBaselineCm] = useState<GarmentFlatCm>(() => ({
    ...GARMENT_FLAT_CM_BASE,
  }));
  const [editingGarmentField, setEditingGarmentField] = useState<keyof GarmentFlatCm | null>(null);
  const [garmentFieldDraft, setGarmentFieldDraft] = useState("");
  const [uploadedGarmentMarkup, setUploadedGarmentMarkup] = useState<string | null>(null);
  const [uploadedRearGarmentMarkup, setUploadedRearGarmentMarkup] = useState<string | null>(null);
  const [bundledAssetTexts, setBundledAssetTexts] = useState<{ garment: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModelRig, setShowModelRig] = useState(false);
  const [fitSnapFront, setFitSnapFront] = useState<FittingCanvasSnapshot | null>(null);
  const [fitSnapBack, setFitSnapBack] = useState<FittingCanvasSnapshot | null>(null);

  const garmentFrontSvgRef = useRef<SVGSVGElement | null>(null);
  const garmentBackSvgRef = useRef<SVGSVGElement | null>(null);
  const garmentOriginalOutlineDs = useRef<string[]>([]);
  const garmentOriginalBehindOutlineDs = useRef<string[]>([]);
  const garmentFlatCmDomReadyRef = useRef(false);
  const lastMountedGarmentKeyRef = useRef<string | null>(null);
  const garmentSvgUploadRef = useRef<HTMLInputElement | null>(null);
  const rearGarmentSvgUploadRef = useRef<HTMLInputElement | null>(null);
  const skipNextGarmentCmFieldBlurRef = useRef(false);
  const activeGarmentCmFieldRef = useRef<keyof GarmentFlatCm | null>(null);
  /** `garmentOriginalOutlineDs` が取り込まれたマークアップ。変形は常にこの時点の平置き cm を基準にする（S テンプレ固定だとアップロード形状が歪む） */
  const prevEffectiveGarmentMarkupForGradeBaselineRef = useRef<string | null>(null);

  const clearEditingField = useCallback(() => {
    activeGarmentCmFieldRef.current = null;
    setEditingGarmentField(null);
  }, []);

  const {
    presetsState,
    presetNameDraft,
    setPresetNameDraft,
    initPresetsState,
    applyUserPreset,
    deleteUserPreset,
    persistGarmentCm: persistGarmentCmBase,
    overwriteActivePreset: overwriteActivePresetBase,
    loadGarmentCm,
  } = useGarmentFlatCmPresets({ setGarmentCm, onPresetApply: clearEditingField });

  useLayoutEffect(() => {
    initPresetsState();
  }, [initPresetsState]);

  // bundledAssetTexts は標準 SVG のキャッシュ。「標準ガーメント」で S 基準に戻す用途も兼ねる。
  // 取得完了時は同じ SVG をそのまま適用し、試着ボディが最初から表示されるようにする。
  const effectiveGarmentMarkup = useMemo(
    () => uploadedGarmentMarkup,
    [uploadedGarmentMarkup]
  );

  const buildGarmentSpec = useCallback((): CustomGarmentData | null => {
    if (!garmentFlatCmDomReadyRef.current) return null;
    const front = garmentFrontSvgRef.current;
    if (!front) return null;
    const back = garmentBackSvgRef.current;
    const mk = effectiveGarmentMarkup;
    const main = buildGarmentFlatCmGradingSpecFromFrontAndBackSvg(front, back, garmentCm, mk ?? undefined);
    if (!main) return null;
    const withRear = mergeRearGarmentMarkupIntoFlatCmSpec(main, uploadedRearGarmentMarkup, garmentCm);
    const offered = flatCmOfferedSizeLabelsForRegister(presetsState, garmentCm);
    if (offered.length > 0) {
      return { ...withRear, flatCmOfferedSizeLabels: offered };
    }
    return withRear;
  }, [garmentCm, effectiveGarmentMarkup, uploadedRearGarmentMarkup, presetsState]);

  const applyGarmentSvgText = useCallback((raw: string) => {
    const err = validateUploadedGarmentFlatCmMarkup(raw);
    if (err) {
      toast.error(err);
      const el = garmentSvgUploadRef.current;
      if (el) el.value = "";
      return;
    }
    maybeWarnGarmentFlatCmViewBox(raw);
    lastMountedGarmentKeyRef.current = null;
    garmentFlatCmDomReadyRef.current = false;
    setUploadedGarmentMarkup(raw);
    toast.success(
      "ガーメント SVG を読み込みました。sleeve_L / sleeve_R / body の各グループ内の path に平置き cm ゾーン変形が掛かります（path id は不要です）。"
    );
  }, []);

  const applyRearGarmentSvgText = useCallback((raw: string) => {
    const err = validateUploadedGarmentFlatCmMarkup(raw);
    if (err) {
      toast.error(err);
      const el = rearGarmentSvgUploadRef.current;
      if (el) el.value = "";
      return;
    }
    maybeWarnGarmentFlatCmViewBox(raw);
    setUploadedRearGarmentMarkup(raw);
    toast.success("背面ビュー用ガーメント SVG を読み込みました（登録時に任意で同梱）。");
  }, []);

  const { dSh, dBw, dBl, dSleeveLengthPx } = useMemo(
    () => garmentFlatCmToShapeDeltas(garmentCm, outlineGradeBaselineCm),
    [garmentCm, outlineGradeBaselineCm]
  );

  const sleevePxPerCmLive = useMemo(
    () => garmentFlatCmSleeveEffectivePxPerCm(garmentCm.bodyLength),
    [garmentCm.bodyLength]
  );

  /** 「標準ガーメント」ボタン押下時に bundled SVG をロードし、採寸を S 基準に戻す */
  const loadBundledGarment = useCallback(() => {
    if (!bundledAssetTexts) return;
    lastMountedGarmentKeyRef.current = null;
    garmentFlatCmDomReadyRef.current = false;
    setUploadedRearGarmentMarkup(null);
    const el = garmentSvgUploadRef.current;
    if (el) el.value = "";
    const elR = rearGarmentSvgUploadRef.current;
    if (elR) elR.value = "";
    setGarmentCm({ ...GARMENT_FLAT_CM_BASE });
    setUploadedGarmentMarkup(bundledAssetTexts.garment);
  }, [bundledAssetTexts]);

  const onGarmentSvgFileChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const raw = reader.result;
        if (typeof raw !== "string") {
          toast.error("ファイルの読み込みに失敗しました");
          return;
        }
        applyGarmentSvgText(raw);
      };
      reader.onerror = () => toast.error("ファイルの読み込みに失敗しました");
      reader.readAsText(file);
    },
    [applyGarmentSvgText]
  );

  const onRearGarmentSvgFileChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const raw = reader.result;
        if (typeof raw !== "string") {
          toast.error("ファイルの読み込みに失敗しました");
          return;
        }
        applyRearGarmentSvgText(raw);
      };
      reader.onerror = () => toast.error("ファイルの読み込みに失敗しました");
      reader.readAsText(file);
    },
    [applyRearGarmentSvgText]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const gr = await fetch(GARMENT_SRC).then((r) => {
          if (!r.ok) throw new Error(`garment ${r.status}`);
          return r.text();
        });
        if (!cancelled) {
          setBundledAssetTexts({ garment: gr });
          setUploadedGarmentMarkup(gr);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "load failed");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const overlay = useMemo(() => {
    const sh = fmtMeasureLabel(SH_R_X - SH_L_X, dSh * 2);
    const bw = fmtMeasureLabel(BDY_R_X - BDY_L_X, dBw * 2);
    const bl = fmtMeasureLabel(MEASURE_BODY_LENGTH_BASE_PX, dBl);
    const baseSl = measureOpenPolylineLength(MEASURE_SLEEVE_L_VERTS);
    const warpedSl = MEASURE_SLEEVE_L_VERTS.map(([x, y]) => {
      const [dx, dy] = flatCmGarmentPointDelta(x, y, "sleeve_L", dSh, dBw, dBl, dSleeveLengthPx);
      return [x + dx, y + dy] as [number, number];
    });
    const curSl = measureOpenPolylineLength(warpedSl);
    const sl = fmtMeasureLabel(baseSl, curSl - baseSl);
    let sizeLabel = "未登録";
    if (presetsState) {
      const committed = getCmForActive(presetsState);
      const dirty = !flatCmEqual(committed, garmentCm);
      if (presetsState.activeUserPresetId) {
        const p = presetsState.userPresets.find((x) => x.id === presetsState.activeUserPresetId);
        sizeLabel = p?.name ?? "保存";
      }
      if (dirty) sizeLabel = `${sizeLabel} · 編集`;
    }
    return { sh, bw, bl, sl, sizeLabel };
  }, [dSh, dBw, dBl, dSleeveLengthPx, presetsState, garmentCm]);

  const bmi = useMemo(() => {
    const h = height / 100;
    return (weight / (h * h)).toFixed(1);
  }, [height, weight]);

  const persistGarmentCm = useCallback(() => {
    persistGarmentCmBase(garmentCm, presetNameDraft);
  }, [persistGarmentCmBase, garmentCm, presetNameDraft]);

  const overwriteActivePreset = useCallback(() => {
    overwriteActivePresetBase(garmentCm, presetNameDraft);
  }, [overwriteActivePresetBase, garmentCm, presetNameDraft]);

  const applyFrontGarmentPathDs = useCallback(
    (
      gRoot: SVGSVGElement | null,
      originalOutlineDs: readonly string[],
      deltas?: { dSh: number; dBw: number; dBl: number; dSleeveLengthPx: number }
    ) => {
      if (!gRoot) return;
      const { dSh: sh, dBw: bw, dBl: bl, dSleeveLengthPx: slPx } = deltas ?? {
        dSh,
        dBw,
        dBl,
        dSleeveLengthPx,
      };
      const paths = collectGarmentFlatCmOutlinePathElements(gRoot);
      paths.forEach((p, i) => {
        const orig = originalOutlineDs[i];
        if (orig == null || orig.length === 0) return;
        const id = p.getAttribute("id");
        const zone = resolveGarmentFlatCmDeformZone(p, id);
        if (!zone) return;
        const newD = rewriteFlatCmGarmentPath(orig, zone, sh, bw, bl, slPx);
        p.setAttribute("d", newD);
      });
    },
    [dSh, dBw, dBl, dSleeveLengthPx]
  );

  const applyBackGarmentPathDs = useCallback(
    (
      gRoot: SVGSVGElement | null,
      originalOutlineDs: readonly string[],
      deltas?: { dSh: number; dBw: number; dBl: number; dSleeveLengthPx: number }
    ) => {
      if (!gRoot) return;
      const { dSh: sh, dBw: bw, dBl: bl, dSleeveLengthPx: slPx } = deltas ?? {
        dSh,
        dBw,
        dBl,
        dSleeveLengthPx,
      };
      const layerPaths = collectGarmentFlatCmBackLayerPathElementsByIdOrder(gRoot);
      layerPaths.forEach((p, i) => {
        const orig = originalOutlineDs[i];
        if (orig == null || orig.length === 0) return;
        const cur = (p.getAttribute("d") ?? "").trim();
        if (cur.length === 0) return;
        const canonId = GARMENT_FLAT_CM_BACK_LAYER_IDS[i];
        const zone =
          canonId != null ? GARMENT_FLAT_CM_PATH_ZONES[canonId] ?? "body" : "body";
        const newD = rewriteFlatCmGarmentPath(orig, zone, sh, bw, bl, slPx);
        p.setAttribute("d", newD);
      });
    },
    [dSh, dBw, dBl, dSleeveLengthPx]
  );

  const applyGarmentScene = useCallback(
    (deltaOverride?: { dSh: number; dBw: number; dBl: number; dSleeveLengthPx: number }) => {
      const gFront = garmentFrontSvgRef.current;
      const gBack = garmentBackSvgRef.current;
      if (!gFront || !gBack || !garmentFlatCmDomReadyRef.current) return;
      applyBackGarmentPathDs(gBack, garmentOriginalBehindOutlineDs.current, deltaOverride);
      applyFrontGarmentPathDs(gFront, garmentOriginalOutlineDs.current, deltaOverride);
      gFront.querySelectorAll("g[id]").forEach((g) => {
        if (/^measures$/i.test((g.getAttribute("id") ?? "").trim())) {
          g.setAttribute("display", "none");
        }
      });
      gFront.querySelectorAll("path[id], line[id]").forEach((el) => {
        if (/^measure_/i.test((el.getAttribute("id") ?? "").trim())) {
          el.setAttribute("display", "none");
        }
      });
      gFront.querySelectorAll("path, line, polyline, polygon").forEach((el) => {
        if (el.closest("#rig")) return;
        if (isGarmentFlatCmMeasureConstructionStroke(el.getAttribute("stroke"))) {
          el.setAttribute("display", "none");
        }
      });
    },
    [applyBackGarmentPathDs, applyFrontGarmentPathDs]
  );

  useLayoutEffect(() => {
    if (!bundledAssetTexts || effectiveGarmentMarkup == null) return;
    const gFront = garmentFrontSvgRef.current;
    const gBack = garmentBackSvgRef.current;
    if (!gFront || !gBack) return;

    const garmentKey = effectiveGarmentMarkup;
    const garmentMountedOk =
      lastMountedGarmentKeyRef.current === garmentKey ||
      installGradedGarmentDomFromMarkup(
        garmentKey,
        gFront,
        gBack,
        garmentOriginalOutlineDs,
        garmentOriginalBehindOutlineDs
      );
    if (!garmentMountedOk) {
      toast.error("ガーメント SVG の DOM 取り込みに失敗しました");
      garmentFlatCmDomReadyRef.current = false;
      setFitSnapFront(null);
      setFitSnapBack(null);
      return;
    }
    lastMountedGarmentKeyRef.current = garmentKey;
    garmentFlatCmDomReadyRef.current = true;
    const markupJustChanged = prevEffectiveGarmentMarkupForGradeBaselineRef.current !== garmentKey;
    const baselineForImmediate = markupJustChanged ? garmentCm : outlineGradeBaselineCm;
    const immediateShapeDeltas = garmentFlatCmToShapeDeltas(garmentCm, baselineForImmediate);
    if (markupJustChanged) {
      prevEffectiveGarmentMarkupForGradeBaselineRef.current = garmentKey;
      setOutlineGradeBaselineCm({ ...garmentCm });
    }
    applyGarmentScene(immediateShapeDeltas);

    const spec = buildGarmentFlatCmGradingSpecFromFrontAndBackSvg(gFront, gBack, garmentCm, garmentKey);
    const { front: frontBodyVariant, back: backBodyVariant } = GRID_PREVIEW_BODY_VARIANTS;
    const rigTplFront = getBodyRigLinePathsTemplate(frontBodyVariant);
    const rigTplBack = getBodyRigLinePathsTemplate(backBodyVariant);
    if (
      spec == null ||
      rigTplFront.length === 0 ||
      rigTplBack.length === 0 ||
      rigTplFront.length !== rigTplBack.length ||
      (spec.debugRigPathDs?.length ?? 0) !== rigTplFront.length
    ) {
      setFitSnapFront(null);
      setFitSnapBack(null);
    } else {
      const baseSnapOpts = {
        height,
        weight,
        garment: "custom" as const,
        shirtSize: PREVIEW_SHIRT_SIZE,
        jacketSize: PREVIEW_JACKET_SIZE,
        animProgress: 1,
        fromSize: null,
        toSize: null,
        fromCustomGarmentData: null,
        toCustomGarmentData: null,
        rigBodyEnabled: false,
      };
      const specWithRear = mergeRearGarmentMarkupIntoFlatCmSpec(spec, uploadedRearGarmentMarkup, garmentCm);
      const specBack = resolveGarmentDataForPreviewView(specWithRear, "back");
      setFitSnapFront(
        computeFittingCanvasSnapshot({
          ...baseSnapOpts,
          customGarmentData: spec,
          bodyModelVariant: frontBodyVariant,
          rigLinePaths: rigTplFront,
          respectRequestedBodyModelVariant: true,
        })
      );
      setFitSnapBack(
        computeFittingCanvasSnapshot({
          ...baseSnapOpts,
          customGarmentData: specBack,
          bodyModelVariant: backBodyVariant,
          rigLinePaths: rigTplBack,
          respectRequestedBodyModelVariant: true,
        })
      );
    }

    const raf = requestAnimationFrame(() => applyGarmentScene());
    return () => cancelAnimationFrame(raf);
  }, [
    bundledAssetTexts,
    effectiveGarmentMarkup,
    applyGarmentScene,
    garmentCm,
    height,
    weight,
    uploadedRearGarmentMarkup,
    outlineGradeBaselineCm,
  ]);

  return {
    tab,
    setTab,
    presetsState,
    garmentCm,
    setGarmentCm,
    presetNameDraft,
    setPresetNameDraft,
    editingGarmentField,
    setEditingGarmentField,
    garmentFieldDraft,
    setGarmentFieldDraft,
    uploadedGarmentMarkup,
    uploadedRearGarmentMarkup,
    bundledAssetTexts,
    loadError,
    showModelRig,
    setShowModelRig,
    fitSnapFront,
    fitSnapBack,
    garmentFrontSvgRef,
    garmentBackSvgRef,
    garmentSvgUploadRef,
    rearGarmentSvgUploadRef,
    skipNextGarmentCmFieldBlurRef,
    activeGarmentCmFieldRef,
    sleevePxPerCmLive,
    overlay,
    bmi,
    buildGarmentSpec,
    applyUserPreset,
    deleteUserPreset,
    persistGarmentCm,
    overwriteActivePreset,
    loadGarmentCm,
    loadBundledGarment,
    onGarmentSvgFileChange,
    onRearGarmentSvgFileChange,
    applyGarmentSvgText,
    applyRearGarmentSvgText,
  };
}

export type GarmentFlatCmGradingFittingCtx = ReturnType<typeof useGarmentFlatCmGradingFitting>;
