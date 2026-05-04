/**
 * 埋め込みウィジェット: `/api/public/widget-fit-svg` の path を DOM に載せる（プレビューと同じ見えの最小実装）。
 */

export type WidgetFitSvgPathStyleArrays = {
  paths: string[];
  strokeDasharrays?: (string | undefined)[];
  strokeWidths?: (number | undefined)[];
  strokes?: (string | undefined)[];
  fills?: (string | undefined)[];
};

/** アプリ側 `gradingV4Constants.ts` の `GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH` と揃える */
const GRADING_V4_EMBED_MIN_STROKE_WIDTH = 4.35;

export function appendWidgetFitGarmentPathGroup(
  svg: SVGSVGElement,
  layer: WidgetFitSvgPathStyleArrays,
  options: {
    presetId?: string;
    defaultStroke: string;
    /** Grading v4 の背面レイヤのみ: fill のみ指定の縫線を stroke で描く */
    gradingBehindGarmentLayer?: boolean;
  }
): void {
  const ns = "http://www.w3.org/2000/svg";
  const isGrading = options.presetId === "gradingV4";
  const defaultWidth = isGrading ? 1 : 8;

  const widenGradingStroke = (base: number): number =>
    !isGrading || !Number.isFinite(base) ? base : Math.max(base, GRADING_V4_EMBED_MIN_STROKE_WIDTH);

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

    if (isGrading && options.gradingBehindGarmentLayer === true && hasFill && !hasStroke) {
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", rawFill);
      p.setAttribute("stroke-width", String(widenGradingStroke(wNum)));
    } else if (isGrading && hasFill && !hasStroke) {
      p.setAttribute("fill", rawFill);
      p.setAttribute("stroke", "none");
    } else if (hasFill && hasStroke) {
      p.setAttribute("fill", rawFill);
      p.setAttribute("stroke", rawStroke);
      p.setAttribute("stroke-width", String(widenGradingStroke(wNum)));
    } else {
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", hasStroke ? rawStroke : options.defaultStroke);
      p.setAttribute("stroke-width", String(widenGradingStroke(wNum)));
    }
    if (dash != null && String(dash).trim().length > 0) {
      p.setAttribute("stroke-dasharray", String(dash));
    }
    gGarment.appendChild(p);
  }

  svg.appendChild(gGarment);
}
