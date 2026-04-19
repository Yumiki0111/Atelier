import { fetchWidgetConfig, fetchWidgetDesign, sendEvent, type WidgetParams } from "./widget-api";
import { waitForFitLookSplashHold } from "./widget-fitlook-logo";
import {
  renderCube,
  applyDesignToButton,
  showDefaultButton,
  renderModalWithLoading,
  updateModalWithConfig,
  showErrorInModal,
  updateButtonPositions,
  appendEmbedIframeBehindSplash,
  FITLOOK_SPLASH_FINISHED_MESSAGE,
} from "./widget-render";
import { emitDebugLog } from "./widget-debug-log";
import {
  readEmbedAttr,
  WIDGET_HOST_SELECTOR,
  WIDGET_CONTAINER_ID_PREFIX,
  WIDGET_ALL_CONTAINER_SELECTOR,
  WIDGET_LOG_PREFIX,
  isInlinePlacement,
  isOverlayModeFromAttr,
  isPhoneFrameDisabledFromAttr,
  isDesktopPanelFromAttr,
  isDesktopPanelFromLocationSearch,
} from "./embed-data";
import type { WidgetDesignConfig } from "./types";

function widgetEventMeta(params: WidgetParams): Record<string, unknown> | undefined {
  const meta: Record<string, unknown> = {};
  if (params.placement) meta.placement = params.placement;
  if (params.initialSize) meta.initialSize = params.initialSize;
  if (params.overlay) meta.overlay = true;
  if (params.eventSource) meta.eventSource = params.eventSource;
  return Object.keys(meta).length ? meta : undefined;
}

