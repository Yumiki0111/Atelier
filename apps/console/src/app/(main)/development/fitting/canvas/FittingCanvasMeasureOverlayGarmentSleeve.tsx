"use client";

import React, { type ReactNode } from "react";
import type { MeasureOverlayData } from "../lib/types";
import {
  OFFSET_SLEEVE_NORMAL,
  drawArrowDown,
} from "./fittingCanvasMeasureOverlaySvg";

type GarmentG = NonNullable<MeasureOverlayData["garment"]>;

function isFinitePt(p: [number, number] | undefined): p is [number, number] {
  return p != null && Number.isFinite(p[0]) && Number.isFinite(p[1]);
}

function SleeveMeasureBlock({
  g,
  sleeveStart,
  sleeveEnd,
  sleevePathPoints,
  sideLabel,
  sleeveGeomDebugOverride,
  sleeveGeomBeforeSleeveFixDebugOverride,
  redLineIsEditPreviewOverride,
}: {
  g: GarmentG;
  sleeveStart: [number, number];
  sleeveEnd: [number, number];
  sleevePathPoints?: [number, number][];
  /** 採寸オーバーレイ上の区別（プライマリ袖 / ミラー袖） */
  sideLabel: string;
  /** ミラー袖: プライマリと同じ定義で `g` とは別 path の幾何値 */
  sleeveGeomDebugOverride?: { px: number; cm: number };
  sleeveGeomBeforeSleeveFixDebugOverride?: { px: number; cm: number };
  /** ミラー袖用。未指定時は `g.sleeveMeasureRedLineIsEditPreview` */
  redLineIsEditPreviewOverride?: boolean;
}): ReactNode {
  const [sx, sy] = sleeveStart;
  const [ex, ey] = sleeveEnd;
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(ex) || !Number.isFinite(ey)) {
    return null;
  }
  const inputSleeve = g.size.sleeve;
  const measuredSleeve = g.sleeveMeasuredCm;
  const sleeveGeom = sleeveGeomDebugOverride ?? g.sleeveGeomDebug;
  const rawBefore = sleeveGeomBeforeSleeveFixDebugOverride ?? g.sleeveGeomBeforeSleeveFixDebug;
  /** メインの「幾何」は canvas 上の path と一致するパイプライン後。設計時（rawBefore）は補正前のため優先しない */
  const screenSleeveCm =
    sleeveGeom != null && Number.isFinite(sleeveGeom.cm)
      ? sleeveGeom.cm
      : measuredSleeve != null && Number.isFinite(measuredSleeve)
        ? measuredSleeve
        : rawBefore != null && Number.isFinite(rawBefore.cm)
          ? rawBefore.cm
          : inputSleeve;
  const screenSleeveLabel = Number.isFinite(screenSleeveCm) ? screenSleeveCm.toFixed(1) : "—";
  /** 設計時（補正前）とパイプライン後がずれるときだけ追加行を出す */
  const rawVsPipelineDiffLabel =
    rawBefore != null &&
    sleeveGeom != null &&
    Number.isFinite(rawBefore.cm) &&
    Number.isFinite(sleeveGeom.cm) &&
    Math.abs(rawBefore.cm - sleeveGeom.cm) > 0.05
      ? rawBefore.cm.toFixed(1)
      : null;
  const finitePathPoints =
    sleevePathPoints?.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)) ?? [];
  const hasPath = finitePathPoints.length >= 2;
  const showSleeveGeomLabel = sleeveGeom != null || rawBefore != null;
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
  const line1Y = rawVsPipelineDiffLabel != null ? slMidY - 18 : slMidY;
  const line2Y = rawVsPipelineDiffLabel != null ? slMidY + 2 : null;
  const line3Y = rawVsPipelineDiffLabel != null ? slMidY + 22 : null;
  const strokeColor = hasPath ? "#dc2626" : "#c026d3";
  const fillColor = hasPath ? "#b91c1c" : "#a21caf";
  const pathHint = hasPath ? " · 赤線＝選択チェーンの頂点列" : " · 肩〜袖口";
  const redLineIsEditPreview =
    redLineIsEditPreviewOverride ?? g.sleeveMeasureRedLineIsEditPreview === true;
  const previewNote = redLineIsEditPreview
    ? " · 編集中プレビュー（幾何数値は確定チェーン基準）"
    : "";

  return (
    <g data-sleeve-side={sideLabel}>
      {hasPath ? (
        <path
          d={`M ${finitePathPoints.map(([x, y]) => `${x} ${y}`).join(" L ")}`}
          fill="none"
          stroke="#dc2626"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>
            {`【${sideLabel}】`}
            {showSleeveGeomLabel
              ? `入力値 ${inputSleeve}cm / 幾何数値 ${screenSleeveLabel}cm · 縦|Δy|合算 ${sleeveGeom?.px ?? "—"}px（チェーン全体）${previewNote}`
              : `入力値 ${inputSleeve}cm`}
            {pathHint}
          </title>
        </path>
      ) : (
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={strokeColor} strokeWidth={2} strokeDasharray="4 3" opacity={0.8}>
          <title>
            {`【${sideLabel}】`}
            {showSleeveGeomLabel
              ? `入力値 ${inputSleeve}cm / 幾何数値 ${screenSleeveLabel}cm · 縦|Δy|合算 ${sleeveGeom?.px ?? "—"}px（チェーン全体）${previewNote}`
              : `入力値 ${inputSleeve}cm`}
            {pathHint}
          </title>
        </line>
      )}
      <circle cx={sx} cy={sy} r={6} fill={strokeColor} fillOpacity={0.9} stroke={fillColor} strokeWidth={2}>
        <title>{`【${sideLabel}】袖丈 起点`}</title>
      </circle>
      <text x={sx - 4} y={sy - 10} fontSize={9} fill={fillColor} fontFamily="sans-serif" textAnchor="middle">
        肩
      </text>
      <circle cx={ex} cy={ey} r={6} fill={strokeColor} fillOpacity={0.9} stroke={fillColor} strokeWidth={2}>
        <title>{`【${sideLabel}】袖丈 終点（袖口）`}</title>
      </circle>
      <text x={ex - 4} y={ey + 18} fontSize={9} fill={fillColor} fontFamily="sans-serif" textAnchor="middle">
        袖口
      </text>
      <line x1={sx} y1={sy} x2={slStart[0]} y2={slStart[1]} stroke={strokeColor} strokeWidth={2} opacity={0.7} />
      <line x1={ex} y1={ey} x2={slEnd[0]} y2={slEnd[1]} stroke={strokeColor} strokeWidth={2} opacity={0.7} />
      <line x1={slStart[0]} y1={slStart[1]} x2={slEnd[0]} y2={slEnd[1]} stroke={strokeColor} strokeWidth={2} strokeDasharray="6 4" />
      <path d={drawArrowDown(slEnd[0], slEnd[1])} fill={strokeColor} stroke={fillColor} strokeWidth={2} />
      {rawVsPipelineDiffLabel != null && line2Y != null && line3Y != null ? (
        <>
          <text x={slMidX + labelOffset} y={line1Y} fontSize={14} fontWeight="bold" fill={fillColor} fontFamily="sans-serif" dominantBaseline="middle">
            <title>
              幾何＝最終 canvas 上の袖チェーン（縦|Δy|合算÷pxPerCm）。パイプライン後の数値。入力袖丈に再スケールしたあとの値。
            </title>
            {`【${sideLabel}】袖丈 幾何 ${screenSleeveLabel}cm${redLineIsEditPreview ? " · 編集プレビュー" : ""}`}
          </text>
          <text x={slMidX + labelOffset} y={line2Y} fontSize={12} fontWeight={600} fill="#64748b" fontFamily="sans-serif" dominantBaseline="middle">
            <title>
              アップロードした design path のみ（胴グレード・プレース・袖スケール・袖口補正の前）の袖チェーンを model 換算した cm。現在の見た目の「幾何」とは別物。
            </title>
            {`設計時（補正前） ${rawVsPipelineDiffLabel}cm`}
          </text>
          <text x={slMidX + labelOffset} y={line3Y} fontSize={12} fontWeight={600} fill="#b91c1c" fontFamily="sans-serif" dominantBaseline="middle">
            <title>サイズパネルの袖丈（cm）。幾何と一致しない場合は px/cm または袖口補正の残差。</title>
            {`入力 ${Number.isFinite(inputSleeve) ? inputSleeve.toFixed(1) : "—"}cm`}
          </text>
        </>
      ) : (
        <text x={slMidX + labelOffset} y={line1Y} fontSize={14} fontWeight="bold" fill={fillColor} fontFamily="sans-serif" dominantBaseline="middle">
          <title>
            入力値＝サイズの袖丈。幾何数値＝canvas 上のチェーン縦|Δy|÷pxPerCm（パイプライン後）。
          </title>
          {showSleeveGeomLabel
            ? `【${sideLabel}】袖丈 入力値 ${inputSleeve}cm / 幾何数値 ${screenSleeveLabel}cm${redLineIsEditPreview ? " · 編集プレビュー" : ""}`
            : `【${sideLabel}】袖丈 入力値 ${inputSleeve}cm`}
        </text>
      )}
    </g>
  );
}

