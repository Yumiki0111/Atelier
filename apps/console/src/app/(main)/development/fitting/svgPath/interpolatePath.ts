import { NUM_RE, round10 } from "./tokenize";

export function interpolatePath(pathA: string, pathB: string, t: number): string {
  if (t <= 0) return pathA;
  if (t >= 1) return pathB;
  NUM_RE.lastIndex = 0;
  const ma = pathA.match(NUM_RE);
  NUM_RE.lastIndex = 0;
  const mb = pathB.match(NUM_RE);
  if (!ma || !mb || ma.length !== mb.length) {
    // 構造が違うと数値を対応付けて補間すると NaN・大飛び線になるのでフォールバック
    return pathA;
  }
  const numsA = ma.map(Number);
  const numsB = mb.map(Number);
  let i = 0;
  NUM_RE.lastIndex = 0;
  return pathA.replace(NUM_RE, () => {
    const a = numsA[i]!;
    const b = numsB[i]!;
    const v = a + (b - a) * t;
    i++;
    return String(round10(v));
  });
}
