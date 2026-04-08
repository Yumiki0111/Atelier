/**
 * 埋め込みウィジェット用 data 属性（サービス名: FIT&LOOK）。
 * 従来の `data-atelier-*` も読み取り互換としてサポートする。
 */

export const WIDGET_EMBED_PREFIX = "fitlook";
export const WIDGET_EMBED_LEGACY_PREFIX = "atelier";

export function readEmbedAttr(el: Element, name: string): string | null {
  return (
    el.getAttribute(`data-${WIDGET_EMBED_PREFIX}-${name}`) ??
    el.getAttribute(`data-${WIDGET_EMBED_LEGACY_PREFIX}-${name}`)
  );
}

/** `data-fitlook-placement` が `inline` / `embedded` のとき、ホスト内インライン表示（固定フローティングではない） */
export function isInlinePlacement(placement: string | null | undefined): boolean {
  if (!placement) return false;
  const p = placement.trim().toLowerCase();
  return p === "inline" || p === "embedded";
}

/** `data-fitlook-overlay="true"` … ホスト上に透明の全幅タップ領域のみ（フローティングボタンは出さない） */
export function isOverlayModeFromAttr(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/** `data-fitlook-phone-frame="false"` … 試着モーダルにスマホ端末枠（プレビュー用ベゼル）を出さない */
export function isPhoneFrameDisabledFromAttr(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "false";
}

/** ウィジェットを初期化するホスト要素（新・旧 data 属性） */
export const WIDGET_HOST_SELECTOR = [
  "[data-fitlook-public-key]",
  "[data-atelier-public-key]",
  "[data-fitlook-shop-id]",
  "[data-atelier-shop-id]",
].join(", ");

export const WIDGET_CONTAINER_ID_PREFIX = "fitlook-widget-container-";
/** 旧バージョンのウィジェットが付与した ID 接頭辞（掃除・位置計算で参照） */
export const WIDGET_CONTAINER_LEGACY_ID_PREFIX = "Atelier-widget-container-";

export const WIDGET_BUTTON_ID_PREFIX = "fitlook-widget-button-";

export const WIDGET_ALL_CONTAINER_SELECTOR = `[id^="${WIDGET_CONTAINER_ID_PREFIX}"], [id^="${WIDGET_CONTAINER_LEGACY_ID_PREFIX}"]`;

export const WIDGET_LOG_PREFIX = "[FIT&LOOK Widget]";

export function readApiUrlFromDocument(): string | null {
  return (
    document.querySelector("[data-fitlook-api-url]")?.getAttribute("data-fitlook-api-url") ??
    document.querySelector("[data-atelier-api-url]")?.getAttribute("data-atelier-api-url") ??
    null
  );
}
