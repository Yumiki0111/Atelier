import type { GarmentFlatCmPresetId } from "@Atelier/shared";
import type { BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import type { WidgetFitEaseDiagramJson } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import type { WidgetFitEaseSummaryJson } from "@/lib/widget-fit/computeWidgetFitEaseSummary";

export type FitSvgPayload = {
  viewBoxMinX?: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  bodyPaths: string[];
  /** 平置き cm グレードの背面レイヤ（体型より下）。無い／空のときは省略可 */
  garmentPathsBehindBody?: string[];
  garmentBehindBodyPathStrokeDasharrays?: (string | undefined)[];
  garmentBehindBodyPathStrokeWidths?: (number | undefined)[];
  garmentBehindBodyPathStrokes?: (string | undefined)[];
  garmentBehindBodyPathFills?: (string | undefined)[];
  /** 前面レイヤ（背面レイヤありのときは前面のみ）。従来は全 path */
  garmentPaths: string[];
  garmentPathStrokeDasharrays?: (string | undefined)[];
  garmentPathStrokeWidths?: (number | undefined)[];
  garmentPathStrokes?: (string | undefined)[];
  garmentPathFills?: (string | undefined)[];
  /** 登録時の `presetId`（平置き cm 試着の描画分岐用。旧 DB 値も許容） */
  presetId?: GarmentFlatCmPresetId;
  /** 試着ボディ（背面ビュー時は gridSvgBodyBack） */
  bodyModelVariant?: BodyModelVariant;
  fitEaseSummary?: WidgetFitEaseSummaryJson;
  fitEaseDiagram?: WidgetFitEaseDiagramJson | null;
};
