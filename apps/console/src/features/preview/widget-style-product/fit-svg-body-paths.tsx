"use client";

import type { GarmentFlatCmPresetId } from "@Atelier/shared";
import { isGarmentFlatCmPresetId } from "@Atelier/shared";
import type { BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import {
  GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE,
  garmentFlatCmGridBodyFillLayerPaint,
  garmentFlatCmGridBodyLayeredOutlinePathAfterFirst,
  garmentFlatCmOmitGridBodySilhouetteStroke,
  garmentFlatCmPreviewBodySilhouetteStrokeWidth,
  garmentFlatCmUsesLayeredGridBodySilhouette,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";

/** メイン試着 viewer と体型シート下書きでキーを分ける */
export type WidgetPreviewFitSvgBodyPathIds = {
  fillRowKeyPrefix: "bf" | "bdf";
  outlineClosedKey: "bo" | "bod-o";
  outlineOpenKeyPrefix: "bs" | "bds";
  simpleRowKeyPrefix: "b" | "bod";
};

export function WidgetPreviewFitSvgBodyPaths({
  bodyPaths,
  canvasBg,
  bodyStrokeSimple,
  presetId,
  bodyModelVariant,
  viewBoxHeight,
  ids,
}: {
  bodyPaths: string[];
  canvasBg: string;
  bodyStrokeSimple: string;
  presetId?: GarmentFlatCmPresetId;
  bodyModelVariant?: BodyModelVariant;
  viewBoxHeight: number;
  ids: WidgetPreviewFitSvgBodyPathIds;
}) {
  const bodyStrokeWidth = garmentFlatCmPreviewBodySilhouetteStrokeWidth(viewBoxHeight);
  if (
    isGarmentFlatCmPresetId(presetId) &&
    garmentFlatCmUsesLayeredGridBodySilhouette(bodyPaths.length)
  ) {
    return (
      <>
        <g fill={canvasBg} stroke="none">
          {bodyPaths.map((d, i) => (
            <path
              key={`${ids.fillRowKeyPrefix}-${i}`}
              d={d}
              fill={garmentFlatCmGridBodyFillLayerPaint(d, i, bodyPaths.length, canvasBg)}
            />
          ))}
        </g>
        <g
          fill="none"
          stroke={GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE}
          strokeWidth={bodyStrokeWidth}
          pointerEvents="none"
        >
          {bodyPaths[0] && !garmentFlatCmOmitGridBodySilhouetteStroke(0, bodyModelVariant) ? (
            <path key={ids.outlineClosedKey} d={bodyPaths[0]} />
          ) : null}
          {bodyPaths.map((d, i) =>
            garmentFlatCmGridBodyLayeredOutlinePathAfterFirst(d, i, bodyPaths.length, bodyModelVariant) ? (
              <path key={`${ids.outlineOpenKeyPrefix}-${i}`} d={d} />
            ) : null
          )}
        </g>
      </>
    );
  }
  return (
    <g fill={canvasBg} stroke={bodyStrokeSimple} strokeWidth={bodyStrokeWidth}>
      {bodyPaths.map((d, i) => (
        <path key={`${ids.simpleRowKeyPrefix}-${i}`} d={d} />
      ))}
    </g>
  );
}
