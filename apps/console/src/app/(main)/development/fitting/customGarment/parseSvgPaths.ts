/**
 * SVG から `<path>` ごとの d と線スタイル（stroke / stroke-width / stroke-dasharray）を抽出。
 * - プレゼンテーション属性（stroke-width / stroke-dasharray / stroke）を読む。
 * - `style="..."` 内の同プロパティも読み、**style があればそちらを優先**（ブラウザと同様）。
 * - `<g>` 継承や `<style>` ブロック内のクラスは未対応。
 */

export type SvgPathPresentation = {
  strokeDasharray?: string;
  strokeWidth?: number;
  stroke?: string;
};

export type SvgParsedPath = { d: string } & SvgPathPresentation;

function pickAttr(attrs: string, name: string): string | undefined {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = attrs.match(re);
  return m?.[1]?.trim();
}

/** 先頭の数値（px / mm 等の単位付きでも可） */
function parseCssNumber(raw: string | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const t = raw.trim().toLowerCase();
  if (t === "none" || t === "transparent") return undefined;
  const m = raw.match(/-?[\d.]+/);
  if (!m) return undefined;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeDasharray(raw: string | undefined): string | undefined {
  if (raw == null || raw === "") return undefined;
  const t = raw.trim().toLowerCase();
  if (t === "none") return undefined;
  return raw.replace(/,/g, " ").replace(/\s+/g, " ").trim();
}

/** `style="fill:none;stroke-dasharray:4 2"` のような文字列を宣言ごとに分割 */
function parseStyleAttributeDeclarations(style: string): Map<string, string> {
  const map = new Map<string, string>();
  const s = style.trim();
  if (s.length === 0) return map;
  for (const chunk of s.split(";")) {
    const colon = chunk.indexOf(":");
    if (colon === -1) continue;
    const key = chunk.slice(0, colon).trim().toLowerCase();
    const val = chunk.slice(colon + 1).trim();
    if (key.length > 0) map.set(key, val);
  }
  return map;
}

/**
 * プレゼンテーション属性のみ。`parsePresentationFromAttrs` が style で上書きする。
 */
function parsePresentationFromPresentationAttrs(attrs: string): SvgPathPresentation {
  const swRaw =
    pickAttr(attrs, "stroke-width") ??
    pickAttr(attrs, "strokeWidth") ??
    undefined;
  const strokeWidth = parseCssNumber(swRaw);
  const dashRaw =
    pickAttr(attrs, "stroke-dasharray") ?? pickAttr(attrs, "strokeDasharray") ?? undefined;
  const strokeDasharray = normalizeDasharray(dashRaw);
  const strokeRaw = pickAttr(attrs, "stroke");
  let stroke: string | undefined;
  if (strokeRaw != null) {
    const low = strokeRaw.trim().toLowerCase();
    if (low !== "none" && low !== "transparent") stroke = strokeRaw.trim();
  }
  const out: SvgPathPresentation = {};
  if (strokeDasharray != null) out.strokeDasharray = strokeDasharray;
  if (strokeWidth != null && strokeWidth > 0) out.strokeWidth = strokeWidth;
  if (stroke != null) out.stroke = stroke;
  return out;
}

function parsePresentationFromAttrs(attrs: string): SvgPathPresentation {
  const out = parsePresentationFromPresentationAttrs(attrs);
  const styleStr = pickAttr(attrs, "style");
  if (styleStr == null || styleStr.trim() === "") return out;

  const decl = parseStyleAttributeDeclarations(styleStr);

  if (decl.has("stroke-dasharray")) {
    const raw = decl.get("stroke-dasharray")!;
    const low = raw.trim().toLowerCase();
    if (low === "none") {
      delete out.strokeDasharray;
    } else {
      const d = normalizeDasharray(raw);
      if (d != null) out.strokeDasharray = d;
      else delete out.strokeDasharray;
    }
  }

  if (decl.has("stroke-width")) {
    const w = parseCssNumber(decl.get("stroke-width"));
    if (w != null && w > 0) out.strokeWidth = w;
    else delete out.strokeWidth;
  }

  if (decl.has("stroke")) {
    const raw = decl.get("stroke")!;
    const low = raw.trim().toLowerCase();
    if (low === "none" || low === "transparent") {
      delete out.stroke;
    } else {
      out.stroke = raw.trim();
    }
  }

  return out;
}

/**
 * SVG 文字列から `<path>` を出現順に解析。d と線の見た目に使う属性を保持。
 */
export function parseSvgPathsDetailed(svgText: string): SvgParsedPath[] {
  const out: SvgParsedPath[] = [];
  const tagRe = /<path\b([^>]*?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(svgText)) !== null) {
    const attrs = m[1] ?? "";
    const dMatch = attrs.match(/\bd\s*=\s*["']([^"']+)["']/i);
    if (!dMatch) continue;
    const d = dMatch[1].trim().replace(/,/g, " ").replace(/\s+/g, " ");
    if (d.length === 0) continue;
    const pres = parsePresentationFromAttrs(attrs);
    out.push({ d, ...pres });
  }
  return out;
}

/** @deprecated 互換: d のみ必要なとき */
export function parseSvgPaths(svgText: string): string[] {
  return parseSvgPathsDetailed(svgText).map((p) => p.d);
}
