/**
 * 開いた polyline（path 上の連続 index）の**内点**だけをラプラシアンで平滑化する。両端 index は固定。
 * `frozen` の頂点は各反復で動かさない（採寸帯・袖口隣接点など）。
 *
 * 弦フレームで頂点ごとに写したあと、隣接辺のなす角が急になり折れ曲がるのを抑える用途。
 */
export function smoothOpenChainInteriorsLaplacian2D(
  chainLocal: readonly number[],
  getLocalXY: (li: number) => readonly [number, number],
  frozen: ReadonlySet<number>,
  options?: { iterations?: number; lambda?: number }
): Map<number, [number, number]> {
  const iterations = options?.iterations ?? 3;
  const lambda = options?.lambda ?? 0.35;
  const m = chainLocal.length;
  const out = new Map<number, [number, number]>();
  if (m < 3) return out;

  let buf: [number, number][] = [];
  for (let k = 0; k < m; k++) {
    const li = chainLocal[k]!;
    const p = getLocalXY(li);
    buf.push([p[0]!, p[1]!]);
  }

  for (let it = 0; it < iterations; it++) {
    const next: [number, number][] = buf.map((p) => [p[0]!, p[1]!]);
    for (let k = 1; k < m - 1; k++) {
      const li = chainLocal[k]!;
      if (frozen.has(li)) {
        next[k] = [buf[k]![0]!, buf[k]![1]!];
        continue;
      }
      const prev = buf[k - 1]!;
      const cur = buf[k]!;
      const nxt = buf[k + 1]!;
      next[k] = [
        (1 - lambda) * cur[0]! + lambda * 0.5 * (prev[0]! + nxt[0]!),
        (1 - lambda) * cur[1]! + lambda * 0.5 * (prev[1]! + nxt[1]!),
      ];
    }
    buf = next;
  }

  for (let k = 1; k < m - 1; k++) {
    const li = chainLocal[k]!;
    if (frozen.has(li)) continue;
    out.set(li, buf[k]!);
  }
  return out;
}

const EPS_LEN = 1e-12;

/**
 * 連続する辺の向きが急に変わる内点だけ、A–C 弦上の最近傍点へ引いて折れを落とす（ラプラシン後の追い処理向け）。
 * `cosStraightMin` 未満の頂点だけ更新（隣接辺単位ベクトルの内積 ≈1 に近いほど「直進」）。
 */
export function relaxOpenChainInteriorsTowardChordWhereBent2D(
  chainLocal: readonly number[],
  getLocalXY: (li: number) => readonly [number, number],
  frozen: ReadonlySet<number>,
  options?: { iterations?: number; blend?: number; cosStraightMin?: number }
): Map<number, [number, number]> {
  const iterations = options?.iterations ?? 3;
  const blend = options?.blend ?? 0.42;
  const cosStraightMin = options?.cosStraightMin ?? 0.992;
  const m = chainLocal.length;
  const out = new Map<number, [number, number]>();
  if (m < 3) return out;

  let buf: [number, number][] = [];
  for (let k = 0; k < m; k++) {
    const li = chainLocal[k]!;
    const p = getLocalXY(li);
    buf.push([p[0]!, p[1]!]);
  }

  for (let it = 0; it < iterations; it++) {
    const next: [number, number][] = buf.map((p) => [p[0]!, p[1]!]);
    for (let k = 1; k < m - 1; k++) {
      const li = chainLocal[k]!;
      if (frozen.has(li)) {
        next[k] = [buf[k]![0]!, buf[k]![1]!];
        continue;
      }
      const ax = buf[k - 1]![0]!;
      const ay = buf[k - 1]![1]!;
      const bx = buf[k]![0]!;
      const by = buf[k]![1]!;
      const cx = buf[k + 1]![0]!;
      const cy = buf[k + 1]![1]!;
      const e1x = bx - ax;
      const e1y = by - ay;
      const e2x = cx - bx;
      const e2y = cy - by;
      const l1 = Math.hypot(e1x, e1y);
      const l2 = Math.hypot(e2x, e2y);
      if (l1 < EPS_LEN || l2 < EPS_LEN) continue;
      const u1x = e1x / l1;
      const u1y = e1y / l1;
      const u2x = e2x / l2;
      const u2y = e2y / l2;
      const cosT = u1x * u2x + u1y * u2y;
      if (cosT >= cosStraightMin) continue;

      const acx = cx - ax;
      const acy = cy - ay;
      const acLen2 = acx * acx + acy * acy;
      if (acLen2 < EPS_LEN) continue;
      let t = ((bx - ax) * acx + (by - ay) * acy) / acLen2;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      const px = ax + t * acx;
      const py = ay + t * acy;
      next[k] = [bx + blend * (px - bx), by + blend * (py - by)];
    }
    buf = next;
  }

  for (let k = 1; k < m - 1; k++) {
    const li = chainLocal[k]!;
    if (frozen.has(li)) continue;
    out.set(li, buf[k]!);
  }
  return out;
}
