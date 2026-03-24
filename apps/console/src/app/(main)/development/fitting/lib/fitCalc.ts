import type { FitResult, SizeMeasure } from "./types";
import { SIZES } from "./constants";

function fitFromSize(h: number, w: number, size: SizeMeasure): FitResult {
  const bmi = w / (h / 100) ** 2;
  const estChest = h * 0.52 + (bmi - 22) * 1.5;
  const chestDiff = size.chest * 2 - estChest;
  const estTorso = h * 0.395;
  const hemDiff = size.length - estTorso;
  return {
    chestDiff: Math.round(chestDiff * 10) / 10,
    hemDiff: Math.round(hemDiff * 10) / 10,
    estChest: Math.round(estChest),
  };
}

export function calcFit(h: number, w: number, sizeName: string): FitResult {
  const size = SIZES[sizeName];
  if (!size) return { chestDiff: 0, hemDiff: 0, estChest: 0 };
  return fitFromSize(h, w, size);
}

/** 採寸値から直接フィットを計算（アップロード品用） */
export function calcFitFromSize(h: number, w: number, size: SizeMeasure | null): FitResult {
  if (!size) return { chestDiff: 0, hemDiff: 0, estChest: 0 };
  return fitFromSize(h, w, size);
}

export function jacketFitLabel(chestDiff: number): "tight" | "ok" | "loose" {
  if (chestDiff < 5) return "tight";
  if (chestDiff < 30) return "ok";
  return "loose";
}

export function shirtFitLabel(chestDiff: number): "tight" | "ok" | "loose" {
  if (chestDiff < 10) return "tight";
  if (chestDiff < 30) return "ok";
  return "loose";
}
