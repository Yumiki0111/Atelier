"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ProductSize } from "@Atelier/shared";
import { weightKgFromBodyVal } from "@Atelier/shared";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { useFittingCanvasData } from "@/app/(main)/development/fitting/canvas/useFittingCanvasData";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import { landmarksEqual, pathDsContentEqual, sizeEqual } from "@/app/(main)/development/fitting/lib/fittingStateUtils";
import type { CustomGarmentData, JacketSize, ShirtSize } from "@/app/(main)/development/fitting/lib/types";
import { applyWidgetSizeToCustomGarmentData } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import { bodyHeight } from "@/app/(main)/development/fitting/lib/bodyUtils";
import { REF_HEIGHT_CM } from "@/app/(main)/development/fitting/lib/constants";
import {
  DEFAULT_PREVIEW_FIT_BODY_VAL,
  DEFAULT_PREVIEW_FIT_HEIGHT_CM,
  loadPreviewFit,
  savePreviewFit,
} from "@/lib/previewFitStorage";
import {
  PreviewAccentCtaButton,
  PreviewBackRow,
  PreviewBodyChangeButton,
  PreviewBodySilhouette,
  PreviewChromeScaleProvider,
  PreviewColorSwatchRow,
  PreviewFitParamSliders,
  PreviewProductRow,
  PreviewSizeCarousel,
  PREVIEW_SIZE_CAROUSEL_WINDOW,
  PREVIEW_ACCENT,
  PREVIEW_SURFACE_BG,
  PreviewViewerShell,
} from "./WidgetPreviewChrome";
/** 服は塗りなし（透明）。輪郭のみ */
const GARMENT_FILL = "none";
const GARMENT_STROKE = "rgba(70, 70, 70, 0.82)";

function colorFilterForHex(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "none";
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  if (max !== min) {
    if (max === r) hue = ((g - b) / (max - min)) % 6;
    else if (max === g) hue = (b - r) / (max - min) + 2;
    else hue = (r - g) / (max - min) + 4;
  }
  hue *= 60;
  if (hue < 0) hue += 360;
  const sepia = 0.35;
  const sat = 0.4;
  return `sepia(${sepia}) saturate(${sat}) hue-rotate(${hue}deg)`;
}

const DEFAULT_SWATCHES: { id: string; hex: string; label?: string }[] = [
  { id: "default-1", hex: "#e8c547", label: "Yellow" },
  { id: "default-2", hex: "#d4d4d4", label: "Grey" },
  { id: "default-3", hex: "#1a1a1a", label: "Black" },
];

type FitSvgPayload = {
  viewBoxWidth: number;
  viewBoxHeight: number;
  bodyPaths: string[];
  garmentPaths: string[];
  garmentPathStrokeDasharrays?: (string | undefined)[];
  garmentPathStrokeWidths?: (number | undefined)[];
  garmentPathStrokes?: (string | undefined)[];
};

/** 開発ページのデフォルト体重（`weightKgFromBodyVal(DEFAULT)` ≈ 53kg） */
const DEFAULT_FIT_BODY_VAL = 25;

const VIEWBOX_W = 1505;
const PREVIEW_SHIRT_SIZE: ShirtSize = "48";
const PREVIEW_JACKET_SIZE: JacketSize = "4";
/** 開発ページよりやや長め（smootherStep 併用で立ち上がりを緩める） */
const PREVIEW_SIZE_ANIM_MS = 480;

/**
 * 試着プレビュー用の viewBox 高さ。衣装リグの脊髄スパンで yScale が服ごとに変わると
 * `meet` のスケールがぶれて見た目の身長が違うため、身長スライダー（cm）からだけ求める。
 * 体型シート（bodyOnly）でもメイン試着でも同じ式にし、服を表示した瞬間に身長が変わって見えないようにする。
 */
function uniformPreviewViewBoxHeightFromHeightCm(heightCm: number): number {
  const h = Math.max(150, Math.min(195, Math.round(heightCm)));
  return Math.ceil(bodyHeight(h / REF_HEIGHT_CM));
}

/**
 * 体型変更シート専用。身長スライダーを上げたときに、画面上のシルエットが大きく見えるようにする。
 * （viewBox 高さが伸びると `meet` で縮みやすいため、表示だけ身長比で補正する）
 */
