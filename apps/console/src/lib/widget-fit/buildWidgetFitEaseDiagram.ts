import type { MeasureOverlayData } from "@/app/(main)/development/fitting/lib/types";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";
import { pointOnPolylineAtArcLength, polylineArcLengthPx } from "@/lib/fitting-compute/fittingCanvasPolylineMeasure";
import { resolveSleeveGeomDisplayCm } from "@/lib/fitting-compute/resolveSleeveGeomDisplayCm";
import type { WidgetFitEaseSummaryJson } from "@/lib/widget-fit/computeWidgetFitEaseSummary";

/** 袖・裾の白カプセル中心をまとめて少し左へ（px） */
const SIZE_LABEL_NUDGE_X = -44;

const TAPE_STROKE = "#020617";
const TAPE_TEXT = "#020617";

const TAPE_LINE_W_HEM_LEADER = 4;

const FONT_HEM_PILL = 46;
const PILL_PAD_X = 50;
const PILL_PAD_Y = 28;
const PILL_STROKE_W = 3.5;
const HEM_LEADER_DOWN = 148;
const HEM_DOT_R = 12;
/** 裾カプセルを胴・モデルから離し右余白へ（layoutPill がはみ出し時はクランプ） */
const HEM_CALLOUT_BIAS_X = 320;
/** 袖カプセルを左寄せ（px）：左袖はマイナス側を大きく、右袖はプラスを抑える */
const SLEEVE_CALLOUT_BIAS_X_LEFT = 215;
const SLEEVE_CALLOUT_BIAS_X_RIGHT = 318;
/** Extra X offset for sleeve pill only, added after `SIZE_LABEL_NUDGE_X` (px). */
const SLEEVE_ONLY_NUDGE_X = 62;
/** 袖口より上にカプセル中心を置く量（px、SVG y 下向きなので算） */
const SLEEVE_CALLOUT_UP = 120;

function fmtSignedCmShort(n: number | null | undefined): string | null {
  if (n == null || typeof n !== "number" || !Number.isFinite(n)) return null;
  const r = Math.round(n * 10) / 10;
  const abs = Math.abs(r);
  const s = abs % 1 === 0 ? String(abs) : abs.toFixed(1);
  return (r > 0 ? "+" : r < 0 ? "-" : "") + s + "cm";
}

export type WidgetFitEaseDiagramOp =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number; dash?: string }
  | { kind: "filledPoly"; points: string; fill: string }
  | {
      kind: "openPolyline";
      points: string;
      stroke: string;
      strokeWidth: number;
      dash?: string;
    }
  | { kind: "rect"; x: number; y: number; w: number; h: number; rx: number; fill: string; stroke: string; strokeWidth: number }
  | {
      kind: "text";
      x: number;
      y: number;
      fontSize: number;
      fill: string;
      textAnchor: "middle" | "start" | "end";
      content: string;
    }
  | { kind: "circle"; cx: number; cy: number; r: number; fill: string; stroke?: string; strokeWidth?: number; dash?: string };

