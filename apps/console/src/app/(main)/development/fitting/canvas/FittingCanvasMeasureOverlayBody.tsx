"use client";

import React from "react";
import type { MeasureOverlayData } from "../lib/types";
import { OFFSET_HEIGHT_X, drawArrowDown, drawArrowUp } from "./fittingCanvasMeasureOverlaySvg";

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

  return (
    <>
      <line x1={bodyX} y1={top[1]} x2={lineX} y2={top[1]} stroke="#059669" strokeWidth={2} opacity={0.9} />
      <line x1={bodyX} y1={bottom[1]} x2={lineX} y2={bottom[1]} stroke="#059669" strokeWidth={2} opacity={0.9} />
      <line x1={lineX} y1={top[1]} x2={lineX} y2={bottom[1]} stroke="#059669" strokeWidth={4} strokeDasharray="6 4" />
      <path d={drawArrowUp(lineX, top[1])} fill="#059669" stroke="#047857" strokeWidth={2} />
      <path d={drawArrowDown(lineX, bottom[1])} fill="#059669" stroke="#047857" strokeWidth={2} />
      <text x={lineX + 24} y={midY} fontSize={18} fontWeight="bold" fill="#047857" fontFamily="sans-serif" dominantBaseline="middle">
        <title>
          頭〜足はモデル身長（スライダー）の定義。入力/実寸の二重表記は不要のため身長のみ表示。
        </title>
        身長 {height}cm
      </text>
    </>
  );
}
