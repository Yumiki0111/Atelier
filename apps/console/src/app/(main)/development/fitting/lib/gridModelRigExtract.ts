import { getPathPoints } from "./pathUtils";
import { BODY_CX, BODY_H, BZ } from "./constants";

/**
 * 格子モデル専用: リグ線画は **public の `grid-rig-vector9.svg`（Vector (9).svg と同一）** から取る 1 本の stroke-only compound。
 * `d` の文字列コピーは `npm run sync:grid-rig-d` でアセットとこのファイルの定数を揃える。
 * 構造は **中心垂直線（脊髄）** ＋ **それを挟む左右対称**の腕・肩ポリライン（4 subpath）。
 */

/** `grid-rig-vector9.svg` / `Vector (9).svg` と同一 viewBox */
export const GRID_MODEL_RIG_VIEWBOX_W = 389;
export const GRID_MODEL_RIG_VIEWBOX_H = 518;
/** リグ SVG 上端 y（`Vector (9)` は 0） */
export const GRID_MODEL_RIG_TOP_Y = 0;

/**
 * リグ線画 viewBox → ボディテンプレ。viewBox 縦横比を保った等方スケールで、胴〜足の直方体
 * `(0—2·BODY_C)×(BZ.head_top—BODY_H)` に対し **cover**（`max(kX,kY)`）で一方を塗り切り、
 * 他方は中心基準で左右または上下にはみ出す（contain の min だと幅優先で縦に余白ができ「縦潰れ」に見える）。
 */
export function gridRigSvgPointToBodyTemplatePreserveAspect(
  rigViewBoxW: number,
  rigViewBoxH: number,
  sx: number,
  sy: number
): [number, number] {
  const torsoW = BODY_CX * 2;
  const torsoH = BODY_H - BZ.head_top;
  const viewH = rigViewBoxH - GRID_MODEL_RIG_TOP_Y;
  const kX = torsoW / rigViewBoxW;
  const kY = torsoH / viewH;
  const scale = Math.max(kX, kY);
  const scaledW = rigViewBoxW * scale;
  const scaledH = viewH * scale;
  const padX = (torsoW - scaledW) / 2;
  const padY = (torsoH - scaledH) / 2;
  return [
    padX + sx * scale,
    BZ.head_top + padY + (sy - GRID_MODEL_RIG_TOP_Y) * scale,
  ];
}

/**
 * {@link gridRigSvgPointToBodyTemplatePreserveAspect} の逆写像。
 * （同じ torso / view の前提で、`scale = max(kX,kY)` の cover のみ対称。）
 */
export function gridRigSvgPointFromBodyTemplatePreserveAspect(
  rigViewBoxW: number,
  rigViewBoxH: number,
  bx: number,
  by: number
): [number, number] {
  const torsoW = BODY_CX * 2;
  const torsoH = BODY_H - BZ.head_top;
  const viewH = rigViewBoxH - GRID_MODEL_RIG_TOP_Y;
  const kX = torsoW / rigViewBoxW;
  const kY = torsoH / viewH;
  const scale = Math.max(kX, kY);
  const scaledW = rigViewBoxW * scale;
  const scaledH = viewH * scale;
  const padX = (torsoW - scaledW) / 2;
  const padY = (torsoH - scaledH) / 2;
  const sx = (bx - padX) / scale;
  const sy = GRID_MODEL_RIG_TOP_Y + (by - BZ.head_top - padY) / scale;
  return [sx, sy];
}

/** @deprecated 名前互換の薄いラッパ。論理横幅だけ変えるときは `{W}×GRID_MODEL_RIG_VIEWBOX_H` で等方。 */
export function gridRigVectorPointToBodyTemplateWidth(
  rigViewBoxW: number,
  sx: number,
  sy: number
): [number, number] {
  return gridRigSvgPointToBodyTemplatePreserveAspect(rigViewBoxW, GRID_MODEL_RIG_VIEWBOX_H, sx, sy);
}

