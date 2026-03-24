"use client";

import React from "react";
import type { MeasureOverlayData } from "../lib/types";
import { FittingCanvasMeasureOverlayBody } from "./FittingCanvasMeasureOverlayBody";
import { FittingCanvasMeasureOverlayGarment } from "./FittingCanvasMeasureOverlayGarment";

interface FittingCanvasMeasureOverlayProps {
  show: boolean;
  measureOverlay: MeasureOverlayData | null;
  height: number;
}

export function FittingCanvasMeasureOverlay({
  show,
  measureOverlay,
  height,
}: FittingCanvasMeasureOverlayProps) {
  if (!show || !measureOverlay) return null;

  return (
    <g key="measure-overlay" aria-hidden className="pointer-events-none">
      <FittingCanvasMeasureOverlayBody bodyHeight={measureOverlay.bodyHeight} height={height} />
      {measureOverlay.garment ? <FittingCanvasMeasureOverlayGarment g={measureOverlay.garment} /> : null}
    </g>
  );
}