export function FittingCanvasMeasureOverlayGarmentSleeve({ g }: { g: GarmentG }): ReactNode {
  if (!isFinitePt(g.sleeveStart) || !isFinitePt(g.sleeveEnd)) return null;

  const hasMirror =
    g.sleevePathPointsRight != null &&
    g.sleevePathPointsRight.length >= 2 &&
    isFinitePt(g.sleeveStartRight) &&
    isFinitePt(g.sleeveEndRight);

  return (
    <>
      <SleeveMeasureBlock
        g={g}
        sleeveStart={g.sleeveStart}
        sleeveEnd={g.sleeveEnd}
        sleevePathPoints={g.sleevePathPoints}
        sideLabel="プライマリ袖"
      />
      {hasMirror ? (
        <SleeveMeasureBlock
          g={g}
          sleeveStart={g.sleeveStartRight!}
          sleeveEnd={g.sleeveEndRight!}
          sleevePathPoints={g.sleevePathPointsRight}
          sideLabel="ミラー袖"
          sleeveGeomDebugOverride={g.sleeveGeomDebugRight}
          sleeveGeomBeforeSleeveFixDebugOverride={g.sleeveGeomBeforeSleeveFixDebugRight}
          redLineIsEditPreviewOverride={false}
        />
      ) : null}
    </>
  );
}
