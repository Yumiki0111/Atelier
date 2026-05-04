"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MutableRefObject,
} from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveCustomSvgPathRenderablePaint } from "@/app/(main)/development/fitting/customGarment/resolveCustomSvgPathRenderablePaint";
import { getBodyRigLinePathsTemplate } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import { computeFittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasCompute";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";
import {
  BDY_L_X,
  BDY_R_X,
  GRADING_V4_GARMENT_BACK_LAYER_IDS,
  GRADING_V4_GARMENT_VIEWBOX,
  GRADING_V4_GRID_BODY_SILHOUETTE_STROKE,
  GRADING_V4_PREVIEW_BG,
  GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
  GRADING_V4_PATH_ZONES,
  gradingV4GridBodyPathEndsClosed,
  gradingV4UsesLayeredGridBodySilhouette,
  MEASURE_BODY_LENGTH_BASE_PX,
  MEASURE_SLEEVE_L_VERTS,
  SH_L_X,
  SH_R_X,
} from "./gradingV4Constants";
import { gradingV4GarmentPointDelta, rewriteGradingV4GarmentPath } from "./gradingV4GarmentDeform";
import {
  GRADING_V4_BASE_FLAT_CM,
  GRADING_V4_SLEEVE_PX_PER_CM,
  GRADING_V4_WEAR_DISPLAY_BODY,
  GRADING_V4_WEAR_DISPLAY_SHOULDER,
  GRADING_V4_WEAR_DISPLAY_SLEEVE,
  garmentFlatCmToGradeDeltas,
  gradingV4SleeveEffectivePxPerCm,
  type GradingV4GarmentFlatCm,
} from "./gradingV4GarmentCm";
import {
  getCmForActive,
  loadGradingV4PresetsState,
  saveGradingV4PresetsState,
  type GradingV4PresetsState,
} from "./gradingV4GarmentPresetsStorage";
import { buildGradingV4GarmentSpecFromFrontAndBackSvg } from "./buildGradingV4GarmentSpecForProductDb";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import {
  GARMENT_FILL,
  PREVIEW_JACKET_SIZE,
  PREVIEW_SHIRT_SIZE,
} from "@/features/preview/widget-style-product-preview-fit-constants";

const GARMENT_SRC = "/fitting-models/grading-v4-garment.svg";

const SVG_NS = "http://www.w3.org/2000/svg";
function appendSerializedSvgChildren(parent: SVGGElement | SVGSVGElement, serializedFragments: string): void {
  if (!serializedFragments) return;
  const holder = document.createElement("div");
  holder.innerHTML = `<svg xmlns="${SVG_NS}">${serializedFragments}</svg>`;
  const tmpSvg = holder.querySelector("svg");
  if (!tmpSvg) return;
  while (tmpSvg.firstChild) {
    parent.appendChild(tmpSvg.firstChild);
  }
}

function ensureBackPathDefaultFill(svg: SVGSVGElement): void {
  svg.querySelectorAll("path").forEach((p) => {
    if (p.getAttribute("fill") == null) p.setAttribute("fill", "none");
  });
}

/** viewBox を比較用に正規化（連続空白 → 単一スペース） */
function normalizeViewBox(v: string | null | undefined): string | null {
  if (!v?.trim()) return null;
  return v.trim().replace(/\s+/g, " ");
}

function countKnownGradingV4GarmentPaths(svgRoot: Element): number {
  let n = 0;
  svgRoot.querySelectorAll("path[id]").forEach((el) => {
    const id = el.getAttribute("id");
    if (id && id in GRADING_V4_PATH_ZONES) {
      n += 1;
    }
  });
  return n;
}

/**
 * アップロード SVG が v4 変形（path id × ゾーン）として使えるか検査する。
 * @returns 問題があればメッセージ、なければ null
 */
function validateUploadedGradingV4GarmentMarkup(markup: string): string | null {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    return "SVG の解析に失敗しました（不正なマークアップの可能性があります）";
  }
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") {
    return "ルート要素が <svg> ではありません";
  }
  const known = countKnownGradingV4GarmentPaths(root);
  if (known === 0) {
    return "標準の grading-v4-garment.svg と同一の path id（グループ構成）がありません。この画面の変形ルールが path に掛かりません。";
  }
  return null;
}

function maybeWarnGradingV4GarmentViewBox(markup: string): void {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return;
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") return;
  const vb = normalizeViewBox(root.getAttribute("viewBox"));
  const expectedVb = normalizeViewBox(GRADING_V4_GARMENT_VIEWBOX);
  if (!vb) {
    toast.warning("ガーメント SVG に viewBox がありません。プレビューのスケールがずれる可能性があります。");
    return;
  }
  if (expectedVb != null && vb !== expectedVb) {
    toast.warning(
      `viewBox が標準 (${GRADING_V4_GARMENT_VIEWBOX}) と異なります（${vb}）。背面レイヤや試着との位置合わせがずれる場合があります。`
    );
  }
}

function collectGarmentOriginalPathDs(srcRoot: Element): Record<string, string> {
  const garmentOriginalDs: Record<string, string> = {};
  srcRoot.querySelectorAll("path").forEach((p) => {
    const id = p.getAttribute("id");
    const d = p.getAttribute("d");
    if (id && d) {
      garmentOriginalDs[id] = d;
    }
  });
  return garmentOriginalDs;
}

/**
 * 前面・背面レイヤおよび `garmentOriginalDs` を、与えられたガーメント SVG の内容で置き換える。
 */
