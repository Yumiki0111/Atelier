import type { CustomLandmarks, SizeMeasure } from "./types";

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
