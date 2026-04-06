import type { SvgParsedPath } from "./parseSvgPaths";

/**
 * 1 つの path `d` に複数の moveto（M/m）があるとき、サブパスごとに分割する。
 * アップロード SVG を「見た目は同じ・path 数は多い」形に揃え、グレーディングの頂点対応を安定させる。
 */
export function splitPathDataIntoSubpaths(d: string): string[] {
  const t = d.trim();
  if (!t) return [];
  return t
    .split(/(?=[Mm])/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** 各 `<path>` の `d` をサブパス単位にばらし、`SvgParsedPath` を増やす（属性は複製）。 */
export function expandSvgParsedPathsBySubpaths(paths: SvgParsedPath[]): SvgParsedPath[] {
  const out: SvgParsedPath[] = [];
  for (const p of paths) {
    const parts = splitPathDataIntoSubpaths(p.d);
    if (parts.length <= 1) {
      out.push(p);
      continue;
    }
    for (const part of parts) {
      out.push({ ...p, d: part });
    }
  }
  return out;
}