export function gridRigVectorPointToBodyTemplate(sx: number, sy: number): [number, number] {
  return gridRigSvgPointToBodyTemplatePreserveAspect(
    GRID_MODEL_RIG_VIEWBOX_W,
    GRID_MODEL_RIG_VIEWBOX_H,
    sx,
    sy
  );
}

export function gridRigVectorPointFromBodyTemplate(bx: number, by: number): [number, number] {
  return gridRigSvgPointFromBodyTemplatePreserveAspect(
    GRID_MODEL_RIG_VIEWBOX_W,
    GRID_MODEL_RIG_VIEWBOX_H,
    bx,
    by
  );
}

/**
 * ランタイム用の `d`（`sync:grid-rig-d` で `grid-rig-vector9.svg` と同期）。
 */
export const GRID_MODEL_RIG_STROKE_COMPOUND_D =
  "M194.376 0V294M159.794 517L165.829 287.16L194.408 274.72M388.375 272L250.367 117.12L194.368 94.04L138.369 117.12L0.375 272M228.943 517L222.907 287.16L194.328 274.72";

/** 脚補助の左右オフセット（脊髄 x からの距離・ピクセル）。アートに脚ベクタが無い場合のプレースホルダ。 */
const DEFAULT_LEG_OFFSET_FROM_SPINE = 62;

