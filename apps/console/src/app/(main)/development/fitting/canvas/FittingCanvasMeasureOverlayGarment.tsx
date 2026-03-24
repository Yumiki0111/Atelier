"use client";

import React, { type ReactNode } from "react";
import type { MeasureOverlayData } from "../lib/types";
import {
  ARROW_INSET,
  CM_INPUT_VS_MEASURED_EPS,
  OFFSET_CHEST_Y,
  OFFSET_LENGTH_X,
  OFFSET_SHOULDER_Y,
  drawArrowDown,
  drawArrowLeftSm,
  drawArrowRightSm,
} from "./fittingCanvasMeasureOverlaySvg";
import { FittingCanvasMeasureOverlayGarmentSleeve } from "./FittingCanvasMeasureOverlayGarmentSleeve";

type GarmentG = NonNullable<MeasureOverlayData["garment"]>;

export function FittingCanvasMeasureOverlayGarment({ g }: { g: GarmentG }): ReactNode {
  const midX = (g.shoulderLeft[0] + g.shoulderRight[0]) / 2;
  const shoulderY = (g.shoulderLeft[1] + g.shoulderRight[1]) / 2;
  const hemY = g.hemCenter[1];
  const lengthTopY = g.lengthMeasureTop ? g.lengthMeasureTop[1] : shoulderY;
  const lengthTopHorizX = g.lengthMeasureTop ? g.lengthMeasureTop[0] : midX;
  const lineShoulderY = shoulderY + OFFSET_SHOULDER_Y;
  const lineLengthX = midX + OFFSET_LENGTH_X;
  const slL = g.shoulderLeft[0];
  const slR = g.shoulderRight[0];

  const inputLen = g.size.length;
  const measuredLen = g.lengthMeasuredCm;
  const geom = g.lengthGeomDebug;
  const lengthMeasuredDiffers =
    measuredLen != null &&
    Number.isFinite(measuredLen) &&
    Math.abs(measuredLen - inputLen) > CM_INPUT_VS_MEASURED_EPS;
  const midLengthY = (lengthTopY + hemY) / 2;
  const lengthDebugLine = geom
    ? g.lengthCmFromSizeInput
      ? `実寸デバッグ 縦差 ${geom.px}px · サイズ表着丈 ${inputLen}cm（ラベル同期） · ボディ換算 ${geom.cm.toFixed(1)}cm`
      : `実寸デバッグ 縦差 ${geom.px}px → ${geom.cm.toFixed(1)}cm`
    : null;
  let lengthSubLine: ReactNode = null;
  if (lengthDebugLine != null) {
    lengthSubLine = (
      <text
        x={lineLengthX + 24}
        y={midLengthY + 18}
        fontSize={10}
        fill="#64748b"
        fontFamily="sans-serif"
        dominantBaseline="middle"
      >
        {lengthDebugLine}
      </text>
    );
  } else if (lengthMeasuredDiffers && measuredLen != null) {
    lengthSubLine = (
      <text
        x={lineLengthX + 24}
        y={midLengthY + 18}
        fontSize={10}
        fill="#64748b"
        fontFamily="sans-serif"
        dominantBaseline="middle"
      >
        画面上（実測）{measuredLen.toFixed(1)}cm
      </text>
    );
  }

  return (
    <>
      {g.sizeLabel && (
        <text x={midX} y={lineShoulderY - 22} fontSize={13} fontWeight="bold" fill="#1e293b" fontFamily="sans-serif" textAnchor="middle">
          {g.sizeLabel}
        </text>
      )}
      <line x1={slL + ARROW_INSET} y1={lineShoulderY} x2={slR - ARROW_INSET} y2={lineShoulderY} stroke="#2563eb" strokeWidth={3} strokeDasharray="6 4" />
      <path d={drawArrowLeftSm(slL, lineShoulderY)} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.5} />
      <path d={drawArrowRightSm(slR, lineShoulderY)} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.5} />
      <text x={slL} y={lineShoulderY - 6} fontSize={11} fill="#1d4ed8" fontFamily="sans-serif" textAnchor="middle">
        ここから
      </text>
      <text x={slR} y={lineShoulderY - 6} fontSize={11} fill="#1d4ed8" fontFamily="sans-serif" textAnchor="middle">
        ここまで
      </text>
      <text x={midX} y={lineShoulderY + 26} fontSize={16} fontWeight="bold" fill="#1d4ed8" fontFamily="sans-serif" textAnchor="middle">
        肩幅 {g.size.shoulder}cm
      </text>
      <text x={midX} y={lineShoulderY + 44} fontSize={10} fill="#64748b" fontFamily="sans-serif" textAnchor="middle">
        服の肩縫い左端〜右端
      </text>
      <line x1={lengthTopHorizX} y1={lengthTopY} x2={lineLengthX} y2={lengthTopY} stroke="#7c3aed" strokeWidth={2} opacity={0.9} />
      <line x1={g.hemCenter[0]} y1={hemY} x2={lineLengthX} y2={hemY} stroke="#7c3aed" strokeWidth={2} opacity={0.9} />
      <line x1={lineLengthX} y1={lengthTopY} x2={lineLengthX} y2={hemY} stroke="#7c3aed" strokeWidth={4} strokeDasharray="6 4" />
      <path d={drawArrowDown(lineLengthX, hemY)} fill="#7c3aed" stroke="#6d28d9" strokeWidth={2} />
      <text
        x={lineLengthX + 24}
        y={midLengthY}
        fontSize={16}
        fontWeight="bold"
        fill="#6d28d9"
        fontFamily="sans-serif"
        dominantBaseline="middle"
      >
        着丈 {inputLen}cm（入力）
        {(inputLen < 40 || inputLen > 95) && measuredLen == null && !geom && (
          <tspan fontSize={10} fill="#b91c1c">
            {" "}
            （要確認）
          </tspan>
        )}
      </text>
      {lengthSubLine}
      {(() => {
        const cl = g.chestLeft;
        const cr = g.chestRight;
        if (!cl || !cr) return null;
        const cLy = (cl[1] + cr[1]) / 2 + OFFSET_CHEST_Y;
        const cMidX = (cl[0] + cr[0]) / 2;
        return (
          <>
            <line x1={cl[0]} y1={cl[1]} x2={cl[0]} y2={cLy} stroke="#0d9488" strokeWidth={2} opacity={0.9} />
            <line x1={cr[0]} y1={cr[1]} x2={cr[0]} y2={cLy} stroke="#0d9488" strokeWidth={2} opacity={0.9} />
            <line x1={cl[0] + ARROW_INSET} y1={cLy} x2={cr[0] - ARROW_INSET} y2={cLy} stroke="#0d9488" strokeWidth={3} strokeDasharray="6 4" />
            <path d={drawArrowLeftSm(cl[0], cLy)} fill="#0d9488" stroke="#0f766e" strokeWidth={1.5} />
            <path d={drawArrowRightSm(cr[0], cLy)} fill="#0d9488" stroke="#0f766e" strokeWidth={1.5} />
            <text x={cl[0]} y={cLy - 8} fontSize={11} fill="#0f766e" fontFamily="sans-serif" textAnchor="middle">
              ここから
            </text>
            <text x={cr[0]} y={cLy - 8} fontSize={11} fill="#0f766e" fontFamily="sans-serif" textAnchor="middle">
              ここまで
            </text>
            <text x={cMidX} y={cLy + 26} fontSize={16} fontWeight="bold" fill="#0f766e" fontFamily="sans-serif" textAnchor="middle">
              身幅 {g.size.chest}cm
            </text>
            <text x={cMidX} y={cLy + 44} fontSize={10} fill="#64748b" fontFamily="sans-serif" textAnchor="middle">
              胸周り付近の幅
            </text>
          </>
        );
      })()}
      <FittingCanvasMeasureOverlayGarmentSleeve g={g} />
      {(!g.chestLeft || !g.chestRight) && (
        <text x={lineLengthX + 24} y={hemY + 36} fontSize={14} fontWeight="bold" fill="#0f766e" fontFamily="sans-serif" dominantBaseline="middle">
          身幅 {g.size.chest}cm（採寸のみ）
        </text>
      )}
      {(!g.sleeveStart || !g.sleeveEnd) && (
        <text x={lineLengthX + 24} y={hemY + 56} fontSize={14} fontWeight="bold" fill="#a21caf" fontFamily="sans-serif" dominantBaseline="middle">
          袖丈 {g.size.sleeve}cm（採寸のみ）
        </text>
      )}
    </>
  );
}
