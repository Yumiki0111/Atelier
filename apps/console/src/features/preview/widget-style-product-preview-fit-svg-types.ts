import type { WidgetFitEaseDiagramJson } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import type { WidgetFitEaseSummaryJson } from "@/lib/widget-fit/computeWidgetFitEaseSummary";

export type FitSvgPayload = {
  viewBoxWidth: number;
  viewBoxHeight: number;
  bodyPaths: string[];
  garmentPaths: string[];
  garmentPathStrokeDasharrays?: (string | undefined)[];
  garmentPathStrokeWidths?: (number | undefined)[];
  garmentPathStrokes?: (string | undefined)[];
  fitEaseSummary?: WidgetFitEaseSummaryJson;
  fitEaseDiagram?: WidgetFitEaseDiagramJson | null;
};
