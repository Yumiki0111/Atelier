import { el } from "./widget-modal-dom-utils";

/** `/api/public/widget-fit-svg` の `fitEaseSummary` と同形 */
export type WidgetFitEaseSummaryJson = {
  shoulderEaseCm: number | null;
  chestEaseCm: number | null;
  sleeveFromWristCm: number | null;
  hemFromCrotchCm: number | null;
  fitChestBandJa?: string;
  fitToneJa: string;
  linesJa: string[];
};

function fitEaseToneColors(fitToneJa: string): { bg: string; fg: string } {
  if (fitToneJa.includes("きつめ")) return { bg: "rgba(255,241,242,0.96)", fg: "#9f1239" };
  if (fitToneJa.includes("ゆったり")) return { bg: "rgba(240,249,255,0.96)", fg: "#0c4a6e" };
  if (fitToneJa.includes("バランス良")) return { bg: "rgba(236,253,245,0.96)", fg: "#065f46" };
  if (fitToneJa.includes("短め")) return { bg: "rgba(255,251,235,0.96)", fg: "#92400e" };
  if (fitToneJa.includes("長め")) return { bg: "rgba(238,242,255,0.96)", fg: "#312e81" };
  return { bg: "rgba(241,245,249,0.96)", fg: "#1e293b" };
}

function fitChestBandColors(band: string): { bg: string; fg: string } {
  if (band === "小さめなサイズ") return { bg: "rgba(255,241,242,0.96)", fg: "#9f1239" };
  if (band === "おすすめのサイズ") return { bg: "rgba(236,253,245,0.96)", fg: "#065f46" };
  if (band === "ゆったりなサイズ") return { bg: "rgba(240,249,255,0.96)", fg: "#0c4a6e" };
  return { bg: "rgba(241,245,249,0.96)", fg: "#1e293b" };
}

export function appendWidgetFitEaseSummary(parent: HTMLElement, summary: WidgetFitEaseSummaryJson | undefined): void {
  if (!summary) return;
  const band = (summary.fitChestBandJa || "").trim();
  const tone = (summary.fitToneJa || "").trim();
  const lines = (summary.linesJa || []).map((l) => String(l).trim()).filter((l) => l.length > 0);
  if (!band && !tone && lines.length === 0) return;

  const wrap = el(
    "div",
    "width:100%;max-width:280px;padding:0 4px 2px;text-align:center;box-sizing:border-box;",
  );
  wrap.setAttribute("data-fitlook-fit-ease-summary", "true");

  if (band) {
    const { bg, fg } = fitChestBandColors(band);
    const bandBadge = el(
      "div",
      `display:inline-block;margin:0 auto 8px;padding:9px 14px;border-radius:8px;font-size:12px;font-weight:800;line-height:1.35;letter-spacing:0.02em;background:${bg};color:${fg};`,
    );
    bandBadge.textContent = band;
    wrap.appendChild(bandBadge);
  }

  if (tone) {
    const { bg, fg } = fitEaseToneColors(tone);
    const badge = el(
      "div",
      `display:inline-block;margin:0 auto 6px;padding:8px 12px;border-radius:8px;font-size:11px;font-weight:700;line-height:1.35;letter-spacing:0.02em;background:${bg};color:${fg};`,
    );
    badge.textContent = tone;
    wrap.appendChild(badge);
  }

  if (lines.length > 0) {
    const list = el("div", "text-align:left;font-size:10px;line-height:1.45;color:#334155;");
    for (const line of lines) {
      const row = el("div", "padding:1px 0 1px 10px;text-indent:-10px;");
      row.textContent = `・${line}`;
      list.appendChild(row);
    }
    wrap.appendChild(list);
  }

  parent.appendChild(wrap);
}

type WidgetFitEaseDiagramOp =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number; dash?: string }
  | { kind: "filledPoly"; points: string; fill: string }
  | { kind: "openPolyline"; points: string; stroke: string; strokeWidth: number; dash?: string }
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
  viewBoxMinX?: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  ops: WidgetFitEaseDiagramOp[];
};

const SVG_NS = "http://www.w3.org/2000/svg";