export function splitSvgPathDByMoveCommands(d: string): string[] {
  return d
    .split(/(?=[Mm])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** fill なし（または none）かつ stroke ありの `<path d>` のみ（格子ピクセル fill path は除外） */
export function extractStrokeOnlyPathDsFromSvgMarkup(svg: string): string[] {
  const out: string[] = [];
  const re = /<path\b([^>]*)\/>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const attrs = m[1]!;
    if (!/\bstroke\s*=/.test(attrs)) continue;
    if (/\bfill\s*=/.test(attrs) && !/\bfill\s*=\s*["']none["']/i.test(attrs)) continue;
    const dm = /\bd\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (dm) out.push(dm[1]!);
  }
  return out;
}

/** 格子リグ SVG から compound `d` を 1 本だけ取り出す。見つからなければ null */
export function extractGridModelRigCompoundD(svg: string): string | null {
  const ds = extractStrokeOnlyPathDsFromSvgMarkup(svg);
  if (ds.length === 0) return null;
  if (ds.length > 1) return null;
  return ds[0]!;
}

/** subpath1 が「中心垂直の脊髄」らしいか（M x y の直後に V または水平幅ゼロの縦線） */
function subpathLooksLikeVerticalSpine(subD: string): boolean {
  const pts = getPathPoints(subD);
  if (pts.length < 2) return false;
  const [x0] = pts[0]!;
  return pts.every(([x]) => Math.abs(x - x0) < 0.02);
}

/**
 * 4 subpath（脊髄・左腕・肩・右腕）であることと、先頭が垂直脊髄であることを確認。
 */
export function assertValidGridModelRigCompound(d: string): void {
  const sub = splitSvgPathDByMoveCommands(d);
  if (sub.length !== 4) {
    throw new Error(
      `[gridModelRig] stroke compound は 4 subpath（脊髄・左腕・肩ライン・右腕）想定: 実際は ${sub.length}`
    );
  }
  if (!subpathLooksLikeVerticalSpine(sub[0]!)) {
    throw new Error("[gridModelRig] 1 本目が垂直脊髄として解釈できません");
  }
}

function dFromPts(pairs: [number, number][], decimals: number): string {
  const r = (n: number) => (+n.toFixed(decimals)).toString();
  const [x0, y0] = pairs[0]!;
  let s = `M${r(x0)} ${r(y0)}`;
  for (let i = 1; i < pairs.length; i++) {
    const [x, y] = pairs[i]!;
    s += `L${r(x)} ${r(y)}`;
  }
  return s;
}

/** 首元付近に近い端をリグ契約どおり「肩／M 先頭」にする */
function shoulderFirstPolyline(pts: [number, number][], spineCenterX: number, neckY: number): [number, number][] {
  if (pts.length < 2) return pts;
  const a = pts[0]!;
  const b = pts[pts.length - 1]!;
  const distNeck = (p: [number, number]) => Math.hypot(p[0] - spineCenterX, p[1] - neckY);
  return distNeck(a) <= distNeck(b) ? pts : [...pts].reverse();
}

/**
 * compound `d` を fitting 9 本 index 契約に分解し、**リグ viewBox 座標の path d** を返す。
 */
export function gridModelRigCompoundToNineSvgPathDs(compoundD: string, legOffsetFromSpine = DEFAULT_LEG_OFFSET_FROM_SPINE): string[] {
  assertValidGridModelRigCompound(compoundD);
  const sub = splitSvgPathDByMoveCommands(compoundD);
  const [spineD, leftArmD, shoulderD, rightArmD] = sub as [string, string, string, string];

  const spinePts = getPathPoints(spineD) as [number, number][];
  const spineX = spinePts.map(([x]) => x).reduce((a, b) => a + b, 0) / spinePts.length;
  const neckY = 94.04; // shoulder chain 内頂・Vector (9) では ~94.04

  const leftPts = shoulderFirstPolyline(getPathPoints(leftArmD) as [number, number][], spineX, neckY);
  const rightPts = shoulderFirstPolyline(getPathPoints(rightArmD) as [number, number][], spineX, neckY);

  const shPts = getPathPoints(shoulderD) as [number, number][];
  if (shPts.length < 5) throw new Error("[gridModelRig] 肩ポリラインの頂点数が不足");

  const [p0, p1, p2, p3, p4] = [shPts[0]!, shPts[1]!, shPts[2]!, shPts[3]!, shPts[4]!];
  const path7 = dFromPts([p0, p1], 4);
  const path6 = dFromPts([p1, p2], 4);
  const path5 = dFromPts([p3, p2], 4);
  const path8 = dFromPts([p3, p4], 4);

  const yLegStart = Math.max(...spinePts.map(([, y]) => y));
  const legLo = spineX - legOffsetFromSpine;
  const legHi = spineX + legOffsetFromSpine;
  const path3 = dFromPts(
    [
      [legLo, yLegStart],
      [legLo, GRID_MODEL_RIG_VIEWBOX_H],
    ],
    4
  );
  const path4 = dFromPts(
    [
      [legHi, yLegStart],
      [legHi, GRID_MODEL_RIG_VIEWBOX_H],
    ],
    4
  );

  return [
    dFromPts(spinePts, 4),
    dFromPts(leftPts, 4),
    dFromPts(rightPts, 4),
    path3,
    path4,
    path5,
    path6,
    path7,
    path8,
  ];
}

/** 9 本をボディテンプレへ。論理サイズは Vector(9) / Group116 と同様 `W×H`（既定 389×518）で等方写像 */
export function gridModelRigCompoundToNineBodyTemplatePaths(
  compoundD: string,
  legOffsetFromSpine = DEFAULT_LEG_OFFSET_FROM_SPINE,
  rigViewBoxWidth: number = GRID_MODEL_RIG_VIEWBOX_W,
  rigViewBoxHeight: number = GRID_MODEL_RIG_VIEWBOX_H
): string[] {
  const svgDs = gridModelRigCompoundToNineSvgPathDs(compoundD, legOffsetFromSpine);
  return svgDs.map((d) => {
    const pts = getPathPoints(d) as [number, number][];
    const bodyPts = pts.map(([x, y]) =>
      gridRigSvgPointToBodyTemplatePreserveAspect(rigViewBoxWidth, rigViewBoxHeight, x, y)
    );
    return dFromPts(bodyPts, 2);
  });
}
