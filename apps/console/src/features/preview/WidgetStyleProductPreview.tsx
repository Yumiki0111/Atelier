"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildPreviewChromeTheme } from "@/lib/previewChromeTheme";
import type { ProductSize } from "@Atelier/shared";
import {
  interpolateAddToCartUrlTemplate,
  resolveAddToCartNavigationHref,
  weightKgFromBodyVal,
} from "@Atelier/shared";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import {
  GRADING_V4_GRID_BODY_SILHOUETTE_STROKE,
  gradingV4GridBodyPathEndsClosed,
  gradingV4UsesLayeredGridBodySilhouette,
} from "@/app/(main)/development/fitting/gradingV4/gradingV4Constants";
import {
  DEFAULT_PREVIEW_FIT_BODY_VAL,
  DEFAULT_PREVIEW_FIT_HEIGHT_CM,
  loadPreviewFit,
  savePreviewFit,
} from "@/lib/previewFitStorage";
import type { WidgetFitEaseDiagramJson } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import type { WidgetFitEaseSummaryJson } from "@/lib/widget-fit/computeWidgetFitEaseSummary";
import { WidgetFitEaseDiagramSvg } from "@/features/preview/WidgetFitEaseDiagramSvg";
import { sendWidgetAnalyticsEvent } from "@/lib/widget/sendWidgetAnalyticsEvent";
import {
  PreviewAccentCtaButton,
  PreviewBackRow,
  PreviewBodyChangeButton,
  PreviewBodySilhouette,
  PreviewChromeScaleProvider,
  PreviewChromeThemeProvider,
  PreviewColorSwatchRow,
  PreviewFitParamSliders,
  PreviewProductRow,
  PreviewSizeCarousel,
  PREVIEW_SIZE_CAROUSEL_WINDOW,
  PREVIEW_ACCENT,
  PREVIEW_SURFACE_BG,
  PreviewViewerShell,
} from "./WidgetPreviewChrome";
import { PreviewFittingCanvasSvg } from "./PreviewFittingCanvasSvg";
import { colorFilterForHex } from "./widget-style-product-preview-color";
import { DEFAULT_FIT_BODY_VAL } from "./widget-style-product-preview-fit-constants";
import {
  PreviewFitEaseFootnote,
  PreviewFitEaseSummary,
} from "./widget-style-product-preview-fit-ease-ui";
import type { FitSvgPayload } from "./widget-style-product-preview-fit-svg-types";
import {
  bodySheetPreviewHeightScale,
  uniformPreviewViewBoxHeightFromHeightCm,
} from "./widget-style-product-preview-viewbox-helpers";
import { useFitSvgStage } from "./widget-style-product-preview-fit-svg-stage";
import { FitSvgBehindGarmentLayer, FitSvgFrontGarmentLayer } from "./FitSvgGarmentLayers";
import { resolveWidgetFitSizeKeysOrder } from "@/lib/widget/resolveWidgetFitSizeKeysOrder";

const DEFAULT_SWATCHES: { id: string; hex: string; label?: string }[] = [
  { id: "default-1", hex: "#e8c547", label: "Yellow" },
  { id: "default-2", hex: "#d4d4d4", label: "Grey" },
  { id: "default-3", hex: "#1a1a1a", label: "Black" },
];

/**
 * ウィジェット風の枠。
 * - `garmentFitAvailable` + `customGarmentData`: 開発と同じクライアント試着計算
 * - `garmentFitAvailable` のみ: `/api/products/.../fit-svg` フォールバック
 * - それ以外: シルエット＋サムネ
 */