export function initWidget() {
  // 既存のボタンをクリーンアップ（ページ遷移時などに対応）
  // 現在のページに存在するウィジェット要素に対応するボタンのみを保持
  const elements = document.querySelectorAll<HTMLElement>(WIDGET_HOST_SELECTOR);

  // 現在のページに存在する商品IDを収集
  const currentProductIds = new Set<string>();
  elements.forEach((element) => {
    const productId =
      readEmbedAttr(element, "product-id") || readEmbedAttr(element, "external-product-id");
    if (productId) {
      currentProductIds.add(productId);
    }
  });

  // 現在のページに存在しない商品のコンテナ（ボタンと画像を含む）を削除
  const allWidgetContainers = document.querySelectorAll<HTMLElement>(WIDGET_ALL_CONTAINER_SELECTOR);
  allWidgetContainers.forEach((container) => {
    const containerProductId = readEmbedAttr(container, "product-id");
    if (containerProductId && !currentProductIds.has(containerProductId)) {
      container.remove();
    }
  });

  if (elements.length === 0) {
    console.warn(
      `${WIDGET_LOG_PREFIX} No widget elements found. Use data-fitlook-public-key / data-fitlook-shop-id (or legacy data-atelier-*).`
    );
    return;
  }

  elements.forEach((element, index) => {
    // 既に初期化されている要素はスキップ
    if (element.shadowRoot) {
      return;
    }

    // 新しい形式: public-key を優先
    const publicKey = readEmbedAttr(element, "public-key");
    const externalProductId = readEmbedAttr(element, "external-product-id");

    // 後方互換性: 古い形式もサポート
    const shopId = readEmbedAttr(element, "shop-id");
    const productId = readEmbedAttr(element, "product-id");

    const sku = readEmbedAttr(element, "sku");
    const handle = readEmbedAttr(element, "handle");
    const url = readEmbedAttr(element, "url");
    const placement = readEmbedAttr(element, "placement");
    const initialSize = readEmbedAttr(element, "initial-size");
    const overlay = isOverlayModeFromAttr(readEmbedAttr(element, "overlay"));
    const phoneFrameDisabled = isPhoneFrameDisabledFromAttr(readEmbedAttr(element, "phone-frame"));
    const desktopPanel =
      isDesktopPanelFromAttr(readEmbedAttr(element, "desktop-panel")) ||
      isDesktopPanelFromLocationSearch();
    const addToCartUrlTemplate = readEmbedAttr(element, "add-to-cart-url");
    const eventSourceRaw = readEmbedAttr(element, "event-source");
    const eventSource =
      eventSourceRaw?.trim().toLowerCase() === "preview_link" ? "preview_link" : null;

    if (!publicKey && !shopId) {
      console.warn(`${WIDGET_LOG_PREFIX} public-key or shop-id is required`);
      return;
    }

    try {
      // 親要素のスタイル（インラインは行内に収まるよう inline-block）
      if (overlay) {
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.left = "0";
        element.style.top = "0";
        element.style.right = "0";
        element.style.bottom = "0";
        element.style.width = "100%";
        element.style.height = "100%";
        element.style.zIndex = "10";
        element.style.margin = "0";
        element.style.padding = "0";
        element.style.border = "none";
        element.style.background = "transparent";
      } else if (isInlinePlacement(placement)) {
        element.style.display = "inline-block";
        element.style.verticalAlign = "middle";
      } else {
        element.style.display = "block";
      }
      if (!overlay) {
        element.style.width = "auto";
        element.style.height = "auto";
        element.style.margin = "0";
        element.style.padding = "0";
        element.style.border = "none";
        element.style.background = "transparent";
      }

      // Create shadow DOM
      const shadowRoot = element.attachShadow({ mode: "open" });

      const params: WidgetParams = {
        publicKey: publicKey || null,
        shopId: shopId || null, // 後方互換性のため
        externalProductId: externalProductId || null,
        productId: productId || null, // 後方互換性のため
        sku,
        handle,
        url,
        placement: placement || null,
        initialSize: initialSize || null,
        overlay: overlay ? true : null,
        /** オーバーレイは常に全幅モーダル（属性が効かない環境でも枠を出さない） */
        phoneFrame: phoneFrameDisabled || overlay ? false : null,
        desktopPanel: desktopPanel ? true : null,
        addToCartUrlTemplate: addToCartUrlTemplate?.trim() ? addToCartUrlTemplate : null,
        eventSource,
      };

      if (typeof window !== "undefined") {
        (window as unknown as { __FITLOOK_WIDGET_DESKTOP_PANEL?: boolean | null }).__FITLOOK_WIDGET_DESKTOP_PANEL =
          params.desktopPanel;
      }
      // #region agent log
      emitDebugLog({
        sessionId: "673bd6",
        runId: "debug-desktop-panel",
        hypothesisId: "A",
        location: "widget.ts:initWidget:params",
        message: "initWidget params desktopPanel",
        data: {
          desktopPanel: params.desktopPanel === true,
          overlay: params.overlay === true,
          placement: params.placement ?? null,
          desktopAttrRaw: readEmbedAttr(element, "desktop-panel"),
          fromUrl: typeof window !== "undefined" ? window.location.search : null,
        },
      });
      fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a81229" },
        body: JSON.stringify({
          sessionId: "a81229",
          hypothesisId: "A",
          location: "widget.ts:initWidget:params",
          message: "desktopPanel init",
          data: {
            desktopAttrRaw: readEmbedAttr(element, "desktop-panel"),
            desktopPanelResolved: params.desktopPanel === true,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      const pid = productId || externalProductId || `widget-${Date.now()}-${Math.random()}`;
      const safePid = String(pid).replace(/[^a-zA-Z0-9_-]/g, "_");
      const containerId = `${WIDGET_CONTAINER_ID_PREFIX}${safePid}-${index}`;
      const designRoot: Document | ShadowRoot =
        isInlinePlacement(placement) || overlay ? shadowRoot : document;

      // ボタンを即座に作成（デザイン取得前に非表示で）
      renderCube(shadowRoot, params, handleCubeClick, null, containerId);

      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const productIdForEvent =
        params.productId || params.externalProductId || undefined;
      const validProductIdForEvent =
        productIdForEvent && uuidRe.test(productIdForEvent) ? productIdForEvent : undefined;

      let cubeViewSent = false;
      function trySendCubeView(shopIdForEvent: string) {
        if (cubeViewSent || !shopIdForEvent || shopIdForEvent === "unknown") return;
        cubeViewSent = true;
        sendEvent({
          shopId: shopIdForEvent,
          productId: validProductIdForEvent,
          type: "cube_view",
          meta: widgetEventMeta(params),
        }).catch(() => {});
      }

      if (publicKey) {
        // 最大1500msでデザインを取得。タイムアウトした場合はデフォルトを表示
        const designFetch = fetchWidgetDesign(publicKey);
        const designTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
        Promise.race([designFetch, designTimeout])
          .then((design) => {
            const d = design as WidgetDesignConfig | null;
            if (d?.shopId) {
              params.shopId = d.shopId;
            }
            if (d?.button) {
              applyDesignToButton(containerId, d, designRoot);
            } else {
              showDefaultButton(containerId, designRoot);
            }
            trySendCubeView(d?.shopId || params.shopId || "");
          })
          .catch(() => {
            showDefaultButton(containerId, designRoot);
          });
        // タイムアウト後に実際のデザインが届いた場合も適用（cube_view は未送信なら shopId 取得時に送る）
        designFetch
          .then((design) => {
            const d = design as WidgetDesignConfig | null;
            if (!d) return;
            if (d.shopId) {
              params.shopId = d.shopId;
            }
            if (d.button) {
              applyDesignToButton(containerId, d, designRoot);
            }
            trySendCubeView(d.shopId || params.shopId || "");
          })
          .catch(() => {});
      } else {
        // publicKeyがない場合はデフォルトを即時適用
        showDefaultButton(containerId, designRoot);
        trySendCubeView(params.shopId || "");
      }

      const autoOpen = readEmbedAttr(element, "auto-open")?.trim().toLowerCase() === "true";
      if (autoOpen) {
        params.reopenAfterModalClose = true;
        queueMicrotask(() => {
          void handleCubeClick(shadowRoot, params);
        });
      }
    } catch (error) {
      console.error(`${WIDGET_LOG_PREFIX} Failed to initialize widget ${index + 1}:`, error);
    }
  });

  // すべてのボタンの位置を再計算（初期化後）
  updateButtonPositions();
}

async function handleCubeClick(shadowRoot: ShadowRoot, params: WidgetParams) {
  // パラメータの検証
  if (!params.publicKey && !params.shopId) {
    alert("ウィジェットの設定エラー: Public Keyが設定されていません");
    return;
  }

  if (!params.externalProductId && !params.productId) {
    alert(
      "ウィジェットの設定エラー: 商品IDが設定されていません。data-fitlook-external-product-id（推奨）または data-atelier-external-product-id を追加してください。"
    );
    return;
  }

  // モーダルを即座に表示（ローディング状態）
  const { overlay, contentArea } = renderModalWithLoading(shadowRoot, params);
  const splashStartMs = Date.now();

  const reopenHandler = params.reopenAfterModalClose
    ? () => {
        void handleCubeClick(shadowRoot, params);
      }
    : undefined;

  try {
    const configPromise = fetchWidgetConfig(params);
    const splashHoldPromise = waitForFitLookSplashHold(contentArea, splashStartMs);

    const config = await configPromise;
    const surfaceBg = config.design?.interfaceBackgroundColor ?? "#fafafa";

    let garmentIframe: HTMLIFrameElement | null = null;
    if (config.enabled && config.asset?.garmentFitAvailable) {
      garmentIframe = appendEmbedIframeBehindSplash(overlay, contentArea, params, reopenHandler, {
        surfaceBackgroundColor: surfaceBg,
      });
    }

    await splashHoldPromise;

    const splashCleanup = (overlay as unknown as { __fitlookCleanup?: { fn: () => void } }).__fitlookCleanup;
    if (splashCleanup?.fn) splashCleanup.fn();

    contentArea.querySelector("[data-fitlook-splash-wrap]")?.remove();

    // #region agent log
    emitDebugLog({
      sessionId: "673bd6",
      runId: "debug-desktop-panel",
      hypothesisId: "D",
      location: "widget.ts:handleCubeClick:afterSplashRemove",
      message: "after splash remove",
      data: {
        garmentIframe: garmentIframe != null,
        desktopPanel: params.desktopPanel === true,
        overlayAttr: overlay.getAttribute("data-fitlook-desktop-panel"),
        winLast: (typeof window !== "undefined"
          ? (window as unknown as { __FITLOOK_DESKTOP_PANEL_LAST?: Record<string, unknown> })
              .__FITLOOK_DESKTOP_PANEL_LAST
          : null) as Record<string, unknown> | null,
      },
    });
    // #endregion

    if (garmentIframe) {
      const notifySplashFinished = () => {
        try {
          garmentIframe.contentWindow?.postMessage({ type: FITLOOK_SPLASH_FINISHED_MESSAGE }, "*");
        } catch {
          /* ignore */
        }
      };
      notifySplashFinished();
      garmentIframe.addEventListener("load", notifySplashFinished, { once: true });
    }

    const resolvedShopId = params.shopId || config.shopId || "";
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pid = params.productId || params.externalProductId || "";
    if (resolvedShopId && resolvedShopId !== "unknown") {
      sendEvent({
        shopId: resolvedShopId,
        productId: uuidRe.test(pid) ? pid : undefined,
        type: "cube_click",
        meta: widgetEventMeta(params),
      }).catch(() => {});
    }

    if (!(config.enabled && config.asset?.garmentFitAvailable)) {
      if (config.enabled) {
        /** スプラッシュ側で落下終了＋1.5s ホールド済みのため、ここでは追加遅延しない */
        updateModalWithConfig(shadowRoot, config, params, overlay, contentArea, reopenHandler, {
          deferGarmentViewerMs: 0,
        });
      } else {
        const errorDetails = config.error || "不明なエラー";
        showErrorInModal(shadowRoot, `この商品の試着は現在利用できません。\n\nエラー: ${errorDetails}`, overlay, contentArea);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`${WIDGET_LOG_PREFIX} Error in handleCubeClick:`, errorMessage);
    await waitForFitLookSplashHold(contentArea, splashStartMs);
    showErrorInModal(shadowRoot, `試着画面の読み込みに失敗しました。\n\nエラー: ${errorMessage}`, overlay, contentArea);
  }
}
