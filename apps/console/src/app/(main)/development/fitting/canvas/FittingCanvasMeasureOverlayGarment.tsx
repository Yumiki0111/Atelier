"use client";

/**
 * カスタム服の着丈オーバーレイ。
 * 主行の cm は `lengthGeomDebug`（メッシュ・スナップ後の紫区間と整合）。
 * 補助行は補正後の紫の縦 px・スライダー換算 cm・目標 px・Δ（矢印と同じ座標系）。
 */
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

  /** 紫線・矢印＝メッシュ・スナップ後の画面上（`lengthGeomDebug`）。 */
  const hemY = postScaleHemY;

  /** 矢印の長さと一致するのはメッシュ後の紫区間（`lengthGeomDebug`） */
  const onScreenLengthCm =
    geom != null && Number.isFinite(geom.cm)
      ? geom.cm
      : measuredLen != null && Number.isFinite(measuredLen)
        ? measuredLen
        : rawBefore != null && Number.isFinite(rawBefore.cmFromBodySlider)
          ? rawBefore.cmFromBodySlider
          : inputLen;
  const onScreenLengthLabel = Number.isFinite(onScreenLengthCm) ? onScreenLengthCm.toFixed(1) : "—";

  const lengthMeasureIsEditPreview = g.lengthMeasureIsEditPreview === true;
  /**
   * メッシュ適用時に内部で「補正前と画面上の着丈 cm」がずれていた場合に補助行を出す。
   * 補助行の数値は補正後（矢印と同じ）のみ。
   */
  const showLengthMeshBeforeDiag =
    rawBefore != null &&
    Number.isFinite(rawBefore.cmFromBodySlider) &&
    geom != null &&
    Number.isFinite(geom.cm) &&
    Math.abs(rawBefore.cmFromBodySlider - geom.cm) > 0.05;
  const bppc = g.bodyPxPerCm;
  const postLengthSliderCm =
    geom != null &&
    bppc != null &&
    Number.isFinite(bppc) &&
    bppc > 0 &&
    Number.isFinite(geom.px)
      ? geom.px / bppc
      : geom != null && Number.isFinite(geom.cm)
        ? geom.cm
        : null;
  const postLengthDeltaPx =
    geom != null &&
    rawBefore != null &&
    Number.isFinite(geom.px) &&
    Number.isFinite(rawBefore.targetLengthPx)
      ? Math.round(geom.px) - rawBefore.targetLengthPx
      : null;
  const showLengthInputVsScreen =
    Number.isFinite(onScreenLengthCm) && Math.abs(onScreenLengthCm - inputLen) > 0.05;

  const midLengthY = (lengthTopY + hemY) / 2;
  const lengthLabelX = lineLengthX + 24;
  let lengthYScreen: number;
  let lengthYMeshBefore: number | null = null;
  let lengthYInput: number | null = null;
  if (!showLengthMeshBeforeDiag && !showLengthInputVsScreen) {
    lengthYScreen = midLengthY;
  } else if (showLengthMeshBeforeDiag && showLengthInputVsScreen) {
    lengthYScreen = midLengthY - 22;
    lengthYMeshBefore = midLengthY + 2;
    lengthYInput = midLengthY + 26;
  } else {
    lengthYScreen = midLengthY - 10;
    lengthYMeshBefore = showLengthMeshBeforeDiag ? midLengthY + 12 : null;
    lengthYInput = showLengthInputVsScreen ? midLengthY + 12 : null;
  }
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
      <>
        <text
          x={lengthLabelX}
          y={lengthYScreen}
          fontSize={14}
          fontWeight="bold"
          fill="#6d28d9"
          fontFamily="sans-serif"
          dominantBaseline="middle"
        >
          <title>
            メッシュ後の紫区間の縦÷bodyPxPerCm。矢印の長さと一致する。
          </title>
          {`着丈 画面上 ${onScreenLengthLabel}cm${lengthMeasureIsEditPreview ? " · 編集プレビュー" : ""}`}
        </text>
        {lengthYMeshBefore != null &&
        rawBefore != null &&
        geom != null &&
        Number.isFinite(geom.px) &&
        postLengthSliderCm != null &&
        Number.isFinite(rawBefore.targetLengthPx) &&
        postLengthDeltaPx != null ? (
          <text
            x={lengthLabelX}
            y={lengthYMeshBefore}
            fontSize={12}
            fontWeight={600}
            fill="#64748b"
            fontFamily="sans-serif"
            dominantBaseline="middle"
          >
            <title>
              {`メッシュ・裾スナップ後の紫区間の縦（px）。cm は px÷bodyPxPerCm（${postLengthSliderCm.toFixed(1)}cm）。目標縦 ${rawBefore.targetLengthPx}px は size.length×bodyPxPerCm。Δ は実測−目標（矢印の長さと同じ座標系）。`}
            </title>
            {`補正後（紫区間） ${geom.px}px · ${postLengthSliderCm.toFixed(1)}cm（スライダー換算） · 目標縦 ${rawBefore.targetLengthPx}px · Δ ${postLengthDeltaPx >= 0 ? "+" : ""}${postLengthDeltaPx}px`}
          </text>
        ) : null}
        {lengthYInput != null ? (
          <text
            x={lengthLabelX}
            y={lengthYInput}
            fontSize={12}
            fontWeight={600}
            fill="#b91c1c"
            fontFamily="sans-serif"
            dominantBaseline="middle"
          >
            <title>サイズパネルの着丈（cm）。画面上と違う場合はメッシュ目標と実測の差。</title>
            {`入力 ${inputLen.toFixed(1)}cm`}
          </text>
        ) : null}
        {(inputLen < 40 || inputLen > 95) && measuredLen == null && !geom ? (
          <text
            x={lengthLabelX}
            y={lengthYScreen + 36}
            fontSize={10}
            fill="#b91c1c"
            fontFamily="sans-serif"
            dominantBaseline="middle"
          >
            （要確認）
          </text>
        ) : null}
      </>
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