function bodySheetPreviewHeightScale(heightCm: number): number {
  const h = Math.max(150, Math.min(195, Math.round(heightCm)));
  const raw = h / DEFAULT_PREVIEW_FIT_HEIGHT_CM;
  return Math.max(0.88, Math.min(1.12, raw));
}

/**
 * 開発タブの `FittingCanvas` と同じ `useFittingCanvasData` で計算（`/fit-svg` サーバー経路との差を排除）。
 * サイズ変更時は開発の `handleCustomGarmentApply` と同様に path を補間する。
 *
 * **useEffect だとペイント後に from/to が立つ**ため、1 コミット目は `from`/`to` なし・`sizedTarget` は新サイズのまま →
 * 一瞬「完成形」が出てから補間が始まる（ぱっと切り替わる）。開発は同一ハンドラで `animProgress=0` と from/to が同批なので滑らか。
 * サイズ同期は **useLayoutEffect**（ペイント前）で行う。
 */
export function PreviewFittingCanvasSvg({
  fitHeightCm,
  fitBodyVal,
  currentSize,
  customGarmentData,
  bodyOnly = false,
  bodySheetHeightScale = false,
}: {
  fitHeightCm: number;
  fitBodyVal: number;
  currentSize: string;
  customGarmentData: CustomGarmentData;
  /** 体型調整シートなど：体型ラインのみ（服パスを描かない） */
  bodyOnly?: boolean;
  /** 体型変更オーバーレイ：身長に応じて表示を拡大（`meet` による見かけの縮小を補う） */
  bodySheetHeightScale?: boolean;
}) {
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
    genericVertexPlotHighlight: null,
  });
  /** シート内は親から `bodyDraftHeight` が渡る。メインと同じ身長基準で viewBox を揃える。 */
  const displayViewBoxHeight = uniformPreviewViewBoxHeightFromHeightCm(fitHeightCm);
  const sheetScale = bodySheetHeightScale ? bodySheetPreviewHeightScale(fitHeightCm) : 1;

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 max-w-[300px] items-center justify-center overflow-visible"
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
        viewBox={`0 0 ${VIEWBOX_W} ${displayViewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto max-h-full w-full min-w-0 max-w-[300px] overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g fill="none" stroke="#bbb" strokeWidth={4}>
          {snap.bodyPaths.map((d, i) => (
            <path key={`b-${i}`} d={d} />
          ))}
        </g>
        {!bodyOnly ? (
          <g fill={GARMENT_FILL}>
            {snap.customPathDs.map((d, i) => {
              if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
              return (
                <path
                  key={`g-${i}`}
                  d={d}
                  fill="none"
                  stroke={snap.customPathStrokes[i] ?? GARMENT_STROKE}
                  strokeWidth={snap.customPathStrokeWidths[i] ?? 8}
                  strokeDasharray={snap.customPathStrokeDasharrays[i] ?? undefined}
                />
              );
            })}
          </g>
        ) : null}
      </svg>
    </div>
  );
}

/**
 * ウィジェット風の枠。
 * - `garmentFitAvailable` + `customGarmentData`: 開発と同じクライアント試着計算
 * - `garmentFitAvailable` のみ: `/api/products/.../fit-svg` フォールバック
 * - それ以外: シルエット＋サムネ
 */
export type WidgetStyleProductPreviewProps = {
  productId: string;
  productName: string;
  thumbnailUrl?: string | null;
  priceDisplay?: string;
  sizeKeys: string[];
  initialSize: ProductSize;
  garmentFitAvailable: boolean;
  /** あるときは `FittingCanvas` と同一パイプラインで描画（プレビューと開発の一致用） */
  customGarmentData?: CustomGarmentData | null;
  onClose: () => void;
  /** フォン画面内のベース背景（`/api/widget-design` と揃える） */
  interfaceBackgroundColor?: string;
  /** 試着 SVG エリアの背景 */
  canvasBackgroundColor?: string;
  /** メイン下部 CTA の文言 */
  ctaCartLabel?: string;
  /** 体型シートの確定ボタン文言 */
  ctaTryOnLabel?: string;
  /** カート／体型確定・サイズ選択・スライダー等のアクセント色 */
  ctaAccentColor?: string;
  /** false のとき「体型を変更」ボタン・体型シート（スライダー含む）を出さない（インターフェース設定プレビュー用） */
  bodyAdjustEnabled?: boolean;
  /** false のときサイズチップ行を出さない */
  sizeCarouselEnabled?: boolean;
  /** false のとき試着エリアは体型ラインのみ（服パスを描かない） */
  garmentPathsInViewer?: boolean;
  /**
   * 埋め込み iframe（`/embed/widget-fit`）専用。コンソールログインなし・体型は localStorage のみ。
   * `customGarmentData` あり時はプレビューと同一のクライアント試着（滑らか）。
   */
  embedPublicWidget?: boolean;
};

export function WidgetStyleProductPreview(props: WidgetStyleProductPreviewProps) {
  const {
    productId,
    productName,
    thumbnailUrl,
    priceDisplay = "—",
    sizeKeys: sizeKeysProp,
    initialSize,
    garmentFitAvailable,
    customGarmentData = null,
    onClose,
    interfaceBackgroundColor,
    canvasBackgroundColor,
    ctaCartLabel,
    ctaTryOnLabel,
    ctaAccentColor,
    bodyAdjustEnabled = true,
    sizeCarouselEnabled = true,
    garmentPathsInViewer = true,
    embedPublicWidget = false,
  } = props;

  const interfaceBg = interfaceBackgroundColor ?? PREVIEW_SURFACE_BG;
  const canvasBg = canvasBackgroundColor ?? PREVIEW_SURFACE_BG;
  const cartLabel = ctaCartLabel ?? "カートに追加";
  const tryOnLabel = ctaTryOnLabel ?? "この体型で試着する";
  const accent = ctaAccentColor ?? PREVIEW_ACCENT;

  const { isLoading: authLoadingFromAuth, isAuthenticated: isAuthenticatedFromAuth } = useAuth();
  const authLoading = embedPublicWidget ? false : authLoadingFromAuth;
  const isAuthenticated = embedPublicWidget ? false : isAuthenticatedFromAuth;
  const swatches = DEFAULT_SWATCHES;
  const [selectedColorId, setSelectedColorId] = useState<string>(swatches[0]?.id ?? "");

  /** 親（`getPreviewSizeKeys`）が着丈・袖丈順で並べた配列をそのまま使う。ここで localeCompare 再ソートすると順序が壊れる */
  const sizeKeys = useMemo(
    () => (sizeKeysProp.length > 0 ? [...sizeKeysProp] : ["3", "4", "5"]),
    [sizeKeysProp]
  );

  const [currentSize, setCurrentSize] = useState<string>(() => {
    if (sizeKeys.includes(initialSize as string)) return initialSize as string;
    return sizeKeys[0] ?? "M";
  });

  useEffect(() => {
    if (sizeKeys.includes(initialSize as string)) {
      setCurrentSize(initialSize as string);
    } else if (sizeKeys[0]) {
      setCurrentSize(sizeKeys[0]);
    }
  }, [initialSize, sizeKeys]);

  /**
   * 埋め込み SSR だけ localStorage が使えず水合不一致になるため、そこだけ定数初期化 + `useLayoutEffect`。
   * コンソールのプレビューは従来どおり `loadPreviewFit()` で初回から復元。
   */
  const [fitHeightCm, setFitHeightCm] = useState(() =>
    embedPublicWidget ? DEFAULT_PREVIEW_FIT_HEIGHT_CM : loadPreviewFit().heightCm
  );
  const [fitBodyVal, setFitBodyVal] = useState(() =>
    embedPublicWidget ? DEFAULT_PREVIEW_FIT_BODY_VAL : loadPreviewFit().bodyVal
  );
  /** 体型調整シート内の下書き（適用は「この体型で試着する」まで保留） */
  const [bodyDraftHeight, setBodyDraftHeight] = useState(170);
  const [bodyDraftVal, setBodyDraftVal] = useState(DEFAULT_FIT_BODY_VAL);
  const [fitData, setFitData] = useState<FitSvgPayload | null>(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [fitError, setFitError] = useState<string | null>(null);
  const [bodySheetOpen, setBodySheetOpen] = useState(false);
  /** 体型シート内のサーバー試着 SVG（下書きの身長・体重に合わせて取得） */
  const [draftFitData, setDraftFitData] = useState<FitSvgPayload | null>(null);
  const [draftFitLoading, setDraftFitLoading] = useState(false);
  const [draftFitError, setDraftFitError] = useState<string | null>(null);

  /** 埋め込み iframe のみ: 水合と一致した直後に localStorage を反映（ペイント前） */
  useLayoutEffect(() => {
    if (!embedPublicWidget) return;
    const local = loadPreviewFit();
    setFitHeightCm(local.heightCm);
    setFitBodyVal(local.bodyVal);
  }, [embedPublicWidget]);

  /** ログイン時は DB（profiles）。未ログインは localStorage（埋め込みは上の layout で済む）。 */
  useEffect(() => {
    if (embedPublicWidget) return;
    if (authLoading) return;
    if (!isAuthenticated) {
      const local = loadPreviewFit();
      setFitHeightCm(local.heightCm);
      setFitBodyVal(local.bodyVal);
      return;
    }

    const ac = new AbortController();
    void (async () => {
      try {
        const res = await authenticatedFetch("/api/auth/profile", {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          const local = loadPreviewFit();
          setFitHeightCm(local.heightCm);
          setFitBodyVal(local.bodyVal);
          return;
        }
        const p = (await res.json()) as {
          preview_fit_height_cm?: number | null;
          preview_fit_body_val?: number | null;
        };
        const h = p.preview_fit_height_cm;
        const b = p.preview_fit_body_val;
        if (
          typeof h === "number" &&
          Number.isFinite(h) &&
          typeof b === "number" &&
          Number.isFinite(b)
        ) {
          setFitHeightCm(Math.min(195, Math.max(150, Math.round(h))));
          setFitBodyVal(Math.min(100, Math.max(0, Math.round(b))));
        } else {
          const local = loadPreviewFit();
          setFitHeightCm(local.heightCm);
          setFitBodyVal(local.bodyVal);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        const local = loadPreviewFit();
        setFitHeightCm(local.heightCm);
        setFitBodyVal(local.bodyVal);
      }
    })();
    return () => ac.abort();
  }, [embedPublicWidget, authLoading, isAuthenticated]);

  useEffect(() => {
    if (!bodyAdjustEnabled) setBodySheetOpen(false);
  }, [bodyAdjustEnabled]);

  useEffect(() => {
    if (customGarmentData) {
      setFitData(null);
      setFitError(null);
      setFitLoading(false);
      return;
    }
    if (!garmentFitAvailable || !productId) {
      setFitData(null);
      setFitError(null);
      return;
    }
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      setFitLoading(false);
      setFitData(null);
      setFitError("ログインが必要です。");
      return;
    }

    const ac = new AbortController();
    setFitLoading(true);
    setFitError(null);

    const sp = new URLSearchParams({
      size: currentSize,
      heightCm: String(fitHeightCm),
      weightKg: String(weightKgFromBodyVal(fitBodyVal)),
    });
    const url = `/api/products/${encodeURIComponent(productId)}/fit-svg?${sp.toString()}`;

    void (async () => {
      try {
        const res = await authenticatedFetch(url, { signal: ac.signal, cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          viewBoxWidth?: number;
          viewBoxHeight?: number;
          bodyPaths?: string[];
          garmentPaths?: string[];
          garmentPathStrokeDasharrays?: (string | undefined)[];
          garmentPathStrokeWidths?: (number | undefined)[];
          garmentPathStrokes?: (string | undefined)[];
        };
        if (!res.ok) {
          const hint =
            res.status === 401
              ? "ログインの有効期限が切れている可能性があります。再ログインしてください。"
              : res.status === 404
                ? "商品が見つかりません（店舗と商品の紐づけを確認してください）。"
                : res.status === 400
                  ? "garment_spec がないか無効です。"
                  : body.message || body.error || `エラー (${res.status})`;
          setFitData(null);
          setFitError(hint);
          return;
        }
        if (
          body.viewBoxWidth == null ||
          body.viewBoxHeight == null ||
          !Array.isArray(body.bodyPaths) ||
          !Array.isArray(body.garmentPaths)
        ) {
          setFitData(null);
          setFitError("サーバー応答の形式が不正です。");
          return;
        }
        setFitData({
          viewBoxWidth: body.viewBoxWidth,
          viewBoxHeight: body.viewBoxHeight,
          bodyPaths: body.bodyPaths,
          garmentPaths: body.garmentPaths,
          garmentPathStrokeDasharrays: body.garmentPathStrokeDasharrays,
          garmentPathStrokeWidths: body.garmentPathStrokeWidths,
          garmentPathStrokes: body.garmentPathStrokes,
        });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        const msg =
          e instanceof Error ? e.message : "通信に失敗しました";
        setFitData(null);
        setFitError(msg);
      } finally {
        if (!ac.signal.aborted) setFitLoading(false);
      }
    })();

    return () => ac.abort();
  }, [
    customGarmentData,
    garmentFitAvailable,
    productId,
    currentSize,
    fitHeightCm,
    fitBodyVal,
    authLoading,
    isAuthenticated,
  ]);

  /** 体型シートが開いている間だけ、下書きパラメータで fit-svg を再取得 */
  useEffect(() => {
    if (!bodySheetOpen) {
      setDraftFitData(null);
      setDraftFitError(null);
      setDraftFitLoading(false);
      return;
    }
    if (customGarmentData || !garmentFitAvailable || !productId) {
      return;
    }
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      setDraftFitError("ログインが必要です。");
      setDraftFitData(null);
      return;
    }

    const ac = new AbortController();
    const t = setTimeout(() => {
      void (async () => {
        setDraftFitLoading(true);
        setDraftFitError(null);
        try {
          const sp = new URLSearchParams({
            size: currentSize,
            heightCm: String(bodyDraftHeight),
            weightKg: String(weightKgFromBodyVal(bodyDraftVal)),
          });
          const url = `/api/products/${encodeURIComponent(productId)}/fit-svg?${sp.toString()}`;
          const res = await authenticatedFetch(url, { signal: ac.signal, cache: "no-store" });
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
            viewBoxWidth?: number;
            viewBoxHeight?: number;
            bodyPaths?: string[];
            garmentPaths?: string[];
            garmentPathStrokeDasharrays?: (string | undefined)[];
            garmentPathStrokeWidths?: (number | undefined)[];
            garmentPathStrokes?: (string | undefined)[];
          };
          if (ac.signal.aborted) return;
          if (!res.ok) {
            const hint =
              res.status === 401
                ? "ログインの有効期限が切れている可能性があります。再ログインしてください。"
                : res.status === 404
                  ? "商品が見つかりません（店舗と商品の紐づけを確認してください）。"
                  : res.status === 400
                    ? "garment_spec がないか無効です。"
                    : body.message || body.error || `エラー (${res.status})`;
            setDraftFitData(null);
            setDraftFitError(hint);
            return;
          }
          if (
            body.viewBoxWidth == null ||
            body.viewBoxHeight == null ||
            !Array.isArray(body.bodyPaths) ||
            !Array.isArray(body.garmentPaths)
          ) {
            setDraftFitData(null);
            setDraftFitError("サーバー応答の形式が不正です。");
            return;
          }
          setDraftFitData({
            viewBoxWidth: body.viewBoxWidth,
            viewBoxHeight: body.viewBoxHeight,
            bodyPaths: body.bodyPaths,
            garmentPaths: body.garmentPaths,
            garmentPathStrokeDasharrays: body.garmentPathStrokeDasharrays,
            garmentPathStrokeWidths: body.garmentPathStrokeWidths,
            garmentPathStrokes: body.garmentPathStrokes,
          });
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return;
          const msg = e instanceof Error ? e.message : "通信に失敗しました";
          setDraftFitData(null);
          setDraftFitError(msg);
        } finally {
          if (!ac.signal.aborted) setDraftFitLoading(false);
        }
      })();
    }, 160);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [
    bodySheetOpen,
    bodyDraftHeight,
    bodyDraftVal,
    currentSize,
    productId,
    customGarmentData,
    garmentFitAvailable,
    authLoading,
    isAuthenticated,
  ]);

  const selectedHex =
    swatches.find((s) => s.id === selectedColorId)?.hex ?? swatches[0]?.hex ?? "#e8c547";

  /** 選択サイズが ‹› 間のチップ列の中央付近に来るようウィンドウをずらす */
  const windowStart = useMemo(() => {
    const idx = sizeKeys.indexOf(currentSize);
    if (idx < 0) return 0;
    const w = PREVIEW_SIZE_CAROUSEL_WINDOW;
    const centerOffset = Math.floor((w - 1) / 2);
    const maxStart = Math.max(0, sizeKeys.length - w);
    let start = idx - centerOffset;
    start = Math.min(Math.max(0, start), maxStart);
    return start;
  }, [currentSize, sizeKeys]);

  const openBodyAdjustSheet = useCallback(() => {
    setBodyDraftHeight(fitHeightCm);
    setBodyDraftVal(fitBodyVal);
    if (!customGarmentData && garmentFitAvailable) {
      setDraftFitData(fitData);
      setDraftFitError(null);
    }
    setBodySheetOpen(true);
  }, [fitHeightCm, fitBodyVal, fitData, customGarmentData, garmentFitAvailable]);

  return (
    <PreviewChromeScaleProvider value={embedPublicWidget ? "embed" : "default"}>
    <div
      className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: interfaceBg,
      }}
    >
      <PreviewBackRow onClick={onClose} />
      <PreviewProductRow
        productName={productName}
        priceDisplay={priceDisplay}
        thumbnailUrl={thumbnailUrl}
        rightSlot={
          bodyAdjustEnabled ? (
            <PreviewBodyChangeButton onClick={openBodyAdjustSheet} />
          ) : undefined
        }
      />

      {!garmentFitAvailable ? (
        <PreviewColorSwatchRow
          swatches={swatches}
          selectedId={selectedColorId}
          onSelect={setSelectedColorId}
          accentColor={accent}
        />
      ) : null}

      <PreviewViewerShell backgroundColor={canvasBg}>
        {garmentFitAvailable ? (
          <>
            {customGarmentData ? (
              <div className="flex h-full min-h-0 w-full flex-1 justify-center">
                <PreviewFittingCanvasSvg
                  fitHeightCm={fitHeightCm}
                  fitBodyVal={fitBodyVal}
                  currentSize={currentSize}
                  customGarmentData={customGarmentData}
                  bodyOnly={!garmentPathsInViewer}
                />
              </div>
            ) : authLoading || fitLoading ? (
              <div className="px-6 text-center text-[14px] text-[#6b7280]">読み込み中…</div>
            ) : fitError || !fitData ? (
              <div className="max-w-[280px] px-4 text-center text-[13px] leading-snug text-red-700">
                {fitError ?? "試着表示を読み込めませんでした"}
              </div>
            ) : (
              <div className="flex h-full min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-visible">
                <div className="flex h-full w-full min-h-0 min-w-0 max-h-full max-w-[300px] items-center justify-center">
                  <svg
                    viewBox={`0 0 ${fitData.viewBoxWidth} ${uniformPreviewViewBoxHeightFromHeightCm(fitHeightCm)}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="h-auto max-h-full w-full min-w-0 max-w-[300px] overflow-visible"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <g fill="none" stroke="#bbb" strokeWidth={4}>
                      {fitData.bodyPaths.map((d, i) => (
                        <path key={`b-${i}`} d={d} />
                      ))}
                    </g>
                    {garmentPathsInViewer ? (
                      <g fill={GARMENT_FILL}>
                        {fitData.garmentPaths.map((d, i) => (
                          <path
                            key={`g-${i}`}
                            d={d}
                            fill="none"
                            stroke={fitData.garmentPathStrokes?.[i] ?? GARMENT_STROKE}
                            strokeWidth={fitData.garmentPathStrokeWidths?.[i] ?? 8}
                            strokeDasharray={fitData.garmentPathStrokeDasharrays?.[i] ?? undefined}
                          />
                        ))}
                      </g>
                    ) : null}
                  </svg>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <PreviewBodySilhouette className="max-h-[min(85%,320px)] w-full" />
            </div>
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt=""
                className="relative z-[1] max-h-[62%] max-w-[58%] object-contain"
                style={{ filter: colorFilterForHex(selectedHex) }}
              />
            ) : null}
          </>
        )}
      </PreviewViewerShell>

      {sizeCarouselEnabled ? (
        <PreviewSizeCarousel
          sizeKeys={sizeKeys}
          currentSize={currentSize}
          windowStart={windowStart}
          onSelectSize={setCurrentSize}
          accentColor={accent}
        />
      ) : null}

      <PreviewAccentCtaButton variant="cart" label={cartLabel} accentColor={accent} />

      {bodyAdjustEnabled && bodySheetOpen ? (
        <div
          className="absolute inset-0 z-50 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[34px]"
          style={{ backgroundColor: interfaceBg }}
          data-fitlook-body-adjust
        >
          <PreviewBackRow onClick={() => setBodySheetOpen(false)} />
          <PreviewProductRow
            productName={productName}
            priceDisplay={priceDisplay}
            thumbnailUrl={thumbnailUrl}
          />
          {!garmentFitAvailable ? (
            <PreviewColorSwatchRow
              swatches={swatches}
              selectedId={selectedColorId}
              onSelect={setSelectedColorId}
              accentColor={accent}
            />
          ) : null}
          <PreviewViewerShell backgroundColor={canvasBg}>
            {garmentFitAvailable ? (
              <>
                {customGarmentData ? (
                  <div className="flex h-full min-h-0 w-full flex-1 justify-center">
                    <PreviewFittingCanvasSvg
                      fitHeightCm={bodyDraftHeight}
                      fitBodyVal={bodyDraftVal}
                      currentSize={currentSize}
                      customGarmentData={customGarmentData}
                      bodyOnly
                      bodySheetHeightScale
                    />
                  </div>
                ) : authLoading ? (
                  <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] text-[#6b7280]">
                    読み込み中…
                  </div>
                ) : draftFitError && !draftFitData ? (
                  <div className="max-w-[280px] flex-1 self-center px-4 text-center text-[13px] leading-snug text-red-700">
                    {draftFitError}
                  </div>
                ) : draftFitData ? (
                  <div className="flex h-full min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-visible">
                    <div
                      className="flex h-full w-full min-h-0 min-w-0 max-h-full max-w-[300px] items-center justify-center overflow-visible"
                      style={{
                        transform: `scale(${bodySheetPreviewHeightScale(bodyDraftHeight)})`,
                        transformOrigin: "center center",
                      }}
                    >
                      <svg
                        viewBox={`0 0 ${draftFitData.viewBoxWidth} ${uniformPreviewViewBoxHeightFromHeightCm(bodyDraftHeight)}`}
                        preserveAspectRatio="xMidYMid meet"
                        className="h-auto max-h-full w-full min-w-0 max-w-[300px] overflow-visible"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <g fill="none" stroke="#bbb" strokeWidth={4}>
                          {draftFitData.bodyPaths.map((d, i) => (
                            <path key={`bod-${i}`} d={d} />
                          ))}
                        </g>
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-[14px] text-[#6b7280]">
                    {draftFitLoading ? "読み込み中…" : fitError ?? "試着表示を読み込めませんでした"}
                  </div>
                )}
              </>
            ) : (
              <div className="pointer-events-none flex flex-1 items-center justify-center">
                <PreviewBodySilhouette className="max-h-[min(85%,320px)] w-full" />
              </div>
            )}
          </PreviewViewerShell>
          <PreviewFitParamSliders
            heightCm={bodyDraftHeight}
            bodyVal={bodyDraftVal}
            onHeightChange={setBodyDraftHeight}
            onBodyValChange={setBodyDraftVal}
            accentColor={accent}
          />
          <PreviewAccentCtaButton
            variant="tryOn"
            label={tryOnLabel}
            accentColor={accent}
            onClick={() => {
              void (async () => {
                setFitHeightCm(bodyDraftHeight);
                setFitBodyVal(bodyDraftVal);
                savePreviewFit({ heightCm: bodyDraftHeight, bodyVal: bodyDraftVal });
                if (isAuthenticated && !embedPublicWidget) {
                  try {
                    await authenticatedFetch("/api/auth/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        preview_fit_height_cm: bodyDraftHeight,
                        preview_fit_body_val: bodyDraftVal,
                      }),
                    });
                  } catch {
                    // オフライン等は localStorage のみ
                  }
                }
                setBodySheetOpen(false);
              })();
            }}
          />
        </div>
      ) : null}
    </div>
    </PreviewChromeScaleProvider>
  );
}
