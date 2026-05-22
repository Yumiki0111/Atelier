/**
 * 埋め込みウィジェット: `/api/public/widget-fit-svg` の path を DOM に載せる（プレビューと同じ見えの最小実装）。
 */

import { isGarmentFlatCmPresetId } from "@Atelier/shared";
export type WidgetFitSvgPathStyleArrays = {
  paths: string[];
  strokeDasharrays?: (string | undefined)[];
  strokeWidths?: (number | undefined)[];
  strokes?: (string | undefined)[];
  fills?: (string | undefined)[];
};

/** 旧 cover 写像 viewBox 用（meet 極小縮小対策） */
const GARMENT_FLAT_CM_EMBED_GARMENT_MIN_STROKE_LEGACY = 5.05;
/** model_front ネイティブ viewBox（~525）— console `GARMENT_FLAT_CM_DEV_FITTING_GARMENT_MIN_STROKE_WIDTH` と同値 */
const GARMENT_FLAT_CM_EMBED_GARMENT_MIN_STROKE_NATIVE = 1.25;
const GARMENT_FLAT_CM_EMBED_NATIVE_VIEWBOX_HEIGHT_MAX = 640;
function embedGarmentMinStrokeWidth(viewBoxHeight: number): number {
  return viewBoxHeight > 0 && viewBoxHeight <= GARMENT_FLAT_CM_EMBED_NATIVE_VIEWBOX_HEIGHT_MAX
    ? GARMENT_FLAT_CM_EMBED_GARMENT_MIN_STROKE_NATIVE
    : GARMENT_FLAT_CM_EMBED_GARMENT_MIN_STROKE_LEGACY;
}

function readSvgViewBoxHeight(svg: SVGSVGElement): number {
  const vb = svg.viewBox?.baseVal;
  if (vb != null && vb.height > 0) return vb.height;
  const attr = svg.getAttribute("viewBox");
  if (!attr) return 0;
  const parts = attr.trim().split(/\s+/).map(Number);
  return parts.length >= 4 && Number.isFinite(parts[3]) ? parts[3]! : 0;
}

export function appendWidgetFitGarmentPathGroup(
  svg: SVGSVGElement,
  layer: WidgetFitSvgPathStyleArrays,
  options: {
    presetId?: string;
    defaultStroke: string;
    /** 平置き cm の背面レイヤのみ: fill のみ指定の縫線を stroke で描く */
    flatCmBehindGarmentLayer?: boolean;
    /** 背面 `gridSvgBodyBack` で back-stroke をボディ下地・輪郭色に揃える */
    blendBehindStrokeWithGridBody?: { canvasBg: string; silhouetteStroke: string };
  }
): void {
  const ns = "http://www.w3.org/2000/svg";
  const isGarmentFlatCm = isGarmentFlatCmPresetId(options.presetId);
  const defaultWidth = isGarmentFlatCm ? 1 : 8;

  const minGarmentStroke = embedGarmentMinStrokeWidth(readSvgViewBoxHeight(svg));
  const widenGarmentFlatCmStroke = (base: number): number =>
    !isGarmentFlatCm || !Number.isFinite(base) ? base : Math.max(base, minGarmentStroke);

  const gGarment = document.createElementNS(ns, "g");
  gGarment.setAttribute("data-fitlook-fit-garment", "true");

  const { paths, strokeDasharrays, strokeWidths, strokes, fills } = layer;
  for (let gi = 0; gi < paths.length; gi++) {
    const d = paths[gi]!;
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    const rawFill = fills?.[gi]?.trim() ?? "";
    const hasFill = rawFill.length > 0 && !/^none$/i.test(rawFill);
    const rawStroke = strokes?.[gi]?.trim() ?? "";
    const hasStroke = rawStroke.length > 0 && !/^none$/i.test(rawStroke);
    const sw = strokeWidths?.[gi];
    const wRaw = sw != null && Number.isFinite(sw) ? sw : defaultWidth;
    const wNum = Number.isFinite(wRaw) && wRaw > 0 ? wRaw : defaultWidth;
    const dash = strokeDasharrays?.[gi];

    if (isGarmentFlatCm && options.flatCmBehindGarmentLayer === true && hasFill && !hasStroke) {
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", rawFill);
      p.setAttribute("stroke-width", String(widenGarmentFlatCmStroke(wNum)));
    } else if (isGarmentFlatCm && hasFill && !hasStroke) {
      p.setAttribute("fill", rawFill);
      p.setAttribute("stroke", "none");
    } else if (hasFill && hasStroke) {
      p.setAttribute("fill", rawFill);
      p.setAttribute("stroke", rawStroke);
      p.setAttribute("stroke-width", String(widenGarmentFlatCmStroke(wNum)));
    } else {
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", hasStroke ? rawStroke : options.defaultStroke);
      p.setAttribute("stroke-width", String(widenGarmentFlatCmStroke(wNum)));
    }

    const blend = options.blendBehindStrokeWithGridBody;
    if (blend != null && isGarmentFlatCm && options.flatCmBehindGarmentLayer === true) {
      p.setAttribute("fill", blend.canvasBg);
      const curStroke = (p.getAttribute("stroke") ?? "none").trim();
      const curW = Number(p.getAttribute("stroke-width") ?? 0);
      const stroked = curStroke.length > 0 && curStroke !== "none" && Number.isFinite(curW) && curW > 0;
      if (stroked) {
        p.setAttribute("stroke", blend.silhouetteStroke);
      } else {
        p.setAttribute("stroke", "none");
      }
    }
    if (dash != null && String(dash).trim().length > 0) {
      p.setAttribute("stroke-dasharray", String(dash));
    }
    gGarment.appendChild(p);
  }

  svg.appendChild(gGarment);
}
