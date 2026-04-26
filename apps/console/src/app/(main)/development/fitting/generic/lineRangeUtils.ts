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

/**
 * カンマ区切りの連結頂点列（順序そのまま）。連続・単調は不要（例: `5,4,3,2,1,9`）。
 * 2 個以上の整数が必要。
 */
export function parseSleeveMeasureVertexList(raw: string): number[] | undefined {
  const s = normalizeLineRangeInputString(raw);
  if (s === "") return undefined;
  if (!/[,，、]/.test(s)) return undefined;
  const parts = s.split(/[,，、]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return undefined;
  const nums: number[] = [];
  for (const p of parts) {
    const a = Math.trunc(Number(p));
    if (!Number.isFinite(a)) return undefined;
    nums.push(a);
  }
  return nums;
}

/**
 * 袖丈連結: `8-15` / `8`（従来）に加え、カンマ列は **入力順の両端** を始点・終点（`5,4,3,2,1,9` → [5,9]）。
 * `buildGenericScalableSpec` 等では必要に応じて min/max に正規化される。
 */
export function parseSleeveMeasureVertexInput(raw: string): [number, number] | undefined {
  const s = normalizeLineRangeInputString(raw);
  if (s === "") return undefined;
  const list = parseSleeveMeasureVertexList(s);
  if (list && list.length >= 2) {
    const g0 = list[0]!;
    const g1 = list[list.length - 1]!;
    if (g0 === g1) return undefined;
    return [g0, g1];
  }
  return parseLineRangeInput(s);
}

/**
 * キャンバスでホバー中の # を r で追加。既存が `a-b` のときは新しいチェーンとして `v` から開始。
 */
export function appendSleeveMeasureVertexWithR(currentRaw: string, v: number): string {
  const n = Math.trunc(v);
  if (!Number.isFinite(n)) return currentRaw.trim();
  const t = normalizeLineRangeInputString(currentRaw);
  if (t === "") return String(n);

  const chainExisting = parseSleeveMeasureVertexList(t);
  if (chainExisting) {
    const last = chainExisting[chainExisting.length - 1]!;
    if (n === last) return currentRaw.trim();
    return `${t},${n}`;
  }

  const range = parseLineRangeInput(t);
  if (range) {
    const [a, b] = range;
    if (a === b) {
      if (n === a) return currentRaw.trim();
      return `${a},${n}`;
    }
    return String(n);
  }
  return String(n);
}

export function formatLineRangeInput(t: [number, number] | undefined): string {
  if (!t) return "";
  const [a, b] = t;
  return a === b ? String(a) : `${a}-${b}`;
}

export function lineIndexInRange(pathIdx: number, r: LineIndexRange): boolean {
  return pathIdx >= r.from && pathIdx <= r.to;
}

export type ParseIndexSetListResult =
  | { ok: true; indices: number[] }
  | { ok: false; error: string };

/**
 * 服プロット等の「表示する連結 # だけ」指定用。例: `3`, `1,4,5`, `10-20`, `0,3-5,12`
 * 空入力は { ok, indices: [] }（呼び出し側で「全表示」と「無効」どちらにするか決める）。
 */
export function parseIndexSetListInput(raw: string): ParseIndexSetListResult {
  const s = normalizeLineRangeInputString(raw);
  if (s === "") return { ok: true, indices: [] };
  const parts = s
    .split(/[,，、]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out = new Set<number>();
  for (const p of parts) {
    if (/^\d+$/.test(p)) {
      out.add(Math.trunc(Number(p)));
      continue;
    }
    const r = parseLineRangeInput(p);
    if (!r) {
      return { ok: false, error: `解釈できない区間: ${p}` };
    }
    const [lo, hi] = r;
    for (let k = lo; k <= hi; k++) out.add(k);
  }
  return { ok: true, indices: [...out].sort((a, b) => a - b) };
}
