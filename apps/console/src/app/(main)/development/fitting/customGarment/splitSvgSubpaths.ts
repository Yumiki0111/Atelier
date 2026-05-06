import type { SvgParsedPath } from "./parseSvgPaths";
import { assertValidGridModelRigCompound } from "@/app/(main)/development/fitting/lib/rig/gridModelRigExtract";
import { getPathPoints } from "../svgPath/extractPoints";
import { flattenSvgPathToPolyline } from "../svgPath/pathFlatten";

/** フラットにおける「両エッジ＝オフセット平行線」の典型オフセット幅（ユーザー座標）。 */
const OFFSET_PAIR_MIN_GAP = 0.7;
const OFFSET_PAIR_MAX_GAP = 72;
/** 並行度:（中央値からの MAD / 中央値）の上限が高いほど緩く */
const OFFSET_PAIR_REL_MED_AD_MAX = 0.62;
const MIDLINE_RESAMPLES = 56;

function bboxDiagonalPts(pts: [number, number][]): number {
  if (pts.length === 0) return 0;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return Math.hypot(Math.max(1e-9, maxX - minX), Math.max(1e-9, maxY - minY));
}

function interpolateAlongPolyline(pts: [number, number][], uRaw: number): [number, number] {
  if (pts.length < 2) return pts[0] ?? [0, 0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(
      pts[i]![0] - pts[i - 1]![0],
      pts[i]![1] - pts[i - 1]![1]
    );
  }
  if (!(total > 1e-9)) return pts[0]!;
  const u = Math.max(0, Math.min(1, uRaw));
  const goal = u * total;
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (walked + seg >= goal - 1e-12 || i === pts.length - 1) {
      const local = seg <= 1e-9 ? 0 : Math.max(0, Math.min(1, (goal - walked) / seg));
      return [a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local];
    }
    walked += seg;
  }
  const last = pts[pts.length - 1]!;
  return [last[0], last[1]];
}

function isProbablyClosedPolygon(pts: [number, number][]): boolean {
  if (pts.length < 3) return false;
  const tol = bboxDiagonalPts(pts) * 2e-4 + 3e-3;
  return (
    Math.hypot(
      pts[0]![0] - pts[pts.length - 1]![0],
      pts[0]![1] - pts[pts.length - 1]![1]
    ) < tol
  );
}

/** 弦長に沿って均等サンプル（複合 path で閉じた輪郭は一端を繋いだ折れ線として歩く） */
function resampleChordUniform(ptsIn: [number, number][], nOut: number): [number, number][] {
  if (ptsIn.length < 2 || nOut < 2) return ptsIn.slice();

  const closed = isProbablyClosedPolygon(ptsIn);
  const core =
    ptsIn.length >= 3 && closed ? ptsIn.slice(0, -1) : ptsIn.slice();

  const work =
    closed && core.length >= 2 ? ([...core, core[0]!] as [number, number][]) : core;

  if (work.length < 2) return ptsIn.slice();

  const out: [number, number][] = [];
  for (let k = 0; k < nOut; k++) {
    const u = nOut === 1 ? 0 : k / (nOut - 1);
    out.push(interpolateAlongPolyline(work, u));
  }
  return out;
}

function median(vals: number[]): number {
  if (vals.length === 0) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor((s.length - 1) / 2);
  return s[m]!;
}

