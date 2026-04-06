/** ポリラインに沿った縦方向の |Δy| の合算（袖チェーン等。着丈の紫は端点 2 点の Y 差のみで、ここは使わない）。 */
export function polylineVerticalAbsDySumPx(path: [number, number][]): number {
  if (path.length < 2) return 0;
  let s = 0;
  for (let i = 0; i < path.length - 1; i++) {
    s += Math.abs(path[i + 1]![1] - path[i]![1]!);
  }
  return s;
}

/** ポリラインの弧長（隣接頂点間のユークリッド距離の合算）。 */
export function polylineArcLengthPx(path: [number, number][]): number {
  if (path.length < 2) return 0;
  let s = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const ax = path[i]![0];
    const ay = path[i]![1];
    const bx = path[i + 1]![0];
    const by = path[i + 1]![1];
    s += Math.hypot(bx - ax, by - ay);
  }
  return s;
}

/** 弧長 s の位置にある点（path に沿って走査） */
export function pointOnPolylineAtArcLength(path: [number, number][], arcLen: number): [number, number] {
  if (path.length < 1) return [0, 0];
  if (path.length === 1) return path[0]!;
  let acc = 0;
  const target = Math.max(0, arcLen);
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + seg >= target - 1e-9) {
      const t = seg > 1e-9 ? (target - acc) / seg : 0;
      return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    }
    acc += seg;
  }
  return path[path.length - 1]!;
}

/** 折れ線全体の弧長に沿って等間隔に count 点を取る（滑らかな同調用） */
export function resamplePolylineToVertexCountAlongArc(path: [number, number][], count: number): [number, number][] {
  if (count < 2 || path.length < 1) return path;
  const total = polylineArcLengthPx(path);
  if (total < 1e-9) return Array.from({ length: count }, () => path[0]!);
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const target = (i / (count - 1)) * total;
    out.push(pointOnPolylineAtArcLength(path, target));
  }
  return out;
}

/**
 * 縦 |Δy| 合算が `targetVerticalPx` になるよう、最終点だけを
 * 「直前点 → 最終点」の方向に沿って移動する。
 */
export function extendPolylineVerticalSumAtEndAlongLastSegment(
  path: [number, number][],
  targetVerticalPx: number
): [number, number][] {
  if (path.length < 2) return path;
  const cur = polylineVerticalAbsDySumPx(path);
  if (cur >= targetVerticalPx - 0.02) return path;

  const prev = path[path.length - 2]!;
  const last = path[path.length - 1]!;
  const yPrev = prev[1]!;
  const yLast = last[1]!;
  const lastSegVert = Math.abs(yLast - yPrev);
  const C = cur - lastSegVert;
  const D = targetVerticalPx - C;
  if (D < 0) return path;

  const dx = last[0]! - prev[0]!;
  const dy = last[1]! - prev[1]!;
  const segLen = Math.hypot(dx, dy);
  if (segLen < 1e-9) return path;

  const ux = dx / segLen;
  const uy = dy / segLen;
  const z0 = yLast - yPrev;

  let t: number | null = null;
  if (Math.abs(uy) > 1e-10) {
    const t1 = (D - z0) / uy;
    const t2 = (-D - z0) / uy;
    const candidates = [t1, t2].filter((x) => x >= -1e-9 && Number.isFinite(x));
    candidates.sort((a, b) => a - b);
    for (const cand of candidates) {
      const tc = Math.max(0, cand);
      const nv = Math.abs(yLast + tc * uy - yPrev);
      if (Math.abs(nv - D) < 0.05) {
        t = tc;
        break;
      }
    }
  }

  if (t == null) {
    const yNew = yLast >= yPrev ? yPrev + D : yPrev - D;
    return [...path.slice(0, -1), [last[0]!, yNew]];
  }

  return [...path.slice(0, -1), [last[0]! + ux * t, last[1]! + uy * t]];
}

/**
 * 画面上の折れ線の弧長を targetLen px になるよう延長（最終セグ方向）または打ち切り。
 * 既に弧長が target に十分近いときは path をそのまま返す。
 */
export function polylineToArcLengthTarget(path: [number, number][], targetLen: number): [number, number][] {
  if (path.length < 1) return path;
  if (path.length === 1) return [path[0]!];
  const total = polylineArcLengthPx(path);
  if (total < 1e-6) return [path[0]!];
  if (targetLen <= 0) return [path[0]!];
  if (Math.abs(targetLen - total) <= 1e-3) return path;
  if (targetLen > total) {
    const last = path[path.length - 1]!;
    const prev = path[path.length - 2]!;
    const segLen = Math.hypot(last[0] - prev[0], last[1] - prev[1]) || 1e-6;
    const ux = (last[0] - prev[0]) / segLen;
    const uy = (last[1] - prev[1]) / segLen;
    const need = targetLen - total;
    if (need <= 1e-6) return path;
    return [...path.slice(0, -1), last, [last[0] + ux * need, last[1] + uy * need]];
  }
  let acc = 0;
  const out: [number, number][] = [path[0]!];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + seg >= targetLen - 1e-6) {
      const t = (targetLen - acc) / seg;
      const x = a[0] + t * (b[0] - a[0]);
      const y = a[1] + t * (b[1] - a[1]);
      out.push([x, y]);
      return out;
    }
    acc += seg;
    out.push(b);
  }
  return out;
}