function installGradedGarmentDomFromMarkup(
  garmentSvgMarkup: string,
  garmentFrontSvg: SVGSVGElement,
  garmentBackSvg: SVGSVGElement,
  garmentOriginalDs: MutableRefObject<Record<string, string>>
): boolean {
  const gDoc = new DOMParser().parseFromString(garmentSvgMarkup, "image/svg+xml");
  const srcRoot = gDoc.documentElement;
  const parseFailed = gDoc.getElementsByTagName("parsererror").length > 0 || srcRoot.tagName.toLowerCase() !== "svg";
  if (parseFailed) {
    return false;
  }

  garmentOriginalDs.current = collectGarmentOriginalPathDs(srcRoot);

  const cloneFront = srcRoot.cloneNode(true) as SVGSVGElement;
  for (const id of GRADING_V4_GARMENT_BACK_LAYER_IDS) {
    cloneFront.querySelector(`#${CSS.escape(id)}`)?.remove();
  }
  garmentFrontSvg.replaceChildren(...Array.from(cloneFront.children).map((n) => document.importNode(n, true)));

  const ser = new XMLSerializer();
  const serializeIds = (ids: readonly string[]) =>
    ids
      .map((id) => {
        const node = srcRoot.querySelector(`#${CSS.escape(id)}`);
        return node ? ser.serializeToString(node) : "";
      })
      .join("");
  const backFragments = serializeIds(GRADING_V4_GARMENT_BACK_LAYER_IDS);
  installGarmentBackBehindModelOnly(garmentBackSvg, backFragments);
  garmentFrontSvg.querySelector("#rig")?.setAttribute("display", "none");
  return true;
}

/**
 * 背面ガーメントのみ（マスクなし）。試着レイヤ順でボディより下。
 */
function installGarmentBackBehindModelOnly(svg: SVGSVGElement, serializedFragments: string): void {
  svg.replaceChildren();
  const wrap = document.createElementNS(SVG_NS, "g");
  wrap.setAttribute("fill", "none");
  appendSerializedSvgChildren(wrap, serializedFragments);
  svg.appendChild(wrap);
  ensureBackPathDefaultFill(svg);
}

