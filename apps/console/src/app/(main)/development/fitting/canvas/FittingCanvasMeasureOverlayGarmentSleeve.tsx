"use client";

import React, { type ReactNode } from "react";
import { resolveSleeveGeomDisplayCm } from "@/lib/fitting-compute/resolveSleeveGeomDisplayCm";
import type { MeasureOverlayData } from "../lib/types";
import {
  OFFSET_SLEEVE_NORMAL,
  drawArrowDown,
} from "./fittingCanvasMeasureOverlaySvg";

type GarmentG = NonNullable<MeasureOverlayData["garment"]>;

function isFinitePt(p: [number, number] | undefined): p is [number, number] {
  return p != null && Number.isFinite(p[0]) && Number.isFinite(p[1]);
}

function sleeveGeomKindLabel(kind: GarmentG["sleeveGeomMeasureKind"] | undefined): string {
  if (kind === "arc") return "弧長（チェーン・パイプラインと同じ）";
  return "幾何";
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
  sleeveMeasureDefinitionDebug,
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
  /** プライマリのみ DEBUG 時 */
  sleeveMeasureDefinitionDebug?: GarmentG["sleeveMeasureDefinitionDebug"];
}): ReactNode {
  const [sx, sy] = sleeveStart;
  const [ex, ey] = sleeveEnd;
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(ex) || !Number.isFinite(ey)) {
    return null;
  }
  const inputSleeve = g.size.sleeve;
  const sleeveGeom = sleeveGeomDebugOverride ?? g.sleeveGeomDebug;
  const rawBefore = sleeveGeomBeforeSleeveFixDebugOverride ?? g.sleeveGeomBeforeSleeveFixDebug;
  /** プライマリは `resolveSleeveGeomDisplayCm`、ミラーは override の幾何を優先 */
  const screenSleeveCm =
    sleeveGeomDebugOverride != null
      ? resolveSleeveGeomDisplayCm({ ...g, sleeveGeomDebug: sleeveGeomDebugOverride })
      : resolveSleeveGeomDisplayCm(g);
  const screenSleeveLabel = screenSleeveCm != null ? screenSleeveCm.toFixed(1) : "—";
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

  const geomKind = g.sleeveGeomMeasureKind;
  const geomKindShort = sleeveGeomKindLabel(geomKind);
  /** 採寸が単一 path に収まらず袖Yスケール未適用。幾何は設計のまま・入力は目標。 */
  const yScaleInactivePrimary = sideLabel === "プライマリ袖" && g.sleeveMeasureYScaleInactive === true;

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
              ? yScaleInactivePrimary
                ? `入力 ${inputSleeve}cm · 設計弧長 ${screenSleeveLabel}cm（袖Yスケール未適用） · ${geomKindShort} ${sleeveGeom?.px ?? "—"}px（チェーン）${previewNote}`
                : `入力値 ${inputSleeve}cm / 幾何数値 ${screenSleeveLabel}cm · ${geomKindShort} ${sleeveGeom?.px ?? "—"}px（チェーン）${previewNote}`
              : `入力値 ${inputSleeve}cm`}
            {pathHint}
          </title>
        </path>
      ) : (
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={strokeColor} strokeWidth={2} strokeDasharray="4 3" opacity={0.8}>
          <title>
            {`【${sideLabel}】`}
            {showSleeveGeomLabel
              ? yScaleInactivePrimary
                ? `入力 ${inputSleeve}cm · 設計弧長 ${screenSleeveLabel}cm（袖Yスケール未適用） · ${geomKindShort} ${sleeveGeom?.px ?? "—"}px（チェーン）${previewNote}`
                : `入力値 ${inputSleeve}cm / 幾何数値 ${screenSleeveLabel}cm · ${geomKindShort} ${sleeveGeom?.px ?? "—"}px（チェーン）${previewNote}`
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
              {yScaleInactivePrimary
                ? "設計弧長＝SVGチェーンのまま。入力袖丈は目標。袖Yスケールが無効なため一致しません。"
                : "幾何＝最終 canvas 上の袖チェーン（弧長÷袖pxPerCm。パイプラインと同一定義）。"}
            </title>
            {`【${sideLabel}】袖丈 ${yScaleInactivePrimary ? "設計弧長" : "幾何"} ${screenSleeveLabel}cm${yScaleInactivePrimary ? "（袖Yスケール未適用）" : ""}${redLineIsEditPreview ? " · 編集プレビュー" : ""}`}
          </text>
          <text x={slMidX + labelOffset} y={line2Y} fontSize={12} fontWeight={600} fill="#64748b" fontFamily="sans-serif" dominantBaseline="middle">
            <title>
              袖スケール適用直前の canvas 上の袖チェーン（弧長・px/cm はパイプラインと同じ定義）。着丈メッシュ等の後は含む。
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
            {yScaleInactivePrimary
              ? "入力＝目標袖丈。設計弧長＝チェーンのまま（袖Yスケール無効のため入力に寄せていません）。"
              : "入力値＝サイズの袖丈。幾何数値＝canvas 上のチェーン弧長÷袖pxPerCm（汎用トップ・パイプライン後）。"}
          </title>
          {showSleeveGeomLabel
            ? yScaleInactivePrimary
              ? `【${sideLabel}】袖丈 入力 ${inputSleeve}cm · 設計弧長 ${screenSleeveLabel}cm（袖Yスケール未適用）${redLineIsEditPreview ? " · 編集プレビュー" : ""}`
              : `【${sideLabel}】袖丈 入力値 ${inputSleeve}cm / 幾何数値 ${screenSleeveLabel}cm${redLineIsEditPreview ? " · 編集プレビュー" : ""}`
            : `【${sideLabel}】袖丈 入力値 ${inputSleeve}cm`}
        </text>
      )}
      {sideLabel === "プライマリ袖" && sleeveMeasureDefinitionDebug != null ? (
        <text
          x={slMidX + labelOffset}
          y={line1Y + (rawVsPipelineDiffLabel != null ? 46 : 32)}
          fontSize={10}
          fontWeight={600}
          fill="#475569"
          fontFamily="ui-monospace, monospace"
          textAnchor="middle"
        >
          <title>
            {`措定 #${sleeveMeasureDefinitionDebug.gLo}–#${sleeveMeasureDefinitionDebug.gHi}${
              sleeveMeasureDefinitionDebug.chainGlobal != null && sleeveMeasureDefinitionDebug.chainGlobal.length >= 2
                ? ` · 連結 ${sleeveMeasureDefinitionDebug.chainGlobal.join(",")}`
                : ""
            } · px/cm ${sleeveMeasureDefinitionDebug.pxPerCm.toFixed(4)}`}
          </title>
          {`区間 #${sleeveMeasureDefinitionDebug.gLo}–#${sleeveMeasureDefinitionDebug.gHi}${
            sleeveMeasureDefinitionDebug.chainGlobal != null && sleeveMeasureDefinitionDebug.chainGlobal.length >= 2
              ? ` · ${sleeveMeasureDefinitionDebug.chainGlobal.join(",")}`
              : ""
          }`}
        </text>
      ) : null}
      {sideLabel === "プライマリ袖" && sleeveMeasureDefinitionDebug != null ? (
        Math.abs(
          sleeveMeasureDefinitionDebug.beforeSleeveFix.arcCm - sleeveMeasureDefinitionDebug.afterPipeline.arcCm
        ) < 0.05 ? (
          <text
            x={slMidX + labelOffset}
            y={line1Y + (rawVsPipelineDiffLabel != null ? 62 : 48)}
            fontSize={9}
            fontWeight={600}
            fill="#64748b"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
          >
            <title>袖Yスケールが効いていないか、前後で弧長が変わっていません（同一数値）。</title>
            {`弧長 ${sleeveMeasureDefinitionDebug.beforeSleeveFix.arcCm.toFixed(1)}cm（スケール未適用・前後同一）· 入力 ${sleeveMeasureDefinitionDebug.inputSleeveCm.toFixed(1)}cm`}
          </text>
        ) : (
          <>
            <text
              x={slMidX + labelOffset}
              y={line1Y + (rawVsPipelineDiffLabel != null ? 62 : 48)}
              fontSize={9}
              fontWeight={500}
              fill="#64748b"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
            >
              <title>
                袖丈パイプライン（applyGenericSleeveScaleAfterLengthMesh）適用前の同チェーン弧長。補正＝入力袖丈へ寄せる一連の幾何更新の前後比較。
              </title>
              {`補正前 弧長 ${sleeveMeasureDefinitionDebug.beforeSleeveFix.arcCm.toFixed(1)}cm`}
            </text>
            <text
              x={slMidX + labelOffset}
              y={line1Y + (rawVsPipelineDiffLabel != null ? 76 : 62)}
              fontSize={9}
              fontWeight={600}
              fill="#b91c1c"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
            >
              <title>
                袖丈パイプライン適用後の同チェーン弧長（1辺伸縮・下袖・残差ループ後）。表示の幾何数値と同一定義。
              </title>
              {`補正後 弧長 ${sleeveMeasureDefinitionDebug.afterPipeline.arcCm.toFixed(1)}cm · 入力 ${sleeveMeasureDefinitionDebug.inputSleeveCm.toFixed(1)}cm`}
            </text>
          </>
        )
      ) : null}
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
        sleeveMeasureDefinitionDebug={g.sleeveMeasureDefinitionDebug}
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
