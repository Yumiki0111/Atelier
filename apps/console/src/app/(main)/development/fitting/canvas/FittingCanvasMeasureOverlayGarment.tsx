"use client";

import React, { type ReactNode } from "react";
import type { MeasureOverlayData } from "../lib/types";
import {
  ARROW_INSET,
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
  const hemConnectorX = g.lengthGuideHem ? g.lengthGuideHem[0] : g.hemCenter[0];
  const lengthTopY = g.lengthMeasureTop ? g.lengthMeasureTop[1] : shoulderY;
  const lengthTopHorizX = g.lengthMeasureTop ? g.lengthMeasureTop[0] : midX;
  /** Y 再スケール後の hemY（メッシュ頂点の post-scale 座標） */
  const postScaleHemY = g.lengthGuideHem ? g.lengthGuideHem[1] : g.hemCenter[1];
  const lineShoulderY = shoulderY + OFFSET_SHOULDER_Y;
  const lineLengthX = midX + OFFSET_LENGTH_X;
  const slL = g.shoulderLeft[0];
  const slR = g.shoulderRight[0];

  const inputLen = g.size.length;
  const measuredLen = g.lengthMeasuredCm;
  const geom = g.lengthGeomDebug;
  const rawBefore = g.lengthGeomBeforeLengthMeshDebug;

  /**
   * 幾何の正＝補正前（Y 再スケール適用前のワープ後メッシュ縦÷bodyPxPerCm）。
   * Y スケールは lengthTopY を原点に適用されるため、pre-scale の hemY は逆算できる:
   *   preHemY = lengthTopY + rawBefore.px * sign(postScaleHemY - lengthTopY)
   * 矢印もこの pre-scale 座標を使うことで「数値 = 矢印の長さ」を保証する。
   */
  const hemY =
    rawBefore != null && Number.isFinite(rawBefore.px) && g.lengthMeasureTop != null
      ? lengthTopY + rawBefore.px * Math.sign(postScaleHemY - lengthTopY)
      : postScaleHemY;

  const screenLengthCm =
    rawBefore != null && Number.isFinite(rawBefore.cm)
      ? rawBefore.cm
      : geom != null && Number.isFinite(geom.cm)
        ? geom.cm
        : measuredLen != null && Number.isFinite(measuredLen)
          ? measuredLen
          : inputLen;
  const screenLengthLabel = Number.isFinite(screenLengthCm) ? screenLengthCm.toFixed(1) : "—";

  /**
   * 入力値と幾何（補正前）が 0.05cm 以上ずれているとき 2 行目に入力値を表示。
   * 一致していれば 1 行で十分。
   */
  const lengthMeasureIsEditPreview = g.lengthMeasureIsEditPreview === true;
  const inputDiffLabel =
    Number.isFinite(screenLengthCm) && Math.abs(screenLengthCm - inputLen) > 0.05
      ? inputLen.toString()
      : null;
  const midLengthY = (lengthTopY + hemY) / 2;
  const lengthLabelX = lineLengthX + 24;
  /** tspan+dy は環境によって1行に潰れるため、2行目は別 <text> */
  const lengthLine1Y = inputDiffLabel != null ? midLengthY - 10 : midLengthY;
  const lengthLine2Y = inputDiffLabel != null ? midLengthY + 12 : null;
  return (
    <>
      {g.sizeLabel && (
        <text x={midX} y={lineShoulderY - 22} fontSize={13} fontWeight="bold" fill="#1e293b" fontFamily="sans-serif" textAnchor="middle">
          {g.sizeLabel}
        </text>
      )}
      <line x1={slL + ARROW_INSET} y1={lineShoulderY} x2={slR - ARROW_INSET} y2={lineShoulderY} stroke="#525252" strokeWidth={3} strokeDasharray="6 4" />
      <path d={drawArrowLeftSm(slL, lineShoulderY)} fill="#525252" stroke="#404040" strokeWidth={1.5} />
      <path d={drawArrowRightSm(slR, lineShoulderY)} fill="#525252" stroke="#404040" strokeWidth={1.5} />
      <text x={slL} y={lineShoulderY - 6} fontSize={11} fill="#404040" fontFamily="sans-serif" textAnchor="middle">
        ここから
      </text>
      <text x={slR} y={lineShoulderY - 6} fontSize={11} fill="#404040" fontFamily="sans-serif" textAnchor="middle">
        ここまで
      </text>
      <text x={midX} y={lineShoulderY + 26} fontSize={16} fontWeight="bold" fill="#404040" fontFamily="sans-serif" textAnchor="middle">
        肩幅 {g.size.shoulder}cm
      </text>
      <text x={midX} y={lineShoulderY + 44} fontSize={10} fill="#64748b" fontFamily="sans-serif" textAnchor="middle">
        服の肩縫い左端〜右端
      </text>
      <line x1={lengthTopHorizX} y1={lengthTopY} x2={lineLengthX} y2={lengthTopY} stroke="#7c3aed" strokeWidth={2} opacity={0.9} />
      <line x1={hemConnectorX} y1={hemY} x2={lineLengthX} y2={hemY} stroke="#7c3aed" strokeWidth={2} opacity={0.9} />
      <line x1={lineLengthX} y1={lengthTopY} x2={lineLengthX} y2={hemY} stroke="#7c3aed" strokeWidth={4} strokeDasharray="6 4" />
      <path d={drawArrowDown(lineLengthX, hemY)} fill="#7c3aed" stroke="#6d28d9" strokeWidth={2} />
      {inputDiffLabel != null && lengthLine2Y != null ? (
        <>
          <text
            x={lengthLabelX}
            y={lengthLine1Y}
            fontSize={14}
            fontWeight="bold"
            fill="#6d28d9"
            fontFamily="sans-serif"
            dominantBaseline="middle"
          >
            <title>
              幾何＝Y 再スケール前（ワープ直後）のメッシュ紫区間縦÷bodyPxPerCm。矢印も同じ補正前座標。
            </title>
            {`着丈 幾何 ${screenLengthLabel}cm`}
          </text>
          <text
            x={lengthLabelX}
            y={lengthLine2Y}
            fontSize={12}
            fontWeight={600}
            fill="#b91c1c"
            fontFamily="sans-serif"
            dominantBaseline="middle"
          >
            <title>
              入力着丈。幾何と一致していない場合はワープ（着丈メッシュ前）の段階で歪みが生じています。
            </title>
            {`入力 ${inputDiffLabel}cm`}
          </text>
        </>
      ) : (
        <text
          x={lengthLabelX}
          y={midLengthY}
          fontSize={14}
          fontWeight="bold"
          fill="#6d28d9"
          fontFamily="sans-serif"
          dominantBaseline="middle"
        >
          <title>
            {lengthMeasureIsEditPreview
              ? "編集中プレビュー: 幾何数値は確定した着丈頂点区間（gt）基準。プロットのハイライトと異なる場合があります。"
              : "幾何＝Y 再スケール前（ワープ直後）のメッシュ紫区間縦÷bodyPxPerCm。矢印も同じ座標で一致。"}
          </title>
          {`着丈 幾何 ${screenLengthLabel}cm${lengthMeasureIsEditPreview ? " · 編集プレビュー" : ""}`}
          {(inputLen < 40 || inputLen > 95) && measuredLen == null && !geom && (
            <tspan fontSize={10} fill="#b91c1c">
              {" "}
              （要確認）
            </tspan>
          )}
        </text>
      )}
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
