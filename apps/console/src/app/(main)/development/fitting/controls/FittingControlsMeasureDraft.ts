import { formatLineRangeInput, parseLineRangeInput } from "../generic";

type ParsePair = (raw: string) => [number, number] | undefined;

export function measureVertexRangeStr(a: number | undefined, b: number | undefined): string {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return "";
  const lo = Math.min(Math.trunc(a), Math.trunc(b));
  const hi = Math.max(Math.trunc(a), Math.trunc(b));
  return formatLineRangeInput([lo, hi]);
}

export type MeasureDraftSlice = {
  range: string;
  vs: number | undefined;
  ve: number | undefined;
};

/** 親 `gt` へ同期するとき、入力途中（parse 不能）や Apply 前の確定値を上書きしない */
export function coalesceMeasureDraftFromGt(
  gtStr: string,
  draftRaw: string,
  draftVs: number | undefined,
  draftVe: number | undefined,
  forceFromGt: boolean,
  parsePair: ParsePair = parseLineRangeInput
): MeasureDraftSlice {
  if (forceFromGt) {
    const sp = parsePair(gtStr);
    return { range: gtStr, vs: sp ? sp[0] : undefined, ve: sp ? sp[1] : undefined };
  }
  const trimmed = draftRaw.trim();
  const parsedDraft = trimmed === "" ? undefined : parsePair(trimmed);
  if (trimmed !== "" && parsedDraft == null) {
    return { range: draftRaw, vs: draftVs, ve: draftVe };
  }
  const parsedGt = gtStr.trim() === "" ? undefined : parsePair(gtStr);
  const norm = (p: [number, number]) => {
    const lo = Math.min(p[0], p[1]);
    const hi = Math.max(p[0], p[1]);
    return [lo, hi] as const;
  };
  const dN = parsedDraft ? norm(parsedDraft) : null;
  const gN = parsedGt ? norm(parsedGt) : null;
  const pairsEqual =
    dN == null && gN == null
      ? true
      : dN != null && gN != null && dN[0] === gN[0] && dN[1] === gN[1];
  if (parsedDraft != null && !pairsEqual) {
    return { range: draftRaw, vs: draftVs, ve: draftVe };
  }
  if (parsedDraft != null && pairsEqual && trimmed !== "") {
    const n = norm(parsedDraft);
    return { range: draftRaw, vs: n[0], ve: n[1] };
  }
  const sp = parsePair(gtStr);
  return { range: gtStr, vs: sp ? sp[0] : undefined, ve: sp ? sp[1] : undefined };
}
