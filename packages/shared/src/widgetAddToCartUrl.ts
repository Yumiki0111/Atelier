export type AddToCartUrlInterpolationVars = {
  /** カート連携用の商品識別子（外部商品 ID を優先して渡す） */
  productId: string;
  size: string;
  colorId: string;
};

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

/**
 * 埋め込み `data-fitlook-add-to-cart-url` 用。`{{productId}}` `{{size}}` `{{colorId}}` を URL 安全に置換する。
 * `{{rawProductId}}` `{{rawSize}}` `{{rawColorId}}` はエンコードしない（パス用など）。
 */
export function interpolateAddToCartUrlTemplate(
  template: string,
  vars: AddToCartUrlInterpolationVars
): string {
  const { productId, size, colorId } = vars;
  let out = template;
  const pairs: [string, string][] = [
    ["{{productId}}", encodeSegment(productId)],
    ["{{externalProductId}}", encodeSegment(productId)],
    ["{{size}}", encodeSegment(size)],
    ["{{colorId}}", encodeSegment(colorId)],
    ["{{rawProductId}}", productId],
    ["{{rawExternalProductId}}", productId],
    ["{{rawSize}}", size],
    ["{{rawColorId}}", colorId],
  ];
  for (const [key, val] of pairs) {
    out = out.split(key).join(val);
  }
  return out;
}

function isSafeHttpNavigationTarget(href: string): boolean {
  const t = href.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return false;
  }
  return true;
}

/**
 * `/cart` のような相対 URL を、親ページ origin（iframe では referrer origin など）基準で絶対化する。
 */
export function resolveAddToCartNavigationHref(
  interpolated: string,
  relativeBaseOrigin: string | null | undefined
): string | null {
  const t = interpolated.trim();
  if (!t) return null;
  if (!isSafeHttpNavigationTarget(t)) return null;

  if (/^https?:\/\//i.test(t) || t.startsWith("//")) {
    return t;
  }

  const base = relativeBaseOrigin?.replace(/\/$/, "") ?? "";
  if (t.startsWith("/")) {
    if (!base) return t;
    return `${base}${t}`;
  }

  if (base) {
    try {
      return new URL(t, `${base}/`).href;
    } catch {
      return null;
    }
  }

  return t;
}
