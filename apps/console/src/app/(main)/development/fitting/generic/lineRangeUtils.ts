import type { LineIndexRange } from "./types";

export function normalizeLineRange(from: number, to: number): LineIndexRange {
  const a = Math.trunc(from);
  const b = Math.trunc(to);
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

export function lineRangeFromTuple(t: [number, number]): LineIndexRange {
  return normalizeLineRange(t[0], t[1]);
}

/** 全角数字・全角/Unicode ハイフンを ASCII に寄せてからパース（IME・コピペ対策） */
function normalizeLineRangeInputString(raw: string): string {
  return raw
    .trim()
    .replace(/[\uFF10-\uFF19]/g, (ch) => String(ch.charCodeAt(0) - 0xff10))
    .replace(/\uFF0D|\u2212|\u2013|\u2014/g, "-");
}

/** UI 用: 「5」または「1-7」「1〜7」 */
export function parseLineRangeInput(raw: string): [number, number] | undefined {
  const s = normalizeLineRangeInputString(raw);
  if (s === "") return undefined;
  const m = s.match(/^(\d+)(?:\s*[-–〜]\s*(\d+))?$/);
  if (!m) return undefined;
  const a = Math.trunc(Number(m[1]));
  if (!Number.isFinite(a)) return undefined;
  if (m[2] == null || m[2] === "") return [a, a];
  const b = Math.trunc(Number(m[2]));
  if (!Number.isFinite(b)) return undefined;
  return a <= b ? [a, b] : [b, a];
}

export function formatLineRangeInput(t: [number, number] | undefined): string {
  if (!t) return "";
  const [a, b] = t;
  return a === b ? String(a) : `${a}-${b}`;
}

export function lineIndexInRange(pathIdx: number, r: LineIndexRange): boolean {
  return pathIdx >= r.from && pathIdx <= r.to;
}