function measureOpenPolylineLength(verts: ReadonlyArray<readonly [number, number]>): number {
  let s = 0;
  for (let i = 0; i < verts.length - 1; i++) {
    const a = verts[i];
    const b = verts[i + 1];
    s += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return s;
}

function flatCmEqual(a: GradingV4GarmentFlatCm | null, b: GradingV4GarmentFlatCm): boolean {
  if (!a) return false;
  return (
    a.shoulder === b.shoulder &&
    a.bodyWidth === b.bodyWidth &&
    a.bodyLength === b.bodyLength &&
    a.sleeve === b.sleeve
  );
}

function fmtMeasureLabel(base: number, delta: number): { text: string; accent: boolean } {
  const cur = Math.round(base + delta);
  const d = Math.round(delta);
  return {
    text: `${cur} px${d !== 0 ? ` (${d > 0 ? "+" : ""}${d})` : ""}`,
    accent: d !== 0,
  };
}

function clampCm(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function parseCmInputDraft(raw: string): number | null {
  const s = raw.replace(",", ".").trim();
  if (s === "" || s === "-" || s === "." || s === "-.") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function clampGarmentCmKey(key: keyof GradingV4GarmentFlatCm, n: number): number {
  const lo =
    key === "shoulder"
      ? 34
      : key === "bodyWidth"
        ? 38
        : key === "bodyLength"
          ? 54
          : 45;
  const hi =
    key === "shoulder"
      ? 62
      : key === "bodyWidth"
        ? 72
        : key === "bodyLength"
          ? 92
          : 100;
  return clampCm(n, lo, hi);
}

function formatCmInputValue(n: number): string {
  return String(round1(n));
}

function presetNameDraftForState(s: GradingV4PresetsState): string {
  const active =
    s.activeUserPresetId != null
      ? s.userPresets.find((p) => p.id === s.activeUserPresetId)
      : undefined;
  return active?.name ?? `サイズ${s.userPresets.length + 1}`;
}

export interface GradingV4FittingProps {
  height: number;
  weight: number;
  onHeightChange: (cm: number) => void;
  onWeightChange: (kg: number) => void;
  className?: string;
}

export interface GradingV4FittingHandle {
  /** 前面 SVG が未準備なら null */
  buildGarmentSpecForProductDb: () => CustomGarmentData | null;
}

export const GradingV4Fitting = forwardRef<GradingV4FittingHandle, GradingV4FittingProps>(
  function GradingV4Fitting({ height, weight, onHeightChange, onWeightChange, className }, ref) {
  const [tab, setTab] = useState<"garment" | "model">("garment");
  const [presetsState, setPresetsState] = useState<GradingV4PresetsState | null>(null);
  const [garmentCm, setGarmentCm] = useState<GradingV4GarmentFlatCm>(() => ({
    ...GRADING_V4_BASE_FLAT_CM,
  }));
  const [presetNameDraft, setPresetNameDraft] = useState("");
  const [editingGarmentField, setEditingGarmentField] = useState<keyof GradingV4GarmentFlatCm | null>(null);
  const [garmentFieldDraft, setGarmentFieldDraft] = useState("");
  const [uploadedGarmentMarkup, setUploadedGarmentMarkup] = useState<string | null>(null);
  const [bundledAssetTexts, setBundledAssetTexts] = useState<{ garment: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModelRig, setShowModelRig] = useState(false);
  const [fitSnap, setFitSnap] = useState<FittingCanvasSnapshot | null>(null);

  const garmentFrontSvgRef = useRef<SVGSVGElement | null>(null);
  const garmentBackSvgRef = useRef<SVGSVGElement | null>(null);
  const garmentOriginalDs = useRef<Record<string, string>>({});
  const gradingV4DomReadyRef = useRef(false);
  /** 同一マークアップでの再インポートを避けるための実効ガーメント文字列キー */
  const lastMountedGarmentKeyRef = useRef<string | null>(null);
  const garmentSvgUploadRef = useRef<HTMLInputElement | null>(null);
  const skipNextGarmentCmFieldBlurRef = useRef(false);
  const activeGarmentCmFieldRef = useRef<keyof GradingV4GarmentFlatCm | null>(null);

  const effectiveGarmentMarkup = useMemo(() => {
    if (!bundledAssetTexts) return null;
    return uploadedGarmentMarkup ?? bundledAssetTexts.garment;
  }, [bundledAssetTexts, uploadedGarmentMarkup]);

  useLayoutEffect(() => {
    const s = loadGradingV4PresetsState();
    setPresetsState(s);
    setGarmentCm(getCmForActive(s));
    setPresetNameDraft(presetNameDraftForState(s));
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      buildGarmentSpecForProductDb: () => {
        if (!gradingV4DomReadyRef.current) return null;
        const front = garmentFrontSvgRef.current;
        if (!front) return null;
        const back = garmentBackSvgRef.current;
        const mk = effectiveGarmentMarkup;
        return buildGradingV4GarmentSpecFromFrontAndBackSvg(front, back, garmentCm, mk ?? undefined);
      },
    }),
    [garmentCm, effectiveGarmentMarkup]
  );

  const { dSh, dBw, dBl, dSleeveLengthPx } = useMemo(
    () => garmentFlatCmToGradeDeltas(garmentCm),
    [garmentCm]
  );

  const sleevePxPerCmLive = useMemo(
    () => gradingV4SleeveEffectivePxPerCm(garmentCm.bodyLength),
    [garmentCm.bodyLength]
  );

  const resetToBundledGarment = useCallback(() => {
    setUploadedGarmentMarkup(null);
    lastMountedGarmentKeyRef.current = null;
    gradingV4DomReadyRef.current = false;
    const el = garmentSvgUploadRef.current;
    if (el) {
      el.value = "";
    }
  }, []);

  const onGarmentSvgFileChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result;
      if (typeof raw !== "string") {
        toast.error("ファイルの読み込みに失敗しました");
        return;
      }
      const err = validateUploadedGradingV4GarmentMarkup(raw);
      if (err) {
        toast.error(err);
        const el = garmentSvgUploadRef.current;
        if (el) {
          el.value = "";
        }
        return;
      }
      maybeWarnGradingV4GarmentViewBox(raw);
      lastMountedGarmentKeyRef.current = null;
      gradingV4DomReadyRef.current = false;
      setUploadedGarmentMarkup(raw);
      toast.success("ガーメント SVG を読み込みました。平置きcm は標準ガーメントと同じ変形ルールです。");
    };
    reader.onerror = () => {
      toast.error("ファイルの読み込みに失敗しました");
    };
    reader.readAsText(file);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const gr = await fetch(GARMENT_SRC).then((r) => {
          if (!r.ok) throw new Error(`garment ${r.status}`);
          return r.text();
        });
        if (!cancelled) setBundledAssetTexts({ garment: gr });
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const overlay = useMemo(() => {
    const sh = fmtMeasureLabel(SH_R_X - SH_L_X, dSh * 2);
    const bw = fmtMeasureLabel(BDY_R_X - BDY_L_X, dBw * 2);
    const bl = fmtMeasureLabel(MEASURE_BODY_LENGTH_BASE_PX, dBl);
    const baseSl = measureOpenPolylineLength(MEASURE_SLEEVE_L_VERTS);
    const warpedSl = MEASURE_SLEEVE_L_VERTS.map(([x, y]) => {
      const [dx, dy] = gradingV4GarmentPointDelta(
        x,
        y,
        "sleeve_L",
        dSh,
        dBw,
        dBl,
        dSleeveLengthPx
      );
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

  const applyUserPreset = useCallback((id: string) => {
    activeGarmentCmFieldRef.current = null;
    setEditingGarmentField(null);
    setPresetsState((prev) => {
      if (!prev) return prev;
      const p = prev.userPresets.find((x) => x.id === id);
      if (!p) return prev;
      const next: GradingV4PresetsState = { ...prev, activeUserPresetId: id };
      saveGradingV4PresetsState(next);
      setGarmentCm({ ...p.cm });
      setPresetNameDraft(p.name);
      return next;
    });
  }, []);

  const deleteUserPreset = useCallback(
    (id: string) => {
      if (!presetsState) return;
      const victim = presetsState.userPresets.find((x) => x.id === id);
      if (!victim) return;
      activeGarmentCmFieldRef.current = null;
      setEditingGarmentField(null);
      const userPresets = presetsState.userPresets.filter((x) => x.id !== id);
      const activeUserPresetId =
        presetsState.activeUserPresetId === id ? userPresets[0]?.id ?? null : presetsState.activeUserPresetId;
      const next: GradingV4PresetsState = { activeUserPresetId, userPresets };
      saveGradingV4PresetsState(next);
      setPresetsState(next);
      setGarmentCm(getCmForActive(next));
      setPresetNameDraft(presetNameDraftForState(next));
      toast.success(`「${victim.name}」を削除しました`);
    },
    [presetsState]
  );

  const persistGarmentCm = useCallback(() => {
    if (!presetsState) return;
    const idx = presetsState.userPresets.length + 1;
    const name = presetNameDraft.trim() || `サイズ${idx}`;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `preset-${Date.now()}`;
    const cm = { ...garmentCm };
    const next: GradingV4PresetsState = {
      activeUserPresetId: id,
      userPresets: [...presetsState.userPresets, { id, name, cm }],
    };
    setPresetsState(next);
    saveGradingV4PresetsState(next);
    setPresetNameDraft(presetNameDraftForState(next));
    toast.success(`「${name}」を保存し、画面に反映しました`);
  }, [presetsState, garmentCm, presetNameDraft]);

  const overwriteActivePreset = useCallback(() => {
    if (!presetsState?.activeUserPresetId) return;
    const id = presetsState.activeUserPresetId;
    const prevP = presetsState.userPresets.find((x) => x.id === id);
    if (!prevP) return;
    activeGarmentCmFieldRef.current = null;
    setEditingGarmentField(null);
    const trimmed = presetNameDraft.trim();
    const name = trimmed || prevP.name;
    const cm = { ...garmentCm };
    const userPresets = presetsState.userPresets.map((p) => (p.id === id ? { ...p, name, cm } : p));
    const next: GradingV4PresetsState = { ...presetsState, userPresets };
    setPresetsState(next);
    saveGradingV4PresetsState(next);
    setPresetNameDraft(name);
    toast.success(`「${name}」の登録内容を更新しました`);
  }, [presetsState, garmentCm, presetNameDraft]);

  const loadGarmentCm = useCallback(() => {
    activeGarmentCmFieldRef.current = null;
    setEditingGarmentField(null);
    const s = loadGradingV4PresetsState();
    setPresetsState(s);
    setGarmentCm(getCmForActive(s));
    setPresetNameDraft(presetNameDraftForState(s));
    toast.success("保存済みの選択・プリセットを読み込みました");
  }, []);

  const applyGarmentPathDs = useCallback((gRoot: SVGSVGElement | null) => {
    if (!gRoot) return;
    gRoot.querySelectorAll("path").forEach((p) => {
      const id = p.getAttribute("id");
      const orig = id ? garmentOriginalDs.current[id] : null;
      if (!id || !orig) return;
      const zone = GRADING_V4_PATH_ZONES[id];
      if (!zone) return;
      const newD = rewriteGradingV4GarmentPath(orig, zone, dSh, dBw, dBl, dSleeveLengthPx);
      p.setAttribute("d", newD);
    });
  }, [dSh, dBw, dBl, dSleeveLengthPx]);

  const applyGarmentScene = useCallback(() => {
    const gFront = garmentFrontSvgRef.current;
    const gBack = garmentBackSvgRef.current;
    if (!gFront || !gBack || !gradingV4DomReadyRef.current) {
      return;
    }

    applyGarmentPathDs(gBack);
    applyGarmentPathDs(gFront);

    const measuresG = gFront.querySelector("#measures");
    if (measuresG) {
      measuresG.setAttribute("display", "none");
    }
  }, [applyGarmentPathDs]);

  useLayoutEffect(() => {
    if (!bundledAssetTexts || effectiveGarmentMarkup == null) return;
    const gFront = garmentFrontSvgRef.current;
    const gBack = garmentBackSvgRef.current;
    if (!gFront || !gBack) return;

    const garmentKey = effectiveGarmentMarkup;
    const garmentMountedOk =
      lastMountedGarmentKeyRef.current === garmentKey ||
      installGradedGarmentDomFromMarkup(garmentKey, gFront, gBack, garmentOriginalDs);
    if (!garmentMountedOk) {
      toast.error("ガーメント SVG の DOM 取り込みに失敗しました");
      gradingV4DomReadyRef.current = false;
      setFitSnap(null);
      return;
    }
    lastMountedGarmentKeyRef.current = garmentKey;

    gradingV4DomReadyRef.current = true;

    applyGarmentScene();

    const spec = buildGradingV4GarmentSpecFromFrontAndBackSvg(gFront, gBack, garmentCm, garmentKey);
    const rigTpl = getBodyRigLinePathsTemplate("gridSvgBody");
    if (
      spec == null ||
      rigTpl.length === 0 ||
      (spec.debugRigPathDs?.length ?? 0) !== rigTpl.length
    ) {
      setFitSnap(null);
    } else {
      setFitSnap(
        computeFittingCanvasSnapshot({
          height,
          weight,
          garment: "custom",
          shirtSize: PREVIEW_SHIRT_SIZE,
          jacketSize: PREVIEW_JACKET_SIZE,
          customGarmentData: spec,
          animProgress: 1,
          fromSize: null,
          toSize: null,
          fromCustomGarmentData: null,
          toCustomGarmentData: null,
          rigBodyEnabled: false,
          bodyModelVariant: "gridSvgBody",
          rigLinePaths: rigTpl,
        })
      );
    }

    const raf = requestAnimationFrame(() => {
      applyGarmentScene();
    });
    return () => cancelAnimationFrame(raf);
  }, [bundledAssetTexts, effectiveGarmentMarkup, applyGarmentScene, garmentCm, height, weight]);

  const ink = "#1A1A18";
  const rule = "#D8D4CC";
  const accent = "#C8432A";
  const muted = "#9A9590";
  const panel = "#EDEAE4";
  const bg = GRADING_V4_PREVIEW_BG;
  const previewGarmentStrokeFallback = "rgba(45,45,45,0.9)";
  const previewGarmentDefaultStrokeWidth = 1;
  return (
    <div
      className={cn(
        "grid min-h-[min(100vh-12rem,640px)] w-full gap-0 overflow-hidden rounded-md border text-[#1A1A18] md:grid-cols-[272px_1fr] md:grid-rows-[auto_1fr]",
        className
      )}
      style={{ background: bg, borderColor: rule }}
    >
      <header
        className="flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b px-5 py-3.5 md:col-span-2"
        style={{ borderColor: rule }}
      >
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: ink }}>
          Garment Grading v4
        </h2>
        <span className="min-w-0 font-mono text-[10px]" style={{ color: muted }}>
          平置きcm（4項目）→ px 換算 · 肩・身幅は着用見え補正 {GRADING_V4_WEAR_DISPLAY_SHOULDER} /{" "}
          {GRADING_V4_WEAR_DISPLAY_BODY}
        </span>
        <div
          className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px]"
          style={{ color: muted }}
        >
          <input
            ref={garmentSvgUploadRef}
            type="file"
            accept=".svg,image/svg+xml,text/svg+xml"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={onGarmentSvgFileChange}
          />
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 border border-transparent px-1 py-0.5 text-[10px] transition-colors hover:text-foreground disabled:opacity-40"
            style={{ color: muted }}
            disabled={!bundledAssetTexts}
            title="標準 grading-v4-garment.svg と同じ path id 構成の SVG。平置きcm の変形は同一ルール。"
            onClick={() => garmentSvgUploadRef.current?.click()}
          >
            <Upload className="size-3.5" strokeWidth={2} aria-hidden />
            服SVG
          </button>
          <button
            type="button"
            className="inline-flex shrink-0 items-center border px-2 py-0.5 transition-colors hover:bg-muted disabled:opacity-40"
            style={{ borderColor: rule }}
            disabled={uploadedGarmentMarkup == null}
            title="読み込んだガーメントをやめ、アセットの標準ガーメントに戻す"
            onClick={resetToBundledGarment}
          >
            標準ガーメント
          </button>
          <label
            className="flex cursor-pointer select-none items-center gap-1.5"
            title="試着ボディの輪郭線は常時表示。このチェックでリグ（シャフト等）だけを重ねます。"
          >
            <input
              type="checkbox"
              className="size-3 accent-[#1A1A18] ring-offset-[#F5F3EF] focus-visible:ring-1 focus-visible:ring-[#1A1A18]/30"
              checked={showModelRig}
              onChange={(e) => setShowModelRig(e.target.checked)}
            />
            リグのみ表示
          </label>
        </div>
      </header>

      <aside
        className="flex max-h-[min(50vh,420px)] flex-col gap-0 overflow-y-auto overflow-x-hidden border-r p-4 md:max-h-none"
        style={{ borderColor: rule }}
      >
        <div className="mb-4 flex shrink-0 gap-0.5">
          {(
            [
              ["garment", "Garment"],
              ["model", "Model"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={cn(
                "flex-1 border py-1.5 font-mono text-[10px] transition-colors",
                tab === k ? "text-[#F5F3EF]" : "text-muted-foreground"
              )}
              style={{
                borderColor: rule,
                background: tab === k ? ink : "transparent",
              }}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "garment" && (
          <div className="flex flex-col gap-4 pb-4 pt-1" style={{ color: ink }}>
            <div>
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: muted }}>
                登録サイズ（切替 · 上書き保存 · 削除 · 画面に即反映）
              </div>
              {presetsState && presetsState.userPresets.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {presetsState.userPresets.map((pr) => {
                    const selected =
                      presetsState.activeUserPresetId === pr.id && flatCmEqual(pr.cm, garmentCm);
                    const cmSummary = [
                      `肩 ${formatCmInputValue(pr.cm.shoulder)}`,
                      `身 ${formatCmInputValue(pr.cm.bodyWidth)}`,
                      `着 ${formatCmInputValue(pr.cm.bodyLength)}`,
                      `袖 ${formatCmInputValue(pr.cm.sleeve)}`,
                    ].join(" · ");
                    return (
                      <div key={pr.id} className="flex w-full max-w-full items-stretch gap-px">
                        <button
                          type="button"
                          className={cn(
                            "min-w-0 flex-1 border px-2 py-2 text-left font-mono text-[11px] transition-colors",
                            selected ? "text-[#F5F3EF]" : ""
                          )}
                          style={{
                            borderColor: rule,
                            background: selected ? ink : "transparent",
                          }}
                          title={`${pr.name} — ${cmSummary} cm`}
                          disabled={!presetsState}
                          onMouseDown={() => {
                            if (activeGarmentCmFieldRef.current) skipNextGarmentCmFieldBlurRef.current = true;
                          }}
                          onClick={() => applyUserPreset(pr.id)}
                        >
                          <div className="truncate leading-tight">{pr.name}</div>
                          <div
                            className={cn(
                              "mt-0.5 truncate font-mono text-[9px] leading-snug",
                              selected ? "text-[#F5F3EF]/80" : "text-muted-foreground"
                            )}
                          >
                            {cmSummary}{" "}
                            <span className="tabular-nums">cm</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className="flex shrink-0 items-center justify-center border px-2 py-2 font-mono text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                          style={{ borderColor: rule }}
                          title={`「${pr.name}」を削除`}
                          aria-label={`「${pr.name}」を削除`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (activeGarmentCmFieldRef.current) skipNextGarmentCmFieldBlurRef.current = true;
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteUserPreset(pr.id);
                          }}
                        >
                          <Trash2 className="size-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] leading-snug" style={{ color: muted }}>
                  まだ登録がありません。「この寸法を登録（保存）」でここに並び、タップで切り替えできます。
                </p>
              )}
            </div>

            <div>
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: muted }}>
                平置き（cm）· canvas 反映
              </div>
              <p className="mb-2 text-[10px] leading-snug" style={{ color: muted }}>
                下の数値がそのまま画面のグレードに使われます。登録サイズを選んでいないときの初期値だけ、S
                基準アートに合わせた目安（肩{GRADING_V4_BASE_FLAT_CM.shoulder} · 身
                {GRADING_V4_BASE_FLAT_CM.bodyWidth} · 着{GRADING_V4_BASE_FLAT_CM.bodyLength} · 袖
                {GRADING_V4_BASE_FLAT_CM.sleeve}）から始まります。
              </p>
              <p className="mb-2 text-[10px] leading-snug" style={{ color: muted }}>
                初期の袖 {GRADING_V4_BASE_FLAT_CM.sleeve}cm は、S 基準アートのシルエットに対応する平置きの絶対値です（基準 cm
                ＋あなたの入力のような二重加算にはなりません）。弧への伸ばしは
                <span className="font-mono"> (袖cm − {GRADING_V4_BASE_FLAT_CM.sleeve}) </span>だけです。袖の px/cm は
                <span className="font-mono"> 身頃REF÷着丈入力 </span>に連動します（今
                {garmentCm.bodyLength}cm → 実効 {sleevePxPerCmLive.toFixed(2)} px/cm、S・68 の目安は{" "}
                {GRADING_V4_SLEEVE_PX_PER_CM.toFixed(2)}）。試着見え{" "}
                {Math.round(GRADING_V4_WEAR_DISPLAY_SLEEVE * 100)}% を弧長換算に乗じ、稜線は同一伸び率です。
              </p>
              {(
                [
                  ["肩幅（平置き）", "shoulder", "cm"],
                  ["身幅（平置き）", "bodyWidth", "cm"],
                  ["着丈（平置き）", "bodyLength", "cm"],
                  ["袖丈（平置き・入力は絶対cm）", "sleeve", "cm"],
                ] as const
              ).map(([label, key, unit]) => (
                <label key={key} className="mb-2.5 block text-[11px]">
                  <div className="mb-0.5 flex justify-between">
                    <span>{label}</span>
                    <span className="font-mono text-[10px]" style={{ color: accent }}>
                      {garmentCm[key]} {unit}
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={editingGarmentField === key ? garmentFieldDraft : formatCmInputValue(garmentCm[key])}
                    placeholder={
                      key === "shoulder"
                        ? "34–62"
                        : key === "bodyWidth"
                          ? "38–72"
                          : key === "bodyLength"
                            ? "54–92"
                            : "45–100"
                    }
                    className="w-full border bg-transparent px-1.5 py-1 font-mono text-[11px] outline-none focus:ring-1 focus:ring-foreground/20"
                    style={{ borderColor: rule }}
                    onFocus={() => {
                      activeGarmentCmFieldRef.current = key;
                      setEditingGarmentField(key);
                      setGarmentFieldDraft(formatCmInputValue(garmentCm[key]));
                    }}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setGarmentFieldDraft(raw);
                      const n = parseCmInputDraft(raw);
                      if (n !== null) {
                        setGarmentCm((prev) => ({
                          ...prev,
                          [key]: round1(clampGarmentCmKey(key, n)),
                        }));
                      }
                    }}
                    onBlur={(e) => {
                      if (editingGarmentField !== key) return;
                      if (skipNextGarmentCmFieldBlurRef.current) {
                        skipNextGarmentCmFieldBlurRef.current = false;
                        activeGarmentCmFieldRef.current = null;
                        setEditingGarmentField(null);
                        return;
                      }
                      const raw = e.currentTarget.value;
                      setGarmentCm((prev) => {
                        const n = parseCmInputDraft(raw);
                        const nextVal =
                          n !== null ? round1(clampGarmentCmKey(key, n)) : round1(prev[key]);
                        return { ...prev, [key]: nextVal };
                      });
                      activeGarmentCmFieldRef.current = null;
                      setEditingGarmentField(null);
                    }}
                  />
                </label>
              ))}
              <label className="mt-2 block text-[11px]">
                <div className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: muted }}>
                  サイズ名（新規・選択中を上書きするとき共通）
                </div>
                <input
                  type="text"
                  value={presetNameDraft}
                  placeholder={`サイズ${(presetsState?.userPresets.length ?? 0) + 1}`}
                  autoComplete="off"
                  className="w-full border bg-transparent px-1.5 py-1.5 font-mono text-[11px] outline-none focus:ring-1 focus:ring-foreground/20"
                  style={{ borderColor: rule }}
                  disabled={!presetsState}
                  onChange={(e) => setPresetNameDraft(e.target.value)}
                />
              </label>
              <div className="mt-2 flex flex-col gap-1.5">
                <button
                  type="button"
                  className="border py-2 font-mono text-[10px]"
                  style={{ borderColor: rule, background: "transparent", color: ink }}
                  disabled={!presetsState?.activeUserPresetId}
                  onMouseDown={() => {
                    if (activeGarmentCmFieldRef.current) skipNextGarmentCmFieldBlurRef.current = true;
                  }}
                  onClick={overwriteActivePreset}
                >
                  選択中の登録を上書き保存
                </button>
                <button
                  type="button"
                  className="border py-2 font-mono text-[10px]"
                  style={{ borderColor: rule, background: ink, color: bg }}
                  disabled={!presetsState}
                  onClick={persistGarmentCm}
                >
                  この寸法を登録（保存）
                </button>
                <button
                  type="button"
                  className="border py-2 font-mono text-[10px]"
                  style={{ borderColor: rule, background: "transparent", color: ink }}
                  onMouseDown={() => {
                    if (activeGarmentCmFieldRef.current) skipNextGarmentCmFieldBlurRef.current = true;
                  }}
                  onClick={loadGarmentCm}
                >
                  保存した寸法を読込
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: muted }}>
                Grade Rules / step（参考・旧px級差）
              </div>
              <table className="w-full border-collapse text-left font-mono text-[10px]">
                <thead>
                  <tr style={{ color: muted }}>
                    <th className="border-b py-1 font-normal uppercase tracking-[0.1em]" style={{ borderColor: rule }}>
                      部位
                    </th>
                    <th className="border-b py-1 font-normal uppercase tracking-[0.1em]" style={{ borderColor: rule }}>
                      Δx/side
                    </th>
                    <th className="border-b py-1 text-right font-normal uppercase tracking-[0.1em]" style={{ borderColor: rule }}>
                      Δy
                    </th>
                  </tr>
                </thead>
                <tbody style={{ color: ink }}>
                  <tr className="border-b" style={{ borderColor: rule }}>
                    <td className="py-1.5">shoulder</td>
                    <td className="py-1.5">5 px</td>
                    <td className="py-1.5 text-right" style={{ color: accent }}>
                      0
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: rule }}>
                    <td className="py-1.5">body width</td>
                    <td className="py-1.5">6 px</td>
                    <td className="py-1.5 text-right" style={{ color: accent }}>
                      0
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: rule }}>
                    <td className="py-1.5">body length</td>
                    <td className="py-1.5">0</td>
                    <td className="py-1.5 text-right" style={{ color: accent }}>
                      8 px
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: rule }}>
                    <td className="py-1.5">sleeve（弧）</td>
                    <td className="py-1.5" colSpan={2} style={{ color: muted }}>
                      Δcm × {sleevePxPerCmLive.toFixed(2)} px/cm（着丈{garmentCm.bodyLength}cm 時の実効）を弧長に加算、各稜線 +ε
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "model" && (
          <div className="flex flex-col gap-5 pb-4 pt-1" style={{ color: ink }}>
            <div>
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: muted }}>
                Height
              </div>
              <div className="mb-1 flex justify-between text-[11px]">
                <span>身長 height</span>
                <span className="font-mono" style={{ color: accent }}>
                  {height} cm
                </span>
              </div>
              <input
                type="range"
                min={150}
                max={195}
                step={1}
                value={height}
                className="h-px w-full cursor-pointer appearance-none rounded-none"
                style={{ background: rule }}
                onChange={(e) => onHeightChange(parseInt(e.target.value, 10))}
              />
            </div>
            <div>
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: muted }}>
                Weight
              </div>
              <div className="mb-1 flex justify-between text-[11px]">
                <span>体重 weight</span>
                <span className="font-mono" style={{ color: accent }}>
                  {weight} kg
                </span>
              </div>
              <input
                type="range"
                min={45}
                max={100}
                step={1}
                value={weight}
                className="h-px w-full cursor-pointer appearance-none rounded-none"
                style={{ background: rule }}
                onChange={(e) => onWeightChange(parseInt(e.target.value, 10))}
              />
              <div className="mt-1 flex justify-between text-[10px]" style={{ color: muted }}>
                <span>BMI</span>
                <span className="font-mono">{bmi}</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="relative flex items-center justify-center p-6 md:min-h-[480px]">
        {loadError && (
          <p className="absolute left-3 top-3 max-w-md text-xs text-destructive">
            Grading v4アセットの読み込みに失敗しました: {loadError}
          </p>
        )}
        {!bundledAssetTexts && !loadError && (
          <p className="text-xs text-muted-foreground">アセットを読み込み中…</p>
        )}
        <div className="relative w-full max-w-[min(540px,100%)]">
          <svg
            ref={garmentBackSvgRef}
            aria-hidden
            className="pointer-events-none absolute size-0 overflow-hidden opacity-0"
            viewBox="0 0 389 518"
            xmlns="http://www.w3.org/2000/svg"
          />
          <svg
            ref={garmentFrontSvgRef}
            aria-hidden
            className="pointer-events-none absolute size-0 overflow-hidden opacity-0"
            viewBox="0 0 389 518"
            xmlns="http://www.w3.org/2000/svg"
          />
          <div className="relative isolate mx-auto flex w-full max-w-full items-center justify-center overflow-visible">
            {fitSnap == null ? (
              <div
                className="flex min-h-[min(52vh,380px)] w-full items-center justify-center border border-dashed px-4 text-center font-mono text-[10px] leading-relaxed"
                style={{ borderColor: rule, color: muted, background: `${GRADING_V4_PREVIEW_BG}66` }}
              >
                試着と同じモデル（身長・体重ワープ）がまだ組めません。標準ガーメントを読み込み、前面に #rig 9 本を含めてください。
              </div>
            ) : (
              <svg
                aria-hidden
                className="pointer-events-none block h-auto w-auto max-h-[min(72vh,620px)] max-w-full min-h-0 min-w-0 overflow-visible"
                style={{ aspectRatio: `${fitSnap.viewBoxWidth} / ${fitSnap.viewBoxHeight}` }}
                viewBox={`${fitSnap.viewBoxMinX} 0 ${fitSnap.viewBoxWidth} ${fitSnap.viewBoxHeight}`}
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x={fitSnap.viewBoxMinX}
                  y={0}
                  width={fitSnap.viewBoxWidth}
                  height={fitSnap.viewBoxHeight}
                  fill={GRADING_V4_PREVIEW_BG}
                />
                {(() => {
                  const gradingBehindN = fitSnap.gradingV4BehindBodyPathCount;
                  return (
                    <>
                      {gradingBehindN > 0 ? (
                        <g fill={GARMENT_FILL}>
                          {fitSnap.customPathDs.slice(0, gradingBehindN).map((d, j) => {
                            const i = j;
                            if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
                            const paint = resolveCustomSvgPathRenderablePaint({
                              garmentStrokeFallback: previewGarmentStrokeFallback,
                              pathStroke: fitSnap.customPathStrokes[i],
                              pathFill: fitSnap.customPathFills[i],
                              pathStrokeWidth: fitSnap.customPathStrokeWidths[i],
                              defaultStrokeWidth: previewGarmentDefaultStrokeWidth,
                              allPathStrokes: fitSnap.customPathStrokes,
                              pathIndex: i,
                              preserveFillOnlyPaths: true,
                              gradingBehindHealFillOnlyAsStroke: true,
                              minStrokeWidth: GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
                            });
                            if (paint.omit === true) return null;
                            return (
                              <path
                                key={`g-back-${i}`}
                                d={d}
                                fill={paint.fill}
                                stroke={paint.stroke}
                                strokeWidth={paint.strokeWidth}
                                strokeDasharray={fitSnap.customPathStrokeDasharrays[i] ?? undefined}
                              />
                            );
                          })}
                        </g>
                      ) : null}
                      <g>
                        {gradingV4UsesLayeredGridBodySilhouette(fitSnap.bodyPaths.length) ? (
                          <>
                            <g fill={GRADING_V4_PREVIEW_BG} stroke="none">
                              {fitSnap.bodyPaths.map((d, i) => (
                                <path
                                  key={`bf-${i}`}
                                  d={d}
                                  fill={gradingV4GridBodyPathEndsClosed(d) ? GRADING_V4_PREVIEW_BG : "none"}
                                />
                              ))}
                            </g>
                            <g
                              fill="none"
                              stroke={GRADING_V4_GRID_BODY_SILHOUETTE_STROKE}
                              strokeWidth={4}
                              pointerEvents="none"
                            >
                              {fitSnap.bodyPaths[0] ? (
                                <path key="bo" d={fitSnap.bodyPaths[0]} />
                              ) : null}
                              {fitSnap.bodyPaths.map((d, i) =>
                                i > 0 && !gradingV4GridBodyPathEndsClosed(d) ? (
                                  <path key={`bs-${i}`} d={d} />
                                ) : null
                              )}
                            </g>
                          </>
                        ) : (
                          <g fill={GRADING_V4_PREVIEW_BG} stroke={GRADING_V4_GRID_BODY_SILHOUETTE_STROKE} strokeWidth={4}>
                            {fitSnap.bodyPaths.map((d, i) => (
                              <path key={`b-${i}`} d={d} />
                            ))}
                          </g>
                        )}
                      </g>
                      <g fill={GARMENT_FILL}>
                        {(gradingBehindN > 0 ? fitSnap.customPathDs.slice(gradingBehindN) : fitSnap.customPathDs).map(
                          (d, ji) => {
                            const i = gradingBehindN > 0 ? ji + gradingBehindN : ji;
                            if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
                            const paint = resolveCustomSvgPathRenderablePaint({
                              garmentStrokeFallback: previewGarmentStrokeFallback,
                              pathStroke: fitSnap.customPathStrokes[i],
                              pathFill: fitSnap.customPathFills[i],
                              pathStrokeWidth: fitSnap.customPathStrokeWidths[i],
                              defaultStrokeWidth: previewGarmentDefaultStrokeWidth,
                              allPathStrokes: fitSnap.customPathStrokes,
                              pathIndex: i,
                              preserveFillOnlyPaths: true,
                              minStrokeWidth: GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
                            });
                            if (paint.omit === true) return null;
                            return (
                              <path
                                key={`g-${i}`}
                                d={d}
                                fill={paint.fill}
                                stroke={paint.stroke}
                                strokeWidth={paint.strokeWidth}
                                strokeDasharray={fitSnap.customPathStrokeDasharrays[i] ?? undefined}
                              />
                            );
                          }
                        )}
                      </g>
                      {showModelRig
                        ? fitSnap.rigLineWarpedRigViewPaths.map((d, ri) => (
                            <path
                              key={`rig-${ri}`}
                              d={d}
                              fill="none"
                              stroke="rgba(220,38,38,0.9)"
                              strokeWidth={2.5}
                            />
                          ))
                        : null}
                    </>
                  );
                })()}
              </svg>
            )}
          </div>
          <div
            className="absolute bottom-4 right-4 border p-3 font-mono text-[10px] leading-[1.9]"
            style={{ background: panel, borderColor: rule, color: ink }}
          >
            <div className="flex justify-between gap-[18px]">
              <span style={{ color: muted }}>肩幅</span>
              <span style={{ color: overlay.sh.accent ? accent : ink }}>{overlay.sh.text}</span>
            </div>
            <div className="flex justify-between gap-[18px]">
              <span style={{ color: muted }}>身幅</span>
              <span style={{ color: overlay.bw.accent ? accent : ink }}>{overlay.bw.text}</span>
            </div>
            <div className="flex justify-between gap-[18px]">
              <span style={{ color: muted }}>着丈</span>
              <span style={{ color: overlay.bl.accent ? accent : ink }}>{overlay.bl.text}</span>
            </div>
            <div className="flex justify-between gap-[18px]">
              <span style={{ color: muted }}>袖（片側）</span>
              <span style={{ color: overlay.sl.accent ? accent : ink }}>{overlay.sl.text}</span>
            </div>
            <div className="flex justify-between gap-[18px]">
              <span style={{ color: muted }}>size</span>
              <span style={{ color: ink }}>{overlay.sizeLabel}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
});
