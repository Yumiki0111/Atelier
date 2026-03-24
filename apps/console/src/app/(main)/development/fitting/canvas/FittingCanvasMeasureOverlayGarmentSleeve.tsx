"use client";

import React, { type ReactNode } from "react";
import type { MeasureOverlayData } from "../lib/types";
import {
  CM_INPUT_VS_MEASURED_EPS,
  OFFSET_SLEEVE_NORMAL,
  drawArrowDown,
} from "./fittingCanvasMeasureOverlaySvg";

type GarmentG = NonNullable<MeasureOverlayData["garment"]>;

export function FittingCanvasMeasureOverlayGarmentSleeve({ g }: { g: GarmentG }): ReactNode {
  if (!g.sleeveStart || !g.sleeveEnd) return null;

  const [sx, sy] = g.sleeveStart;
  const [ex, ey] = g.sleeveEnd;
  const inputSleeve = g.size.sleeve;
  const measuredSleeve = g.sleeveMeasuredCm;
  const sleeveGeom = g.sleeveGeomDebug;
  const sleeveMeasuredDiffers =
    measuredSleeve != null &&
    Number.isFinite(measuredSleeve) &&
    Math.abs(measuredSleeve - inputSleeve) > CM_INPUT_VS_MEASURED_EPS;
  const dx = ex - sx;
  const dy = ey - sy;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const d = OFFSET_SLEEVE_NORMAL;
  const slStart = [sx + nx * d, sy + ny * d] as const;
  const slEnd = [ex + nx * d, ey + ny * d] as const;
  const slMidX = (slStart[0] + slEnd[0]) / 2;
  const slMidY = (slStart[1] + slEnd[1]) / 2;
  const labelOffset = nx >= 0 ? -22 : 22;
  const hasPath = g.sleevePathPoints && g.sleevePathPoints.length >= 2;
  const strokeColor = hasPath ? "#dc2626" : "#c026d3";
  const fillColor = hasPath ? "#b91c1c" : "#a21caf";
  const pathHint = hasPath ? " · 赤線＝計測区間" : " · 肩〜袖口";
  let sleeveDebugLine: string;
  if (sleeveGeom) {
    const base = g.sleeveCmFromSizeInput
      ? `実寸デバッグ 縦差 ${sleeveGeom.px}px · サイズ表袖 ${inputSleeve}cm（ラベル同期） · ボディ換算 ${sleeveGeom.cm.toFixed(1)}cm`
      : `実寸デバッグ 縦差 ${sleeveGeom.px}px → ${sleeveGeom.cm.toFixed(1)}cm`;
    sleeveDebugLine = base + pathHint;
  } else if (sleeveMeasuredDiffers && measuredSleeve != null) {
    sleeveDebugLine = `画面上（両端の縦差）${measuredSleeve.toFixed(1)}cm · ${hasPath ? "赤線＝計測区間" : "肩〜袖口"}`;
  } else {
    sleeveDebugLine = hasPath ? "赤線＝計測区間" : "肩〜袖口";
  }

  return (
    <>
      {hasPath ? (
        <path
          d={`M ${g.sleevePathPoints!.map(([x, y]) => `${x} ${y}`).join(" L ")}`}
          fill="none"
          stroke="#dc2626"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>
            袖丈 入力 {inputSleeve}cm
            {sleeveGeom != null
              ? ` · 実寸デバッグ 縦差 ${sleeveGeom.px}px → ${sleeveGeom.cm.toFixed(1)}cm`
              : measuredSleeve != null
                ? ` · 画面上 ${measuredSleeve.toFixed(1)}cm`
                : ""}
          </title>
        </path>
      ) : (
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={strokeColor} strokeWidth={2} strokeDasharray="4 3" opacity={0.8} />
      )}
      <circle cx={sx} cy={sy} r={6} fill={strokeColor} fillOpacity={0.9} stroke={fillColor} strokeWidth={2}>
        <title>袖丈 起点（肩）</title>
      </circle>
      <text x={sx - 4} y={sy - 10} fontSize={9} fill={fillColor} fontFamily="sans-serif" textAnchor="middle">
        肩
      </text>
      <circle cx={ex} cy={ey} r={6} fill={strokeColor} fillOpacity={0.9} stroke={fillColor} strokeWidth={2}>
        <title>袖丈 終点（袖口）</title>
      </circle>
      <text x={ex - 4} y={ey + 18} fontSize={9} fill={fillColor} fontFamily="sans-serif" textAnchor="middle">
        袖口
      </text>
      <line x1={sx} y1={sy} x2={slStart[0]} y2={slStart[1]} stroke={strokeColor} strokeWidth={2} opacity={0.7} />
      <line x1={ex} y1={ey} x2={slEnd[0]} y2={slEnd[1]} stroke={strokeColor} strokeWidth={2} opacity={0.7} />
      <line x1={slStart[0]} y1={slStart[1]} x2={slEnd[0]} y2={slEnd[1]} stroke={strokeColor} strokeWidth={2} strokeDasharray="6 4" />
      <path d={drawArrowDown(slEnd[0], slEnd[1])} fill={strokeColor} stroke={fillColor} strokeWidth={2} />
      <text x={slMidX + labelOffset} y={slMidY} fontSize={16} fontWeight="bold" fill={fillColor} fontFamily="sans-serif" dominantBaseline="middle">
        袖丈 {inputSleeve}cm（入力）
      </text>
      <text x={slMidX + labelOffset} y={slMidY + 18} fontSize={10} fill="#64748b" fontFamily="sans-serif" dominantBaseline="middle">
        {sleeveDebugLine}
      </text>
    </>
  );
}
