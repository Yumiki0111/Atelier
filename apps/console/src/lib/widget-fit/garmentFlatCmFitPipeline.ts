import { getBodyRigLinePathsTemplate, type BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import type { JacketSize, ShirtSize } from "@/app/(main)/development/fitting/lib/types";
import {
  GARMENT_FLAT_CM_ORDERED_SIZE_LABELS,
  garmentFlatCmFromCustomGarmentSize,
  type GarmentFlatCm,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingMeasurements";
import type { GarmentFlatCmPresetsState } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingPresetsStorage";
import {
  flatCmOfferedSizeCmForRegister,
  flatCmOfferedSizeLabelsForRegister,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/flatCmOfferedSizeLabelsForRegister";
import { computeFittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasCompute";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";
import {
  PREVIEW_JACKET_SIZE,
  PREVIEW_SHIRT_SIZE,
} from "@/features/preview/widget-style-product/fit-constants";
import { applyWidgetSizeToCustomGarmentData } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import {
  resolveGarmentDataForPreviewView,
  type GarmentPreviewBodyView,
} from "@/lib/widget-fit/resolveGarmentDataForPreviewView";
import { resolveWidgetFitInitialSize } from "@/lib/widget-fit/widgetFitFlatCmSize";
import { widgetFitSizeLabelFromPreset } from "@/lib/widget-fit/widgetFitSizeLabels";

/** 平置き cm 試着の格子ボディ（開発・プレビュー・API で共通） */
export const GRID_FLAT_CM_BODY_VARIANTS = {
  front: "gridSvgBody" as BodyModelVariant,
  back: "gridSvgBodyBack" as BodyModelVariant,
};

export {
  garmentFlatCmFromCustomGarmentSize,
  garmentFlatCmShapeDeltasFromBase,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingMeasurements";

function activePresetName(presetsState: GarmentFlatCmPresetsState | null | undefined): string {
  if (!presetsState?.activeUserPresetId) return "";
  return presetsState.userPresets.find((p) => p.id === presetsState.activeUserPresetId)?.name ?? "";
}

/** 登録／ウィジェット用の offered ラベル・cm を spec に付与（未保存の開発状態もプレビューと同型にする） */
export function enrichCustomGarmentWithFlatCmOfferedMetadata(
  spec: CustomGarmentData,
  garmentCm: GarmentFlatCm,
  presetsState?: GarmentFlatCmPresetsState | null
): CustomGarmentData {
  const offeredCm = flatCmOfferedSizeCmForRegister(presetsState, garmentCm);
  const sizeKeys = flatCmOfferedSizeLabelsForRegister(presetsState, garmentCm);
  return {
    ...spec,
    ...(offeredCm != null ? { flatCmOfferedSizeCm: offeredCm } : {}),
    ...(sizeKeys.length > 0 ? { flatCmOfferedSizeLabels: sizeKeys } : {}),
  };
}

/** 編集中 cm・プリセットからウィジェット size ラベルを解決 */
export function resolveFlatCmSizeLabelForGarmentCm(
  spec: CustomGarmentData,
  garmentCm: GarmentFlatCm,
  presetsState?: GarmentFlatCmPresetsState | null,
  preferredLabel?: string | null
): string {
  const enriched = enrichCustomGarmentWithFlatCmOfferedMetadata(spec, garmentCm, presetsState);
  const sizeKeys = [
    ...(enriched.flatCmOfferedSizeLabels ?? GARMENT_FLAT_CM_ORDERED_SIZE_LABELS),
  ];
  return resolveWidgetFitInitialSize(preferredLabel ?? undefined, enriched, sizeKeys);
}

/** 商品 DB spec + サイズチップ → 試着用 CustomGarmentData（プレビュー・fit-svg API） */
export function prepareFlatCmGarmentForWidgetSize(
  base: CustomGarmentData,
  sizeLabel: string,
  opts?: { garmentCm?: GarmentFlatCm; presetsState?: GarmentFlatCmPresetsState | null }
): CustomGarmentData {
  const garmentCm = opts?.garmentCm ?? garmentFlatCmFromCustomGarmentSize(base);
  const enriched = enrichCustomGarmentWithFlatCmOfferedMetadata(base, garmentCm, opts?.presetsState);
  return applyWidgetSizeToCustomGarmentData(enriched, sizeLabel);
}

/** 開発エディタの平置き cm → 試着用 CustomGarmentData（プレビューと同じ size 解決 + path 再計算） */
export function prepareFlatCmGarmentForEditorCm(
  base: CustomGarmentData,
  garmentCm: GarmentFlatCm,
  presetsState?: GarmentFlatCmPresetsState | null
): CustomGarmentData {
  const enriched = enrichCustomGarmentWithFlatCmOfferedMetadata(base, garmentCm, presetsState);
  const preferred = widgetFitSizeLabelFromPreset(garmentCm, activePresetName(presetsState));
  const sizeLabel = resolveFlatCmSizeLabelForGarmentCm(enriched, garmentCm, presetsState, preferred);
  return applyWidgetSizeToCustomGarmentData(enriched, sizeLabel);
}

export type ComputeFlatCmGarmentFitSnapshotParams = {
  customGarmentData: CustomGarmentData;
  height: number;
  weight: number;
  bodyView?: GarmentPreviewBodyView;
  animProgress?: number;
  fromCustomGarmentData?: CustomGarmentData | null;
  toCustomGarmentData?: CustomGarmentData | null;
  shirtSize?: ShirtSize;
  jacketSize?: JacketSize;
};

/**
 * 平置き cm カスタム服の試着スナップショット（`computeFittingCanvasSnapshot` の単一入口）。
 * 開発キャンバス・プレビュー・サーバー fit-svg で同じオプションを使う。
 */
export function computeFlatCmGarmentFitSnapshot(
  params: ComputeFlatCmGarmentFitSnapshotParams
): FittingCanvasSnapshot {
  const bodyView = params.bodyView ?? "front";
  const bodyModelVariant =
    bodyView === "back" ? GRID_FLAT_CM_BODY_VARIANTS.back : GRID_FLAT_CM_BODY_VARIANTS.front;
  const garmentForSnap = resolveGarmentDataForPreviewView(params.customGarmentData, bodyView);
  const rigLinePaths = getBodyRigLinePathsTemplate(bodyModelVariant);

  return computeFittingCanvasSnapshot({
    height: params.height,
    weight: params.weight,
    garment: "custom",
    shirtSize: params.shirtSize ?? PREVIEW_SHIRT_SIZE,
    jacketSize: params.jacketSize ?? PREVIEW_JACKET_SIZE,
    customGarmentData: garmentForSnap,
    animProgress: params.animProgress ?? 1,
    fromSize: null,
    toSize: null,
    fromCustomGarmentData: params.fromCustomGarmentData
      ? resolveGarmentDataForPreviewView(params.fromCustomGarmentData, bodyView)
      : null,
    toCustomGarmentData: params.toCustomGarmentData
      ? resolveGarmentDataForPreviewView(params.toCustomGarmentData, bodyView)
      : null,
    rigBodyEnabled: false,
    bodyModelVariant,
    rigLinePaths,
    respectRequestedBodyModelVariant: true,
  });
}