export type WidgetFitEaseDiagramJson = {
  /** 図解座標の X 基準。未指定時は 0（従来 0..1505 と同一） */
  viewBoxMinX?: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  ops: WidgetFitEaseDiagramOp[];
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function finitePair(p: [number, number] | undefined): p is [number, number] {
  return p != null && Number.isFinite(p[0]) && Number.isFinite(p[1]);
}

type GarmentG = NonNullable<MeasureOverlayData["garment"]>;

type PillBox = { bx: number; by: number; w: number; h: number };

/** 試着 viewBox の X 範囲（`snap.viewBoxMinX` / `snap.viewBoxWidth`） */
type VbXSpan = { minX: number; width: number };

/** Left sleeve pill may need bx < 0 (parent SVG overflow-visible). */
const SLEEVE_PILL_MIN_BX = -480;

function layoutPill(
  cx: number,
  cy: number,
  text: string,
  fontSize: number,
  vbH: number,
  vbX: VbXSpan,
  opts?: { minBx?: number }
): PillBox {
  const tw = Math.ceil(text.length * fontSize * 0.62 + PILL_PAD_X * 2);
  const w = clamp(tw, 268, vbX.width - 24);
  const h = Math.ceil(fontSize + PILL_PAD_Y * 2);
  const minBx = opts?.minBx ?? 0;
  const maxBx = vbX.minX + vbX.width - w - 8;
  const bx = clamp(cx - w / 2, minBx, maxBx);
  const by = clamp(cy - h / 2, 8, vbH - h - 8);
  return { bx, by, w, h };
}

function appendPill(ops: WidgetFitEaseDiagramOp[], pill: PillBox, text: string, fontSize: number): void {
  const rx = Math.min(46, pill.h / 2 - 1);
  ops.push(
    {
      kind: "rect",
      x: pill.bx,
      y: pill.by,
      w: pill.w,
      h: pill.h,
      rx,
      fill: "#ffffff",
      stroke: TAPE_STROKE,
      strokeWidth: PILL_STROKE_W,
    },
    {
      kind: "text",
      x: pill.bx + pill.w / 2,
      y: pill.by + pill.h / 2,
      fontSize,
      fill: TAPE_TEXT,
      textAnchor: "middle",
      content: text,
    }
  );
}

/** 裾点 (ax,ay) に最も近いカプセル辺上の点（点線の終端） */
function pillEdgeToward(pill: PillBox, ax: number, ay: number): [number, number] {
  const { bx, by, w, h } = pill;
  const cx = bx + w / 2;
  const cy = by + h / 2;
  const candidates: [number, number][] = [
    [cx, by],
    [cx, by + h],
    [bx, cy],
    [bx + w, cy],
  ];
  let best = candidates[0];
  let bestD = Infinity;
  for (const p of candidates) {
    const d = Math.hypot(p[0] - ax, p[1] - ay);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Bottom-center of the pill rect (sleeve dot is usually below the capsule). */
function pillBottomCenter(pill: PillBox): [number, number] {
  return [pill.bx + pill.w / 2, pill.by + pill.h];
}

function dashedLeader3(ax: number, ay: number, bx: number, by: number): WidgetFitEaseDiagramOp {
  const mx = ax + (bx - ax) * 0.38;
  const my = ay + (by - ay) * 0.38;
  return {
    kind: "openPolyline",
    points: `${ax},${ay} ${mx},${my} ${bx},${by}`,
    stroke: TAPE_STROKE,
    strokeWidth: TAPE_LINE_W_HEM_LEADER,
    dash: "6 5",
  };
}

function appendHemCallout(
  ops: WidgetFitEaseDiagramOp[],
  g: GarmentG,
  summary: WidgetFitEaseSummaryJson,
  vbH: number,
  vbX: VbXSpan
): void {
  const hemCm = fmtSignedCmShort(summary.hemFromCrotchCm);
  if (!hemCm || !finitePair(g.hemCenter)) return;
  const hemY =
    g.lengthGuideHem != null && finitePair(g.lengthGuideHem) ? g.lengthGuideHem[1] : g.hemCenter[1];
  const hx =
    finitePair(g.shoulderLeft) && finitePair(g.shoulderRight)
      ? (g.shoulderLeft[0] + g.shoulderRight[0]) / 2
      : g.hemCenter[0];
  const hy = hemY;
  const pretty = hemCm.replace(/cm$/i, " cm");
  const lineText = `またから約 ${pretty}`;
  const pillCy = hy + HEM_LEADER_DOWN;
  const pill = layoutPill(
    hx + HEM_CALLOUT_BIAS_X + SIZE_LABEL_NUDGE_X,
    pillCy,
    lineText,
    FONT_HEM_PILL,
    vbH,
    vbX
  );
  const attach = pillEdgeToward(pill, hx, hy);

  ops.push(dashedLeader3(hx, hy, attach[0], attach[1]));
  ops.push({ kind: "circle", cx: hx, cy: hy, r: HEM_DOT_R, fill: TAPE_STROKE });
  appendPill(ops, pill, lineText, FONT_HEM_PILL);
}

/**
 * 袖採寸：裾の「またから」と同型。採寸チェーンの弧長中央に黒点・点線リーダー・白カプセル。
 */
function appendSleevePointerCallout(
  ops: WidgetFitEaseDiagramOp[],
  g: GarmentG,
  _summary: WidgetFitEaseSummaryJson,
  vbH: number,
  leftSleeveMinBx: number,
  vbX: VbXSpan
): void {
  const slIn = g.size.sleeve;
  if (!Number.isFinite(slIn) || slIn <= 0) return;
  if (!finitePair(g.sleeveStart) || !finitePair(g.sleeveEnd)) return;

  const [sx, sy] = g.sleeveStart;
  const [ex, ey] = g.sleeveEnd;
  const pathPts = (g.sleevePathPoints ?? []).filter(
    (p): p is [number, number] =>
      p != null && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
  );
  const hasPath = pathPts.length >= 2;

  const chain: [number, number][] = hasPath ? pathPts : [
    [sx, sy],
    [ex, ey],
  ];

  const arcLen = polylineArcLengthPx(chain);
  const [px, py]: [number, number] =
    arcLen > 1e-6 ? pointOnPolylineAtArcLength(chain, arcLen * 0.5) : [(sx + ex) / 2, (sy + ey) / 2];

  const midX = vbX.minX + vbX.width * 0.5;
  const toLeft = px < midX;
  const sleeveBiasX = toLeft ? -SLEEVE_CALLOUT_BIAS_X_LEFT : SLEEVE_CALLOUT_BIAS_X_RIGHT;
  const pillCx = px + sleeveBiasX + SIZE_LABEL_NUDGE_X + SLEEVE_ONLY_NUDGE_X;
  const pillCy = py - SLEEVE_CALLOUT_UP;

  const resolvedCm = resolveSleeveGeomDisplayCm(g);
  const visualArcPx = polylineArcLengthPx(chain);
  const sg = g.sleeveGeomDebug;
  const useVisualArcScale =
    hasPath &&
    g.sleeveGeomMeasureKind === "arc" &&
    sg != null &&
    sg.px > 0 &&
    Number.isFinite(sg.cm) &&
    sg.cm > 0 &&
    chain.length >= 2;
  const pillCm = useVisualArcScale ? (visualArcPx * sg.cm) / sg.px : resolvedCm;
  const sleeveLineText =
    pillCm != null && Number.isFinite(pillCm) ? `袖丈 ${pillCm.toFixed(1)} cm` : "袖丈 —";

  /** 左袖：`minBx < 0` は埋め込み SVG（既定 overflow）で欠けやすい。ウィジェットは `0` を渡す。 */
  const pill = layoutPill(pillCx, pillCy, sleeveLineText, FONT_HEM_PILL, vbH, vbX, {
    minBx: toLeft ? leftSleeveMinBx : vbX.minX,
  });
  const attach = pillBottomCenter(pill);

  ops.push(dashedLeader3(px, py, attach[0], attach[1]));
  ops.push({ kind: "circle", cx: px, cy: py, r: HEM_DOT_R, fill: TAPE_STROKE });
  appendPill(ops, pill, sleeveLineText, FONT_HEM_PILL);
}

export type BuildWidgetFitEaseDiagramOpts = {
  /**
   * true のとき左袖カプセルを viewBox 左辺（`viewBoxMinX`）にクランプする。
   * ウィジェット等の狭い埋め込みで「カプセル半分欠け」を防ぐ。
   */
  clampPillsToViewBox?: boolean;
};

/**
 * 採寸図：袖・裾とも黒点・点線・白カプセル。着丈の別スケール線は出さない。
 */
export function buildWidgetFitEaseDiagramFromSnapshot(
  snap: FittingCanvasSnapshot,
  summary: WidgetFitEaseSummaryJson,
  opts?: BuildWidgetFitEaseDiagramOpts
): WidgetFitEaseDiagramJson | null {
  const g = snap.measureOverlay.garment;
  if (!g?.size) return null;

  const vbH = snap.viewBoxHeight;
  const vbX: VbXSpan = { minX: snap.viewBoxMinX, width: snap.viewBoxWidth };

  const ops: WidgetFitEaseDiagramOp[] = [];

  const leftSleeveMinBx = opts?.clampPillsToViewBox === true ? vbX.minX : SLEEVE_PILL_MIN_BX;
  appendSleevePointerCallout(ops, g, summary, vbH, leftSleeveMinBx, vbX);
  appendHemCallout(ops, g, summary, vbH, vbX);

  if (ops.length === 0) return null;

  return { viewBoxMinX: vbX.minX, viewBoxWidth: vbX.width, viewBoxHeight: vbH, ops };
}
