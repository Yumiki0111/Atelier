import type { GarmentFlatCmPresetId } from "@Atelier/shared";
import type { BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import type { WidgetFitEaseDiagramJson } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import type { WidgetFitEaseSummaryJson } from "@/lib/widget-fit/computeWidgetFitEaseSummary";
import type { FitSvgPayload } from "./fit-svg-types";

/** `/api/products/.../fit-svg` の JSON 本体（緩い型） */
export type FitSvgApiJsonBody = {
  error?: string;
  message?: string;
  viewBoxMinX?: number;
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  bodyPaths?: string[];
  garmentPathsBehindBody?: string[];
  garmentBehindBodyPathStrokeDasharrays?: (string | undefined)[];
  garmentBehindBodyPathStrokeWidths?: (number | undefined)[];
  garmentBehindBodyPathStrokes?: (string | undefined)[];
  garmentBehindBodyPathFills?: (string | undefined)[];
  garmentPaths?: string[];
  garmentPathStrokeDasharrays?: (string | undefined)[];
  garmentPathStrokeWidths?: (number | undefined)[];
  garmentPathStrokes?: (string | undefined)[];
  garmentPathFills?: (string | undefined)[];
  presetId?: GarmentFlatCmPresetId;
  bodyModelVariant?: BodyModelVariant;
  fitEaseSummary?: WidgetFitEaseSummaryJson;
  fitEaseDiagram?: WidgetFitEaseDiagramJson | null;
};

export function fitSvgHttpErrorHint(
  status: number,
  body: Pick<FitSvgApiJsonBody, "message" | "error">
): string {
  return status === 401
    ? "ログインの有効期限が切れている可能性があります。再ログインしてください。"
    : status === 404
      ? "商品が見つかりません（店舗と商品の紐づけを確認してください）。"
      : status === 400
        ? "garment_spec がないか無効です。"
        : body.message || body.error || `エラー (${status})`;
}

export function fitSvgPayloadFromApiBody(body: FitSvgApiJsonBody): FitSvgPayload | null {
  if (
    body.viewBoxWidth == null ||
    body.viewBoxHeight == null ||
    !Array.isArray(body.bodyPaths) ||
    !Array.isArray(body.garmentPaths)
  ) {
    return null;
  }
  return {
    viewBoxMinX: body.viewBoxMinX ?? 0,
    viewBoxWidth: body.viewBoxWidth,
    viewBoxHeight: body.viewBoxHeight,
    bodyPaths: body.bodyPaths,
    garmentPathsBehindBody: body.garmentPathsBehindBody,
    garmentBehindBodyPathStrokeDasharrays: body.garmentBehindBodyPathStrokeDasharrays,
    garmentBehindBodyPathStrokeWidths: body.garmentBehindBodyPathStrokeWidths,
    garmentBehindBodyPathStrokes: body.garmentBehindBodyPathStrokes,
    garmentBehindBodyPathFills: body.garmentBehindBodyPathFills,
    garmentPaths: body.garmentPaths,
    garmentPathStrokeDasharrays: body.garmentPathStrokeDasharrays,
    garmentPathStrokeWidths: body.garmentPathStrokeWidths,
    garmentPathStrokes: body.garmentPathStrokes,
    garmentPathFills: body.garmentPathFills,
    presetId: body.presetId,
    bodyModelVariant: body.bodyModelVariant,
    fitEaseSummary: body.fitEaseSummary,
    fitEaseDiagram: body.fitEaseDiagram,
  };
}