export function appendFitEaseDiagramToSvg(svg: SVGSVGElement, diagram: WidgetFitEaseDiagramJson): void {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("data-fitlook-ease-diagram", "true");
  g.setAttribute("pointer-events", "none");
  for (const op of diagram.ops) {
    if (op.kind === "line") {
      const ln = document.createElementNS(SVG_NS, "line");
      ln.setAttribute("x1", String(op.x1));
      ln.setAttribute("y1", String(op.y1));
      ln.setAttribute("x2", String(op.x2));
      ln.setAttribute("y2", String(op.y2));
      ln.setAttribute("stroke", op.stroke);
      ln.setAttribute("stroke-width", String(op.strokeWidth));
      if (op.dash) ln.setAttribute("stroke-dasharray", op.dash);
      g.appendChild(ln);
    } else if (op.kind === "filledPoly") {
      const poly = document.createElementNS(SVG_NS, "polygon");
      poly.setAttribute("points", op.points);
      poly.setAttribute("fill", op.fill);
      g.appendChild(poly);
    } else if (op.kind === "openPolyline") {
      const poly = document.createElementNS(SVG_NS, "polyline");
      poly.setAttribute("points", op.points);
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke", op.stroke);
      poly.setAttribute("stroke-width", String(op.strokeWidth));
      if (op.dash) poly.setAttribute("stroke-dasharray", op.dash);
      poly.setAttribute("stroke-linejoin", "round");
      poly.setAttribute("stroke-linecap", "round");
      g.appendChild(poly);
    } else if (op.kind === "rect") {
      const r = document.createElementNS(SVG_NS, "rect");
      r.setAttribute("x", String(op.x));
      r.setAttribute("y", String(op.y));
      r.setAttribute("width", String(op.w));
      r.setAttribute("height", String(op.h));
      r.setAttribute("rx", String(op.rx));
      r.setAttribute("fill", op.fill);
      r.setAttribute("stroke", op.stroke);
      r.setAttribute("stroke-width", String(op.strokeWidth));
      g.appendChild(r);
    } else if (op.kind === "text") {
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", String(op.x));
      t.setAttribute("y", String(op.y));
      t.setAttribute("font-size", String(op.fontSize));
      t.setAttribute("fill", op.fill);
      t.setAttribute("text-anchor", op.textAnchor);
      t.setAttribute("font-family", 'system-ui, -apple-system, "Segoe UI", sans-serif');
      t.setAttribute("font-weight", "700");
      t.setAttribute("dominant-baseline", "middle");
      t.textContent = op.content;
      g.appendChild(t);
    } else if (op.kind === "circle") {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", String(op.cx));
      c.setAttribute("cy", String(op.cy));
      c.setAttribute("r", String(op.r));
      c.setAttribute("fill", op.fill);
      if (op.stroke != null && op.stroke.length > 0) c.setAttribute("stroke", op.stroke);
      if (op.strokeWidth != null && op.strokeWidth > 0) c.setAttribute("stroke-width", String(op.strokeWidth));
      if (op.dash) c.setAttribute("stroke-dasharray", op.dash);
      g.appendChild(c);
    }
  }
  svg.appendChild(g);
}

/** 図解ありのときは総評のみ（胸バンド・箇条書きは図内に集約） */
export function appendFitEaseFootnote(parent: HTMLElement, summary: WidgetFitEaseSummaryJson | undefined): void {
  const band = (summary?.fitChestBandJa || "").trim();
  const tone = (summary?.fitToneJa || "").trim();
  if (!band && !tone) return;
  const wrap = el(
    "div",
    "width:100%;max-width:280px;padding:2px 6px 0;text-align:center;box-sizing:border-box;",
  );
  wrap.setAttribute("data-fitlook-fit-ease-footnote", "true");
  if (band) {
    const bc = fitChestBandColors(band);
    const bandBadge = el(
      "div",
      `display:inline-block;margin:0 auto 4px;padding:5px 9px;border-radius:6px;font-size:8px;font-weight:700;line-height:1.3;letter-spacing:0.01em;background:${bc.bg};color:${bc.fg};`,
    );
    bandBadge.textContent = band;
    wrap.appendChild(bandBadge);
  }
  if (tone) {
    const { bg, fg } = fitEaseToneColors(tone);
    const badge = el(
      "div",
      `display:inline-block;margin:0 auto;padding:5px 9px;border-radius:6px;font-size:8px;font-weight:600;line-height:1.3;letter-spacing:0.01em;background:${bg};color:${fg};`,
    );
    badge.textContent = tone;
    wrap.appendChild(badge);
  }
  parent.appendChild(wrap);
}

export function iconPerson(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("fill", "none");
  svg.style.cssText = "width:12px;height:12px;display:block;flex-shrink:0;";
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", "12");
  c.setAttribute("cy", "6");
  c.setAttribute("r", "3");
  c.setAttribute("stroke", "currentColor");
  c.setAttribute("stroke-width", "1.5");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", "M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M9 10h6");
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "1.5");
  p.setAttribute("stroke-linecap", "round");
  svg.appendChild(c);
  svg.appendChild(p);
  return svg;
}

export function iconCart(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute(
    "d",
    "M6 6h15l-1.5 9h-12L4.5 3H2M6 6L4.5 3M8 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z",
  );
  p.setAttribute("stroke", "#fff");
  p.setAttribute("stroke-width", "1.6");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.appendChild(p);
  return svg;
}