/** 同一 path 内で「太さの両エッジ」として並行させた二本のサブパスを検出できれば中心線1本へ */
function mergeOffsetStrokeOutlinePairLoose(dA: string, dB: string): string | null {
  const fA = flattenSvgPathToPolyline(dA, 26, 16);
  const fB = flattenSvgPathToPolyline(dB, 26, 16);
  const pA = getPathPoints(fA);
  const pB = getPathPoints(fB);
  if (pA.length < 8 || pB.length < 8) return null;
  const rsA = resampleChordUniform(pA, MIDLINE_RESAMPLES);
  const rsB = resampleChordUniform(pB, MIDLINE_RESAMPLES);
  const rsBRev = [...rsB].reverse();

  type PairFit = {
    ptsB: typeof rsB;
    med: number;
  };

  function scorePair(pa: typeof rsA, pb: typeof rsB): PairFit | null {
    const n = Math.min(pa.length, pb.length);
    if (n < 6) return null;
    const dists: number[] = [];
    for (let i = 0; i < n; i++) {
      dists.push(Math.hypot(pa[i]![0] - pb[i]![0], pa[i]![1] - pb[i]![1]));
    }
    const medDist = median(dists);
    if (medDist < OFFSET_PAIR_MIN_GAP || medDist > OFFSET_PAIR_MAX_GAP) return null;
    const madFromMed = median(dists.map((d) => Math.abs(d - medDist)));
    const relMad = madFromMed / Math.max(medDist, 1e-9);
    if (relMad > OFFSET_PAIR_REL_MED_AD_MAX) return null;
    return { ptsB: pb, med: medDist };
  }

  const sFwd = scorePair(rsA, rsB);
  const sRev = scorePair(rsA, rsBRev);
  let best: PairFit | null = sFwd;
  if (best == null || (sRev != null && sRev.med < best.med)) best = sRev;
  if (best == null) return null;

  const chosenB = best.ptsB;
  const midline: [number, number][] = rsA.map((pt, i) => {
    const qb = chosenB[i]!;
    return [(pt[0] + qb[0]) * 0.5, (pt[1] + qb[1]) * 0.5];
  });
  const rnd = (v: number) => Math.round(v * 1000) / 1000;
  const first = midline[0];
  let dStr = "";
  if (first) dStr += `M${rnd(first[0])} ${rnd(first[1])}`;
  for (let i = 1; i < midline.length; i++) {
    const q = midline[i]!;
    dStr += `L${rnd(q[0])} ${rnd(q[1])}`;
  }
  return dStr.length === 0 ? null : dStr;
}

/**
 * 1 つの path `d` に複数の moveto（M/m）があるとき、サブパスごとに分割する。
 * アップロード SVG を「見た目は同じ・path 数は多い」形に揃え、グレーディングの頂点対応を安定させる。
 *
 * 格子 Vector(9) の compound リグ（4 subpath）は分割しない。そのまま `splitGarmentPathsFromSvgParsed`
 * で compound→9本に解く必要があるため。
 */
export function splitPathDataIntoSubpaths(d: string): string[] {
  const t = d.trim();
  if (!t) return [];
  return t
    .split(/(?=[Mm])/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * 各 `<path>` の `d` をサブパス単位にばらし、`SvgParsedPath` を増やす（属性は複製）。
 * 太線の両エッジを平行二線で持つ 2 サブパスは、両方に stroke すると二重線に見えるため、並行オフセットと判定できれば **中心線 1 本**に畳む（Vector(9) compound は触らない）。
 */
export function expandSvgParsedPathsBySubpaths(paths: SvgParsedPath[]): SvgParsedPath[] {
  const out: SvgParsedPath[] = [];
  for (const p of paths) {
    const parts = splitPathDataIntoSubpaths(p.d);
    if (parts.length <= 1) {
      out.push(p);
      continue;
    }
    try {
      assertValidGridModelRigCompound(p.d.trim());
      out.push(p);
      continue;
    } catch {
      /* 通常モデルなど: Moveto が複数ある path はばらす（ただし 2 本だけのときは両エッジ線なら中心線へ） */
    }
    if (parts.length === 2) {
      const merged = mergeOffsetStrokeOutlinePairLoose(parts[0]!, parts[1]!);
      if (merged != null) {
        out.push({ ...p, d: merged });
        continue;
      }
    }
    for (const part of parts) {
      out.push({ ...p, d: part });
    }
  }
  return out;
}
