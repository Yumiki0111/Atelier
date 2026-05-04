import type { WidgetFitEaseDiagramJson } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import type { WidgetFitEaseSummaryJson } from "@/lib/widget-fit/computeWidgetFitEaseSummary";

export type FitSvgPayload = {
  viewBoxMinX?: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  bodyPaths: string[];
  /** Grading v4 背面レイヤ（体型より下）。無い／空のときは省略可 */
  garmentPathsBehindBody?: string[];
  garmentBehindBodyPathStrokeDasharrays?: (string | undefined)[];
  garmentBehindBodyPathStrokeWidths?: (number | undefined)[];
  garmentBehindBodyPathStrokes?: (string | undefined)[];
  garmentBehindBodyPathFills?: (string | undefined)[];
  /** 前面レイヤ（Grading で背面ありのときは前面のみ）。従来は全 path */
  garmentPaths: string[];
  garmentPathStrokeDasharrays?: (string | undefined)[];
  garmentPathStrokeWidths?: (number | undefined)[];
  garmentPathStrokes?: (string | undefined)[];
  garmentPathFills?: (string | undefined)[];
  /** 登録時の `presetId`（Grading v4 試着の描画分岐用） */
  presetId?: "gradingV4";
  fitEaseSummary?: WidgetFitEaseSummaryJson;
  fitEaseDiagram?: WidgetFitEaseDiagramJson | null;
};
