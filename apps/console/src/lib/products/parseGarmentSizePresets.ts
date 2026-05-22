import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import type { GarmentFlatCm } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingMeasurements";
import { isGarmentFlatCmPresetId } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import { inferGarmentFlatCmSizeKey } from "@/lib/widget-fit/widgetFitFlatCmSize";
import {
  dedupeWidgetFitSizeLabelsInOrder,
  normalizeWidgetFitSizeLabel,
} from "@/lib/widget-fit/widgetFitSizeLabels";

/** 商品編集で扱うサイズ行（平置き cm） */
export type GarmentSizePresetRow = {
  label: string;
  shoulderCm: number;
  bodyWidthCm: number;
  lengthCm: number;
  sleeveCm: number;
};

function isFlatCmGarmentSpec(garmentSpec: unknown): garmentSpec is CustomGarmentData {
  return (
    isGarmentSpecRenderable(garmentSpec) &&
    isGarmentFlatCmPresetId((garmentSpec as CustomGarmentData).presetId)
  );
}

function rowFromGarmentFlatCm(label: string, cm: GarmentFlatCm): GarmentSizePresetRow {
  return {
    label,
    shoulderCm: cm.shoulder,
    bodyWidthCm: cm.bodyWidth,
    lengthCm: cm.bodyLength,
    sleeveCm: cm.sleeve,
  };
}

function rowFromSizeMeasure(label: string, size: CustomGarmentData["size"]): GarmentSizePresetRow {
  return {
    label,
    shoulderCm: size.shoulder,
    bodyWidthCm: size.chest,
    lengthCm: size.length,
    sleeveCm: size.sleeve,
  };
}

export function parseGarmentSizePresets(garmentSpec: unknown): GarmentSizePresetRow[] {
  if (!isFlatCmGarmentSpec(garmentSpec)) return [];
  const g = garmentSpec;

  const labelsRaw = g.flatCmOfferedSizeLabels;
  const cmMap = g.flatCmOfferedSizeCm;

  if (Array.isArray(labelsRaw) && labelsRaw.length > 0) {
    const rows: GarmentSizePresetRow[] = [];
    for (const raw of labelsRaw) {
      const label = normalizeWidgetFitSizeLabel(String(raw));
      if (!label) continue;
      const cm = cmMap?.[label];
      if (cm) {
        rows.push(rowFromGarmentFlatCm(label, cm));
      } else {
        rows.push(rowFromSizeMeasure(label, g.size));
      }
    }
    if (rows.length > 0) return rows;
  }

  if (cmMap != null && typeof cmMap === "object") {
    const keys = dedupeWidgetFitSizeLabelsInOrder(Object.keys(cmMap));
    if (keys.length > 0) {
      return keys.map((label) => rowFromGarmentFlatCm(label, cmMap[label]!));
    }
  }

  const inferred = inferGarmentFlatCmSizeKey(g);
  const label = inferred ?? "SIZE 1";
  return [rowFromSizeMeasure(label, g.size)];
}

export function canEditGarmentSizePresets(garmentSpec: unknown): boolean {
  return isFlatCmGarmentSpec(garmentSpec);
}

export function mergeGarmentSpecSizePresets(
  garmentSpec: unknown,
  presets: GarmentSizePresetRow[]
): unknown {
  if (!isFlatCmGarmentSpec(garmentSpec)) return garmentSpec;
  const g = JSON.parse(JSON.stringify(garmentSpec)) as CustomGarmentData;

  const labels: string[] = [];
  const cmMap: Record<string, GarmentFlatCm> = {};
  const seen = new Set<string>();

  for (const row of presets) {
    const label = normalizeWidgetFitSizeLabel(row.label);
    if (!label || seen.has(label)) continue;
    if (
      !Number.isFinite(row.shoulderCm) ||
      !Number.isFinite(row.bodyWidthCm) ||
      !Number.isFinite(row.lengthCm) ||
      !Number.isFinite(row.sleeveCm)
    ) {
      continue;
    }
    seen.add(label);
    labels.push(label);
    cmMap[label] = {
      shoulder: row.shoulderCm,
      bodyWidth: row.bodyWidthCm,
      bodyLength: row.lengthCm,
      sleeve: row.sleeveCm,
    };
  }

  if (labels.length === 0) {
    const next = { ...g };
    delete next.flatCmOfferedSizeLabels;
    delete next.flatCmOfferedSizeCm;
    return next;
  }

  return {
    ...g,
    flatCmOfferedSizeLabels: labels,
    flatCmOfferedSizeCm: cmMap,
  };
}

/**
 * 保存済み garment_spec の `bodyModelVariant === "lineArtVerification"` は廃止（格子テンプレに統一）。
 */
export function mergeGarmentSpecBodyModelVariant(garmentSpec: unknown, _obsolete: null): unknown {
  if (garmentSpec == null || typeof garmentSpec !== "object" || Array.isArray(garmentSpec)) {
    return garmentSpec;
  }
  const spec = { ...(garmentSpec as Record<string, unknown>) };
  if (spec.bodyModelVariant === "lineArtVerification") {
    delete spec.bodyModelVariant;
  }
  return spec;
}
