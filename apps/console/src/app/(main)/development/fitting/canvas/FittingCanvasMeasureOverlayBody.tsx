"use client";

import React from "react";
import type { MeasureOverlayData } from "../lib/types";
import { BZ } from "../lib/constants";
import {
  CM_INPUT_VS_MEASURED_EPS,
  OFFSET_HEIGHT_X,
  drawArrowDown,
  drawArrowUp,
} from "./fittingCanvasMeasureOverlaySvg";

export function FittingCanvasMeasureOverlayBody({
  bodyHeight,
  height,
}: {
  bodyHeight: MeasureOverlayData["bodyHeight"];
  height: number;
}) {
  const top = bodyHeight.top;
  const bottom = bodyHeight.bottom;
  const bodyX = top[0];
  const lineX = bodyX + OFFSET_HEIGHT_X;
  const midY = (top[1] + bottom[1]) / 2;
  const baseBodySpanPx = BZ.foot - BZ.head_top;
  const measuredHeightCm =
    baseBodySpanPx > 0 ? ((bottom[1] - top[1]) / baseBodySpanPx) * 170 : height;
  const heightMeasuredDiffers = Math.abs(measuredHeightCm - height) > CM_INPUT_VS_MEASURED_EPS;

  return (
    <>
      <line x1={bodyX} y1={top[1]} x2={lineX} y2={top[1]} stroke="#059669" strokeWidth={2} opacity={0.9} />
      <line x1={bodyX} y1={bottom[1]} x2={lineX} y2={bottom[1]} stroke="#059669" strokeWidth={2} opacity={0.9} />
      <line x1={lineX} y1={top[1]} x2={lineX} y2={bottom[1]} stroke="#059669" strokeWidth={4} strokeDasharray="6 4" />
      <path d={drawArrowUp(lineX, top[1])} fill="#059669" stroke="#047857" strokeWidth={2} />
      <path d={drawArrowDown(lineX, bottom[1])} fill="#059669" stroke="#047857" strokeWidth={2} />
      <text x={lineX + 24} y={midY} fontSize={18} fontWeight="bold" fill="#047857" fontFamily="sans-serif" dominantBaseline="middle">
        身長 {height}cm（入力）
      </text>
      {heightMeasuredDiffers ? (
        <text x={lineX + 24} y={midY + 18} fontSize={10} fill="#64748b" fontFamily="sans-serif" dominantBaseline="middle">
          画面上（基準体170の頭〜足スパン換算）{measuredHeightCm.toFixed(1)}cm
        </text>
      ) : null}
    </>
  );
}
