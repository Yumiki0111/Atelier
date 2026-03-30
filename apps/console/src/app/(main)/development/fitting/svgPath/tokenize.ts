/** SVG 数値: 符号 + / 省略可、.5 / 10. / 指数表記。+ だけ認識できないとトークン列がずれ飛び線になる */
export const SVG_NUMBER_PATTERN = String.raw`[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?`;
export const TOKEN_RE = new RegExp(String.raw`([MmLlHhVvCcSsQqTtAaZz])|(${SVG_NUMBER_PATTERN})`, "gi");
export const NUM_RE = new RegExp(SVG_NUMBER_PATTERN, "gi");
export const NUM_ONLY_RE = new RegExp(String.raw`^${SVG_NUMBER_PATTERN}$`, "i");

export function tokenize(d: string): string[] {
  // SVG では数値の区切りにカンマが使える。正規表現がカンマを読まないとトークン列がずれ、
  // Z 以降の相対座標や曲線が壊れ「脇から縦に飛ぶ線」「塗りの三角」になる。
  const normalized = d.replace(/,/g, " ");
  const toks: string[] = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(normalized)) !== null) toks.push(m[0]);
  return toks;
}

/** path 変換後の座標。0.1 刻みだと曲線が段差に見えるため 3 桁に丸める（名称は旧互換） */
export function round10(v: number): number {
  return Math.round(v * 1000) / 1000;
}
