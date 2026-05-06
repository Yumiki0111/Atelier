import { getPathPoints } from "../pathUtils";

/** 休止リグ上の辺と、同じトポロジーでワープ後の辺 */
export type RigSkinSegment = {
  rax: number;
  ray: number;
  rbx: number;
  rby: number;
  wax: number;
  way: number;
  wbx: number;
  wby: number;
};

function pointSegmentDistSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-18) return apx * apx + apy * apy;
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * abx;
  const qy = ay + t * aby;
  const dx = px - qx;
  const dy = py - qy;
  return dx * dx + dy * dy;
}

/**
 * 休止辺のローカル（沿線 s・法線 n）を保ち、ワープ後の辺に写す。
 * s は単位ベクトル u0 への射影長、n は v0 への射影長。
 */
function deformPointWithSegment(px: number, py: number, seg: RigSkinSegment): [number, number] {
  const { rax, ray, rbx, rby, wax, way, wbx, wby } = seg;
  const e0x = rbx - rax;
  const e0y = rby - ray;
  const len0 = Math.hypot(e0x, e0y);
  if (len0 < 1e-9) return [px, py];
  const u0x = e0x / len0;
  const u0y = e0y / len0;
  const v0x = -u0y;
  const v0y = u0x;

  const e1x = wbx - wax;
  const e1y = wby - way;
  const len1 = Math.hypot(e1x, e1y);
  if (len1 < 1e-9) return [px, py];
  const u1x = e1x / len1;
  const u1y = e1y / len1;
  const v1x = -u1y;
  const v1y = u1x;

  const s = (px - rax) * u0x + (py - ray) * u0y;
  const n = (px - rax) * v0x + (py - ray) * v0y;
  const scaleAlong = len1 / len0;
  return [wax + u1x * s * scaleAlong + v1x * n, way + u1y * s * scaleAlong + v1y * n];
}

/**
 * `restPathDs` と `warpedPathDs` が同じ path 数・各 path の頂点数が一致するとき、連続頂点ペアを骨とみなす。
 */
export function buildRigSkinSegments(restPathDs: string[], warpedPathDs: string[]): RigSkinSegment[] | null {
  if (restPathDs.length !== warpedPathDs.length) return null;
  const out: RigSkinSegment[] = [];
  for (let pi = 0; pi < restPathDs.length; pi++) {
    const pr = getPathPoints(restPathDs[pi]!);
    const pw = getPathPoints(warpedPathDs[pi]!);
    if (pr.length !== pw.length || pr.length < 2) return null;
    for (let i = 0; i < pr.length - 1; i++) {
      const a = pr[i]!;
      const b = pr[i + 1]!;
      const aw = pw[i]!;
      const bw = pw[i + 1]!;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1e-6) continue;
      out.push({
        rax: a[0],
        ray: a[1],
        rbx: b[0],
        rby: b[1],
        wax: aw[0],
        way: aw[1],
        wbx: bw[0],
        wby: bw[1],
      });
    }
  }
  return out.length > 0 ? out : null;
}

/** リグから遠すぎる頂点は体型 warp に戻す（頭端・極端に外れた輪郭用） */
const FAR_FALLBACK_DIST_SQ = 850 * 850;
/** 逆二乗ウェイトのオフセット（px） */
const WEIGHT_EPS = 14;
const WEIGHT_POW = 2.2;

/**
 * 体輪郭のデザイン座標を、休止リグ→ワープ後リグの骨変形の重み付き平均で追従させる。
 * リグから十分離れた点は `fallback`（通常は `warp`）を使う。
 */
export function deformBodyPointToRig(
  px: number,
  py: number,
  segments: RigSkinSegment[],
  fallback: (x: number, y: number) => [number, number]
): [number, number] {
  if (segments.length === 0) return fallback(px, py);

  let dMinSq = Infinity;
  for (const seg of segments) {
    const d2 = pointSegmentDistSq(px, py, seg.rax, seg.ray, seg.rbx, seg.rby);
    if (d2 < dMinSq) dMinSq = d2;
  }
  if (dMinSq > FAR_FALLBACK_DIST_SQ) return fallback(px, py);

  let swx = 0;
  let swy = 0;
  let sw = 0;
  for (const seg of segments) {
    const d = Math.sqrt(pointSegmentDistSq(px, py, seg.rax, seg.ray, seg.rbx, seg.rby));
    const w = 1 / Math.pow(d + WEIGHT_EPS, WEIGHT_POW);
    const [qx, qy] = deformPointWithSegment(px, py, seg);
    swx += qx * w;
    swy += qy * w;
    sw += w;
  }
  if (sw < 1e-14) return fallback(px, py);
  return [swx / sw, swy / sw];
}
