/**
 * SVG 文字列から `<path d="...">` の d を出現順に抽出（名前空間付き path には非対応）。
 */
export function parseSvgPaths(svgText: string): string[] {
  const out: string[] = [];
  const re = /<path\b[^>]*\bd\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svgText)) !== null) {
    const d = m[1].trim().replace(/,/g, " ").replace(/\s+/g, " ");
    if (d.length > 0) out.push(d);
  }
  return out;
}