export type WidgetStyleProductPreviewProps = {
  productId: string;
  /** DB の商品カテゴリ（試着の胸バンドしきい値に使用） */
  productCategory?: string | null;
  /** 店舗の外部商品 ID（カート URL の `{{productId}}` 用）。未指定時は `productId` を使う */
  externalProductId?: string;
  /** `data-fitlook-add-to-cart-url` 相当。指定時のみカートボタンで遷移する */
  addToCartUrlTemplate?: string | null;
  productName: string;
  thumbnailUrl?: string | null;
  priceDisplay?: string;
  sizeKeys: string[];
  initialSize: ProductSize;
  garmentFitAvailable: boolean;
  /** あるときは `computeFittingCanvasSnapshot` と同一経路で描画（ウィジェット／プレビュー整合用） */
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
  /** 親のロゴスプラッシュ中は図解・脚注の段階表示を保留（`deferStagedReveal=1` の埋め込み用） */
  embedSplashSuspended?: boolean;
  /** 埋め込み時のみ。`events.shop_id` 用 */
  shopId?: string;
  /** 埋め込みアナリティクスで `meta.eventSource` に載せる（例: `preview_link`） */
  eventSource?: string;
};

export function WidgetStyleProductPreview(props: WidgetStyleProductPreviewProps) {
  const {
    productId,
    productCategory = null,
    externalProductId,
    addToCartUrlTemplate,
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
    embedSplashSuspended = false,
    shopId: embedShopId,
    eventSource: embedEventSource,
  } = props;

  const embedAnalyticsMeta = useMemo(() => {
    const m: Record<string, unknown> = { placement: "embed" };
    if (embedEventSource) m.eventSource = embedEventSource;
    return m;
  }, [embedEventSource]);

  /** 親スプラッシュの postMessage が届かない環境でもアナリティクス用に widget_open を送る */
  const [embedSplashFallback, setEmbedSplashFallback] = useState(false);
  useEffect(() => {
    if (!embedPublicWidget || !embedSplashSuspended) {
      setEmbedSplashFallback(false);
      return;
    }
    const t = window.setTimeout(() => setEmbedSplashFallback(true), 6500);
    return () => window.clearTimeout(t);
  }, [embedPublicWidget, embedSplashSuspended]);

  const widgetOpenLoggedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!embedPublicWidget || !embedShopId || !productId || !garmentFitAvailable) return;
    if (embedSplashSuspended && !embedSplashFallback) return;
    const key = `${embedShopId}:${productId}`;
    if (widgetOpenLoggedKeyRef.current === key) return;
    widgetOpenLoggedKeyRef.current = key;
    void sendWidgetAnalyticsEvent({
      shopId: embedShopId,
      productId,
      type: "widget_open",
      meta: embedAnalyticsMeta,
    });
  }, [
    embedPublicWidget,
    embedShopId,
    productId,
    garmentFitAvailable,
    embedSplashSuspended,
    embedSplashFallback,
    embedAnalyticsMeta,
  ]);

  const interfaceBg = interfaceBackgroundColor ?? PREVIEW_SURFACE_BG;
  const canvasBg = canvasBackgroundColor ?? PREVIEW_SURFACE_BG;
  const chromeForStrokes = useMemo(
    () => buildPreviewChromeTheme(interfaceBg, canvasBg),
    [interfaceBg, canvasBg]
  );
  const cartLabel = ctaCartLabel ?? "カートに追加";
  const tryOnLabel = ctaTryOnLabel ?? "この体型で試着する";
  const accent = ctaAccentColor ?? PREVIEW_ACCENT;

  const embedReferrerOrigin = useMemo(() => {
    if (!embedPublicWidget || typeof document === "undefined") return null;
    try {
      if (document.referrer) return new URL(document.referrer).origin;
    } catch {
      return null;
    }
    return null;
  }, [embedPublicWidget]);

  const { isLoading: authLoadingFromAuth, isAuthenticated: isAuthenticatedFromAuth } = useAuth();
  const authLoading = embedPublicWidget ? false : authLoadingFromAuth;
  const isAuthenticated = embedPublicWidget ? false : isAuthenticatedFromAuth;
  const swatches = DEFAULT_SWATCHES;
  const [selectedColorId, setSelectedColorId] = useState<string>(swatches[0]?.id ?? "");

  /** Grading v4 は `resolveWidgetFitSizeKeysOrder` で XS–XXL を正規化（3/4/5 等は試着に使えない） */
  const sizeKeys = useMemo(() => {
    if (customGarmentData?.presetId === "gradingV4") {
      return resolveWidgetFitSizeKeysOrder(
        sizeKeysProp.length > 0 ? sizeKeysProp : [],
        customGarmentData
      );
    }
    return sizeKeysProp.length > 0 ? [...sizeKeysProp] : ["3", "4", "5"];
  }, [sizeKeysProp, customGarmentData]);

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

  const handleSelectSizeForAnalytics = useCallback(
    (sz: string) => {
      setCurrentSize((prev) => {
        if (embedPublicWidget && embedShopId && sz !== prev) {
          void sendWidgetAnalyticsEvent({
            shopId: embedShopId,
            productId,
            type: "size_change",
            meta: { size: sz, ...embedAnalyticsMeta },
          });
        }
        return sz;
      });
    },
    [embedPublicWidget, embedShopId, productId, embedAnalyticsMeta]
  );

  const handleAddToCartClick = useCallback(() => {
    const template = addToCartUrlTemplate?.trim();
    if (!template) return;
    if (embedPublicWidget && embedShopId) {
      void sendWidgetAnalyticsEvent({
        shopId: embedShopId,
        productId,
        type: "add_to_cart_click",
        meta: {
          size: currentSize,
          colorId: selectedColorId,
          ...embedAnalyticsMeta,
        },
      });
    }
    const pid = (externalProductId ?? productId) || "";
    const interpolated = interpolateAddToCartUrlTemplate(template, {
      productId: pid,
      size: currentSize,
      colorId: selectedColorId,
    });
    const baseOrigin = embedPublicWidget
      ? embedReferrerOrigin
      : typeof window !== "undefined"
        ? window.location.origin
        : null;
    const href = resolveAddToCartNavigationHref(interpolated, baseOrigin);
    if (!href || typeof window === "undefined") return;
    try {
      if (embedPublicWidget && window.top) {
        window.top.location.assign(href);
      } else {
        window.location.assign(href);
      }
    } catch {
      window.location.assign(href);
    }
  }, [
    addToCartUrlTemplate,
    embedPublicWidget,
    embedShopId,
    embedAnalyticsMeta,
    currentSize,
    selectedColorId,
    externalProductId,
    productId,
    embedReferrerOrigin,
  ]);

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
  /** 「この体型で試着する」適用のたびに増やし、試着の段階表示をやり直す */
  const [fitEaseRevealNonce, setFitEaseRevealNonce] = useState(0);
  /** 体型シート内のサーバー試着 SVG（下書きの身長・体重に合わせて取得） */
  const [draftFitData, setDraftFitData] = useState<FitSvgPayload | null>(null);
  const [draftFitLoading, setDraftFitLoading] = useState(false);
  const [draftFitError, setDraftFitError] = useState<string | null>(null);

  const hasEaseDiagramEmbed = Boolean(
    garmentPathsInViewer && fitData && (fitData.fitEaseDiagram?.ops?.length ?? 0) > 0
  );
  /** 初回取得・商品切替・服表示トグル時のみ段階表示。サイズ・体型変更の再取得では図解・文言は即時 */
  const [embedEaseRevealDone, setEmbedEaseRevealDone] = useState(false);
  const [embedEaseRevealKey, setEmbedEaseRevealKey] = useState(0);
  useLayoutEffect(() => {
    setEmbedEaseRevealDone(false);
    setEmbedEaseRevealKey((k) => k + 1);
  }, [productId, garmentPathsInViewer, fitEaseRevealNonce]);
  const fitSvgStageEmbed = useFitSvgStage(
    hasEaseDiagramEmbed,
    [hasEaseDiagramEmbed, embedEaseRevealKey],
    {
      embedSplashSuspended: embedPublicWidget && embedSplashSuspended === true,
    }
  );
  useEffect(() => {
    if (embedEaseRevealDone) return;
    if (!fitData) return;
    if (fitSvgStageEmbed >= 3) setEmbedEaseRevealDone(true);
  }, [fitSvgStageEmbed, embedEaseRevealDone, fitData]);
  const showEmbedEaseOverlay = embedEaseRevealDone || fitSvgStageEmbed >= 2;
  const showEmbedEaseText = embedEaseRevealDone || fitSvgStageEmbed >= 3;

  /** 体型シートがサーバー SVG のみ: 初回だけ下段を遅らせる。シート再開・体型適用後も「アニメーション後」と同じ即表示 */
  const [draftEaseRevealDone, setDraftEaseRevealDone] = useState(false);
  const [draftEaseRevealKey, setDraftEaseRevealKey] = useState(0);
  const draftEaseStagedOnceRef = useRef(false);
  useLayoutEffect(() => {
    draftEaseStagedOnceRef.current = false;
    setDraftEaseRevealDone(false);
  }, [productId, fitEaseRevealNonce]);
  useLayoutEffect(() => {
    if (!bodySheetOpen || customGarmentData) return;
    if (draftFitData && !draftEaseStagedOnceRef.current) {
      setDraftEaseRevealDone(false);
      setDraftEaseRevealKey((k) => k + 1);
    }
  }, [bodySheetOpen, customGarmentData, draftFitData]);
  useEffect(() => {
    if (draftEaseRevealDone) draftEaseStagedOnceRef.current = true;
  }, [draftEaseRevealDone]);
  const draftRevealActive = Boolean(bodySheetOpen && !customGarmentData && draftFitData);
  const draftFitSvgStage = useFitSvgStage(draftRevealActive, [draftEaseRevealKey, draftRevealActive]);
  useEffect(() => {
    if (draftEaseRevealDone) return;
    if (!draftRevealActive) return;
    if (draftFitSvgStage >= 3) setDraftEaseRevealDone(true);
  }, [draftFitSvgStage, draftEaseRevealDone, draftRevealActive]);
  const showDraftEaseText = draftEaseRevealDone || draftFitSvgStage >= 3;

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
          viewBoxMinX?: number;
          viewBoxWidth?: number;
          viewBoxHeight?: number;
          bodyPaths?: string[];
          garmentPathsBehindBody?: string[];
          garmentBehindBodyPathStrokeDasharrays?: (string | undefined)[];
          garmentBehindBodyPathStrokeWidths?: (number | undefined)[];
          garmentBehindBodyPathStrokes?: (string | undefined)[];
          garmentBehindBodyPathFills?: (string | undefined)[];
          garmentPaths?: string[];
          garmentPathStrokeDasharrays?: (string | undefined)[];
          garmentPathStrokeWidths?: (number | undefined)[];
          garmentPathStrokes?: (string | undefined)[];
          garmentPathFills?: (string | undefined)[];
          presetId?: "gradingV4";
          fitEaseSummary?: WidgetFitEaseSummaryJson;
          fitEaseDiagram?: WidgetFitEaseDiagramJson | null;
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
          viewBoxMinX: body.viewBoxMinX ?? 0,
          viewBoxWidth: body.viewBoxWidth,
          viewBoxHeight: body.viewBoxHeight,
          bodyPaths: body.bodyPaths,
          garmentPathsBehindBody: body.garmentPathsBehindBody,
          garmentBehindBodyPathStrokeDasharrays: body.garmentBehindBodyPathStrokeDasharrays,
          garmentBehindBodyPathStrokeWidths: body.garmentBehindBodyPathStrokeWidths,
          garmentBehindBodyPathStrokes: body.garmentBehindBodyPathStrokes,
          garmentBehindBodyPathFills: body.garmentBehindBodyPathFills,
          garmentPaths: body.garmentPaths,
          garmentPathStrokeDasharrays: body.garmentPathStrokeDasharrays,
          garmentPathStrokeWidths: body.garmentPathStrokeWidths,
          garmentPathStrokes: body.garmentPathStrokes,
          garmentPathFills: body.garmentPathFills,
          presetId: body.presetId,
          fitEaseSummary: body.fitEaseSummary,
          fitEaseDiagram: body.fitEaseDiagram,
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
            viewBoxMinX?: number;
            viewBoxWidth?: number;
          viewBoxHeight?: number;
          bodyPaths?: string[];
          garmentPathsBehindBody?: string[];
          garmentBehindBodyPathStrokeDasharrays?: (string | undefined)[];
          garmentBehindBodyPathStrokeWidths?: (number | undefined)[];
          garmentBehindBodyPathStrokes?: (string | undefined)[];
          garmentBehindBodyPathFills?: (string | undefined)[];
          garmentPaths?: string[];
          garmentPathStrokeDasharrays?: (string | undefined)[];
          garmentPathStrokeWidths?: (number | undefined)[];
          garmentPathStrokes?: (string | undefined)[];
          garmentPathFills?: (string | undefined)[];
          presetId?: "gradingV4";
            fitEaseSummary?: WidgetFitEaseSummaryJson;
            fitEaseDiagram?: WidgetFitEaseDiagramJson | null;
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
            viewBoxMinX: body.viewBoxMinX ?? 0,
            viewBoxWidth: body.viewBoxWidth,
            viewBoxHeight: body.viewBoxHeight,
            bodyPaths: body.bodyPaths,
            garmentPathsBehindBody: body.garmentPathsBehindBody,
            garmentBehindBodyPathStrokeDasharrays: body.garmentBehindBodyPathStrokeDasharrays,
            garmentBehindBodyPathStrokeWidths: body.garmentBehindBodyPathStrokeWidths,
            garmentBehindBodyPathStrokes: body.garmentBehindBodyPathStrokes,
            garmentBehindBodyPathFills: body.garmentBehindBodyPathFills,
            garmentPaths: body.garmentPaths,
            garmentPathStrokeDasharrays: body.garmentPathStrokeDasharrays,
            garmentPathStrokeWidths: body.garmentPathStrokeWidths,
            garmentPathStrokes: body.garmentPathStrokes,
            garmentPathFills: body.garmentPathFills,
            presetId: body.presetId,
            fitEaseSummary: body.fitEaseSummary,
            fitEaseDiagram: body.fitEaseDiagram,
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
      <PreviewChromeThemeProvider
        interfaceBackgroundColor={interfaceBg}
        canvasBackgroundColor={canvasBg}
      >
        <div
          className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: canvasBg,
          }}
        >
          <div className="relative z-10 flex shrink-0 flex-col" style={{ backgroundColor: interfaceBg }}>
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
          </div>

          <PreviewViewerShell backgroundColor={canvasBg} clipContent>
        {garmentFitAvailable ? (
          <>
            {customGarmentData ? (
              <div
                className={cn(
                  "flex min-h-0 w-full min-w-0 flex-1 justify-center overflow-hidden",
                  embedPublicWidget ? "pb-px pt-0" : "pb-2 pt-px",
                )}
              >
                <PreviewFittingCanvasSvg
                  fitHeightCm={fitHeightCm}
                  fitBodyVal={fitBodyVal}
                  currentSize={currentSize}
                  customGarmentData={customGarmentData}
                  orderedSizeKeys={sizeKeys}
                  fitChestBandCategory={productCategory}
                  bodyOnly={!garmentPathsInViewer}
                  fitEaseRevealNonce={fitEaseRevealNonce}
                  embedSplashSuspended={embedPublicWidget && embedSplashSuspended}
                  embeddedWidgetUi
                />
              </div>
            ) : authLoading || fitLoading ? (
              <div
                className="px-6 text-center text-[14px]"
                style={{ color: chromeForStrokes.canvas.mutedFg }}
              >
                読み込み中…
              </div>
            ) : fitError || !fitData ? (
              <div className="max-w-[280px] px-4 text-center text-[13px] leading-snug text-red-700">
                {fitError ?? "試着表示を読み込めませんでした"}
              </div>
            ) : (
              <div
                className={cn(
                  "flex min-h-0 w-full min-w-0 flex-col items-center justify-center",
                  embedPublicWidget
                    ? "h-full flex-1 gap-0 overflow-hidden pb-px pt-0"
                    : "h-full flex-1 gap-1 overflow-hidden py-0.5",
                )}
              >
                <div className="flex min-h-0 w-full max-w-full flex-1 items-center justify-center overflow-hidden">
                  <svg
                    viewBox={`${fitData.viewBoxMinX ?? 0} 0 ${fitData.viewBoxWidth} ${fitData.viewBoxHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="mx-auto block h-auto max-h-[88%] min-h-0 min-w-0 w-auto max-w-full overflow-visible sm:max-h-[94%] box-border"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    {garmentPathsInViewer ? (
                      <FitSvgBehindGarmentLayer
                        fitData={fitData}
                        garmentStrokeFallback={
                          fitData.presetId === "gradingV4"
                            ? "rgba(45,45,45,0.9)"
                            : chromeForStrokes.canvas.garmentStroke
                        }
                        opacityStyle={{
                          opacity: fitSvgStageEmbed >= 1 ? 1 : 0,
                          transition: "opacity 0.42s ease-out",
                        }}
                      />
                    ) : null}
                    <g
                      style={{
                        opacity: fitSvgStageEmbed >= 1 ? 1 : 0,
                        transition: "opacity 0.42s ease-out",
                      }}
                    >
                      {fitData.presetId === "gradingV4" &&
                      gradingV4UsesLayeredGridBodySilhouette(fitData.bodyPaths.length) ? (
                        <>
                          <g fill={canvasBg} stroke="none">
                            {fitData.bodyPaths.map((d, i) => (
                              <path
                                key={`bf-${i}`}
                                d={d}
                                fill={gradingV4GridBodyPathEndsClosed(d) ? canvasBg : "none"}
                              />
                            ))}
                          </g>
                          <g
                            fill="none"
                            stroke={GRADING_V4_GRID_BODY_SILHOUETTE_STROKE}
                            strokeWidth={4}
                            pointerEvents="none"
                          >
                            {fitData.bodyPaths[0] ? <path key="bo" d={fitData.bodyPaths[0]} /> : null}
                            {fitData.bodyPaths.map((d, i) =>
                              i > 0 && !gradingV4GridBodyPathEndsClosed(d) ? (
                                <path key={`bs-${i}`} d={d} />
                              ) : null
                            )}
                          </g>
                        </>
                      ) : (
                        <g
                          fill={canvasBg}
                          stroke={
                            fitData.presetId === "gradingV4"
                              ? GRADING_V4_GRID_BODY_SILHOUETTE_STROKE
                              : chromeForStrokes.canvas.bodyStroke
                          }
                          strokeWidth={4}
                        >
                          {fitData.bodyPaths.map((d, i) => (
                            <path key={`b-${i}`} d={d} />
                          ))}
                        </g>
                      )}
                    </g>
                    {garmentPathsInViewer ? (
                      <FitSvgFrontGarmentLayer
                        fitData={fitData}
                        garmentStrokeFallback={
                          fitData.presetId === "gradingV4"
                            ? "rgba(45,45,45,0.9)"
                            : chromeForStrokes.canvas.garmentStroke
                        }
                        opacityStyle={{
                          opacity: fitSvgStageEmbed >= 1 ? 1 : 0,
                          transition: "opacity 0.42s ease-out",
                        }}
                      />
                    ) : null}
                    {garmentPathsInViewer && (fitData.fitEaseDiagram?.ops?.length ?? 0) > 0 ? (
                      <g
                        style={{
                          opacity: showEmbedEaseOverlay ? 1 : 0,
                          transition: "opacity 0.35s ease-out",
                        }}
                      >
                        <WidgetFitEaseDiagramSvg diagram={fitData.fitEaseDiagram} />
                      </g>
                    ) : null}
                  </svg>
                </div>
                {garmentPathsInViewer && (fitData.fitEaseDiagram?.ops?.length ?? 0) > 0 ? (
                  <div
                    className="shrink-0"
                    style={{
                      opacity: showEmbedEaseText ? 1 : 0,
                      transition: "opacity 0.35s ease-out",
                    }}
                  >
                    <PreviewFitEaseFootnote summary={fitData.fitEaseSummary} />
                  </div>
                ) : garmentPathsInViewer ? (
                  <div
                    className="shrink-0"
                    style={{
                      opacity: showEmbedEaseText ? 1 : 0,
                      transition: "opacity 0.35s ease-out",
                    }}
                  >
                    <PreviewFitEaseSummary summary={fitData.fitEaseSummary} />
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <PreviewBodySilhouette
                className="max-h-[min(85%,320px)] w-full"
                stroke={chromeForStrokes.canvas.bodyStroke}
              />
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

      <div className="relative z-10 flex shrink-0 flex-col" style={{ backgroundColor: interfaceBg }}>
        {sizeCarouselEnabled ? (
          <PreviewSizeCarousel
            sizeKeys={sizeKeys}
            currentSize={currentSize}
            windowStart={windowStart}
            onSelectSize={handleSelectSizeForAnalytics}
            accentColor={accent}
          />
        ) : null}

        <PreviewAccentCtaButton
          variant="cart"
          label={cartLabel}
          accentColor={accent}
          onClick={addToCartUrlTemplate?.trim() ? handleAddToCartClick : undefined}
        />
      </div>

      {bodyAdjustEnabled && bodySheetOpen ? (
        <div
          className="absolute inset-0 z-50 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[34px]"
          style={{ backgroundColor: canvasBg }}
          data-fitlook-body-adjust
        >
          <div className="relative z-10 flex shrink-0 flex-col" style={{ backgroundColor: interfaceBg }}>
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
          </div>
          <PreviewViewerShell backgroundColor={canvasBg} clipContent>
            {garmentFitAvailable ? (
              <>
                {customGarmentData ? (
                  <div className="flex h-full min-h-0 w-full flex-1 justify-center">
                    <PreviewFittingCanvasSvg
                      fitHeightCm={bodyDraftHeight}
                      fitBodyVal={bodyDraftVal}
                      currentSize={currentSize}
                      customGarmentData={customGarmentData}
                      orderedSizeKeys={sizeKeys}
                      fitChestBandCategory={productCategory}
                      bodyOnly
                      bodySheetHeightScale
                      fitEaseRevealNonce={fitEaseRevealNonce}
                      embeddedWidgetUi
                    />
                  </div>
                ) : authLoading ? (
                  <div
                    className="flex flex-1 items-center justify-center px-6 text-center text-[14px]"
                    style={{ color: chromeForStrokes.canvas.mutedFg }}
                  >
                    読み込み中…
                  </div>
                ) : draftFitError && !draftFitData ? (
                  <div className="max-w-[280px] flex-1 self-center px-4 text-center text-[13px] leading-snug text-red-700">
                    {draftFitError}
                  </div>
                ) : draftFitData ? (
                  <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden py-0.5">
                    <div
                      className="flex min-h-0 w-full max-w-full max-h-[88%] flex-1 items-center justify-center overflow-hidden sm:max-h-[94%]"
                      style={{
                        transform: `scale(${bodySheetPreviewHeightScale(bodyDraftHeight)})`,
                        transformOrigin: "center center",
                      }}
                    >
                      <svg
                        viewBox={`${draftFitData.viewBoxMinX ?? 0} 0 ${draftFitData.viewBoxWidth} ${uniformPreviewViewBoxHeightFromHeightCm(bodyDraftHeight)}`}
                        preserveAspectRatio="xMidYMid meet"
                        className="block h-auto max-h-full w-auto min-h-0 min-w-0 max-w-full overflow-visible"
                        style={{
                          aspectRatio: `${draftFitData.viewBoxWidth} / ${uniformPreviewViewBoxHeightFromHeightCm(bodyDraftHeight)}`,
                        }}
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <g style={{ opacity: fitSvgStageEmbed >= 1 ? 1 : 0, transition: "opacity 0.42s ease-out" }}>
                          {draftFitData.presetId === "gradingV4" &&
                          gradingV4UsesLayeredGridBodySilhouette(draftFitData.bodyPaths.length) ? (
                            <>
                              <g fill={canvasBg} stroke="none">
                                {draftFitData.bodyPaths.map((d, i) => (
                                  <path
                                    key={`bdf-${i}`}
                                    d={d}
                                    fill={gradingV4GridBodyPathEndsClosed(d) ? canvasBg : "none"}
                                  />
                                ))}
                              </g>
                              <g
                                fill="none"
                                stroke={GRADING_V4_GRID_BODY_SILHOUETTE_STROKE}
                                strokeWidth={4}
                                pointerEvents="none"
                              >
                                {draftFitData.bodyPaths[0] ? (
                                  <path key="bod-o" d={draftFitData.bodyPaths[0]} />
                                ) : null}
                                {draftFitData.bodyPaths.map((d, i) =>
                                  i > 0 && !gradingV4GridBodyPathEndsClosed(d) ? (
                                    <path key={`bds-${i}`} d={d} />
                                  ) : null
                                )}
                              </g>
                            </>
                          ) : (
                            <g fill={canvasBg} stroke={chromeForStrokes.canvas.bodyStroke} strokeWidth={4}>
                              {draftFitData.bodyPaths.map((d, i) => (
                                <path key={`bod-${i}`} d={d} />
                              ))}
                            </g>
                          )}
                        </g>
                      </svg>
                    </div>
                    <div
                      style={{
                        opacity: showDraftEaseText ? 1 : 0,
                        transition: "opacity 0.35s ease-out",
                      }}
                    >
                      <PreviewFitEaseSummary summary={draftFitData.fitEaseSummary} />
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex flex-1 items-center justify-center text-[14px]"
                    style={{ color: chromeForStrokes.canvas.mutedFg }}
                  >
                    {draftFitLoading ? "読み込み中…" : fitError ?? "試着表示を読み込めませんでした"}
                  </div>
                )}
              </>
            ) : (
              <div className="pointer-events-none flex flex-1 items-center justify-center">
                <PreviewBodySilhouette
                  className="max-h-[min(85%,320px)] w-full"
                  stroke={chromeForStrokes.canvas.bodyStroke}
                />
              </div>
            )}
          </PreviewViewerShell>
          <div className="relative z-10 flex shrink-0 flex-col" style={{ backgroundColor: interfaceBg }}>
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
                  if (embedPublicWidget && embedShopId) {
                    void sendWidgetAnalyticsEvent({
                      shopId: embedShopId,
                      productId,
                      type: "height_change",
                      meta: {
                        heightCm: bodyDraftHeight,
                        bodyVal: bodyDraftVal,
                        ...embedAnalyticsMeta,
                      },
                    });
                  }
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
                      /* ignore */
                    }
                  }
                  setBodySheetOpen(false);
                  /** メイン試着に戻ってから段階表示をやり直す（シート表示中に nonce が変わらないようにする） */
                  setFitEaseRevealNonce((n) => n + 1);
                })();
              }}
            />
          </div>
        </div>
      ) : null}
        </div>
      </PreviewChromeThemeProvider>
    </PreviewChromeScaleProvider>
  );
}
