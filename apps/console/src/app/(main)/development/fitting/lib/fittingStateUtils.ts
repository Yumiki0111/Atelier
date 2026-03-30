import type { CustomLandmarks, SizeMeasure } from "./types";

/** `pathDs` が別配列でも各 `d` 文字列が同一なら真（JSON クロン後の参照比較失敗を防ぐ） */
export function pathDsContentEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function sizeEqual(a: SizeMeasure, b: SizeMeasure): boolean {
  return a.length === b.length && a.shoulder === b.shoulder && a.chest === b.chest && a.sleeve === b.sleeve;
}

export function landmarksEqual(a: CustomLandmarks, b: CustomLandmarks): boolean {
  return (
    a.shoulderY === b.shoulderY &&
    a.shoulderLx === b.shoulderLx &&
    a.shoulderRx === b.shoulderRx &&
    a.hemY === b.hemY &&
    a.hemCx === b.hemCx
  );
}
