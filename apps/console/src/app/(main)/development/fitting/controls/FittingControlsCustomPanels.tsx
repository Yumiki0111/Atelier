"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CustomGarmentData, JacketSize, ShirtSize, SizeMeasure } from "../lib/types";
import { cn } from "@/lib/utils";
import { DevPanelSection } from "./FittingControlsUI";
import {
  genericMeasureOnlyGradingActive,
  genericSymmetricTopCanvasSleeveSnapEligible,
  measureOriginalSleeveCmFromDesignPaths,
  resolveGenericGradingBodyLengthCmReference,
} from "../generic";
import { compareGenericSizePresetRow } from "../generic/genericDevDefaults";
import { logDevFitPipelineAfterSizePresetChange } from "@/lib/fitting-compute/fittingCanvasDevSizePresetDebug";
import { totalPathVertices } from "@/app/(main)/development/fitting/svgPath/globalVertexIndex";

/**
 * 初回プリセットで「入力着丈＝ベースライン」になりスケール 1 固定になるのを避ける。
 * 紫・legacy 換算・ランドマーク推定の順で分母を決め（`resolveGenericGradingBodyLengthCmReference` と同じ鎖）。
 */
function seedGradingBaselineLengthCm(
  pathDs: string[],
  lm: CustomGarmentData["landmarks"],
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  nextSize: SizeMeasure
): number {
  return resolveGenericGradingBodyLengthCmReference(pathDs, lm, { ...gt, gradingBaselineLengthCm: undefined }, nextSize);
}

/**
 * 初回シード時はデザイン上の袖丈（幾何）をベースラインにする。
 * `prevSleeve > 0` をそのまま返さない — プリセット選択前に入力済みの袖丈と一致させると
 * ベースライン＝現在サイズになり build 時グレードがスケール 1 になってしまう。
 */
function seedGradingBaselineSleeveCm(
  pathDs: string[],
  lm: CustomGarmentData["landmarks"],
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  _prevSleeve: number,
  nextSleeve: number,
  nextSize: SizeMeasure
): number {
  /** `bodyPxPerCm` は渡さない（分子・分母とも設計 path 系で整合）。キャンバスオーバーレイ用ではない。 */
  const m = measureOriginalSleeveCmFromDesignPaths(pathDs, gt, lm, nextSize);
  if (m != null && Number.isFinite(m.cm) && m.cm > 0.5) return m.cm;
  return nextSleeve;
}

function parseCmLocal(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function FittingControlsCustomPanels({
  customGarmentData,
  onCustomGarmentApply,
  height,
  weight,
  shirtSize,
  jacketSize,
}: {
  customGarmentData: CustomGarmentData;
  onCustomGarmentApply: (data: CustomGarmentData) => void;
  height: number;
  weight: number;
  shirtSize: ShirtSize;
  jacketSize: JacketSize;
}) {
  // サイズプリセット管理
  const [presetLabel, setPresetLabel] = useState("");
  const [presetLength, setPresetLength] = useState("");
  const [presetSleeve, setPresetSleeve] = useState("");
  const presetLabelRef = useRef<HTMLInputElement>(null);

  const storedFitPair = customGarmentData.genericSymmetricTop?.fitCompareVertexGlobalPair;
  const [fitCompareA, setFitCompareA] = useState("");
  const [fitCompareB, setFitCompareB] = useState("");
  useEffect(() => {
    if (storedFitPair) {
      setFitCompareA(String(storedFitPair[0]));
      setFitCompareB(String(storedFitPair[1]));
    } else {
      setFitCompareA("");
      setFitCompareB("");
    }
  }, [storedFitPair?.[0], storedFitPair?.[1]]);

  const applyFitComparePair = () => {
    const gt = customGarmentData.genericSymmetricTop;
    if (customGarmentData.presetId !== "genericSymmetricTop" || gt == null) return;
    const a = Number.parseInt(fitCompareA.trim(), 10);
    const b = Number.parseInt(fitCompareB.trim(), 10);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    const n = totalPathVertices(customGarmentData.pathDs);
    if (a < 0 || b < 0 || a >= n || b >= n || a === b) return;
    onCustomGarmentApply({
      ...customGarmentData,
      genericSymmetricTop: {
        ...gt,
        fitCompareVertexGlobalPair: [a, b],
      },
    });
  };

  const clearFitComparePair = () => {
    const gt = customGarmentData.genericSymmetricTop;
    if (customGarmentData.presetId !== "genericSymmetricTop" || gt == null) return;
    const nextGt = { ...gt };
    delete nextGt.fitCompareVertexGlobalPair;
    onCustomGarmentApply({
      ...customGarmentData,
      genericSymmetricTop: nextGt,
    });
    setFitCompareA("");
    setFitCompareB("");
  };

  const sizePresets = customGarmentData.genericSymmetricTop?.sizePresets ?? [];
  const isGenericTop = customGarmentData.presetId === "genericSymmetricTop";
  const gt = customGarmentData.genericSymmetricTop;
  const measureGradingReady = isGenericTop && genericMeasureOnlyGradingActive(gt);
  const canvasSleeveSnapEligible = isGenericTop && genericSymmetricTopCanvasSleeveSnapEligible(gt);

  const normalizedSizePresets = useMemo(
    () =>
      [...sizePresets]
        .map((p) => ({ label: p.label, length: p.length, sleeve: p.sleeve }))
        .sort(compareGenericSizePresetRow),
    [sizePresets]
  );

  const sameSizePresetRow = (
    a: { label: string; length: number; sleeve: number },
    b: { label: string; length: number; sleeve: number }
  ) => a.label === b.label && a.length === b.length && a.sleeve === b.sleeve;

  const activatePreset = (preset: { label: string; length: number; sleeve: number }) => {
    const prev = customGarmentData.size;
    const gt = customGarmentData.genericSymmetricTop;
    const needLenBaseline =
      gt != null &&
      (gt.gradingBaselineLengthCm == null ||
        !Number.isFinite(gt.gradingBaselineLengthCm) ||
        gt.gradingBaselineLengthCm <= 0);
    const needSlvBaseline =
      gt != null &&
      (gt.gradingBaselineSleeveCm == null ||
        !Number.isFinite(gt.gradingBaselineSleeveCm) ||
        gt.gradingBaselineSleeveCm <= 0);
    const nextSize: SizeMeasure = {
      ...customGarmentData.size,
      length: preset.length,
      sleeve: preset.sleeve,
    };
    const nextData: CustomGarmentData = {
      ...customGarmentData,
      size: nextSize,
      genericSymmetricTop: {
        ...(gt ?? {}),
        ...(needLenBaseline && gt != null
          ? { gradingBaselineLengthCm: seedGradingBaselineLengthCm(customGarmentData.pathDs, customGarmentData.landmarks, gt, nextSize) }
          : {}),
        ...(needSlvBaseline && gt != null
          ? {
              gradingBaselineSleeveCm: seedGradingBaselineSleeveCm(
                customGarmentData.pathDs,
                customGarmentData.landmarks,
                gt,
                prev.sleeve,
                preset.sleeve,
                nextSize
              ),
            }
          : {}),
      },
    };
    onCustomGarmentApply(nextData);
    void logDevFitPipelineAfterSizePresetChange({
      action: "activatePreset",
      height,
      weight,
      shirtSize,
      jacketSize,
      customGarmentData: nextData,
    });
  };

  const addPreset = () => {
    const len = parseCmLocal(presetLength);
    const slv = parseCmLocal(presetSleeve);
    if (len == null || slv == null) return;
    const label = presetLabel.trim() || String.fromCharCode(65 + sizePresets.length);
    const next = [...sizePresets, { label, length: len, sleeve: slv }].sort(compareGenericSizePresetRow);
    const prev = customGarmentData.size;
    const gt = customGarmentData.genericSymmetricTop;
    const needLenBaseline =
      gt != null &&
      (gt.gradingBaselineLengthCm == null ||
        !Number.isFinite(gt.gradingBaselineLengthCm) ||
        gt.gradingBaselineLengthCm <= 0);
    const needSlvBaseline =
      gt != null &&
      (gt.gradingBaselineSleeveCm == null ||
        !Number.isFinite(gt.gradingBaselineSleeveCm) ||
        gt.gradingBaselineSleeveCm <= 0);
    const nextSize: SizeMeasure = { ...customGarmentData.size, length: len, sleeve: slv };
    const nextData: CustomGarmentData = {
      ...customGarmentData,
      size: nextSize,
      genericSymmetricTop: {
        ...(gt ?? {}),
        sizePresets: next,
        ...(needLenBaseline && gt != null
          ? { gradingBaselineLengthCm: seedGradingBaselineLengthCm(customGarmentData.pathDs, customGarmentData.landmarks, gt, nextSize) }
          : {}),
        ...(needSlvBaseline && gt != null
          ? {
              gradingBaselineSleeveCm: seedGradingBaselineSleeveCm(
                customGarmentData.pathDs,
                customGarmentData.landmarks,
                gt,
                prev.sleeve,
                slv,
                nextSize
              ),
            }
          : {}),
      },
    };
    onCustomGarmentApply(nextData);
    void logDevFitPipelineAfterSizePresetChange({
      action: "addPreset",
      height,
      weight,
      shirtSize,
      jacketSize,
      customGarmentData: nextData,
    });
    setPresetLabel("");
    setPresetLength("");
    setPresetSleeve("");
    presetLabelRef.current?.focus();
  };

  const deletePreset = (target: { label: string; length: number; sleeve: number }) => {
    const next = sizePresets.filter((p) => !sameSizePresetRow(p, target));
    onCustomGarmentApply({
      ...customGarmentData,
      genericSymmetricTop: {
        ...(customGarmentData.genericSymmetricTop ?? {}),
        sizePresets: next.length > 0 ? next.sort(compareGenericSizePresetRow) : undefined,
      },
    });
  };

  return (
    <>
      {isGenericTop && (
        <DevPanelSection title="サイズプリセット">
          {measureGradingReady && (
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              軽量グレーディング有効（build 時の胴／袖スケール。ベースライン＋採寸区間が揃った軸のみ）。
              初回プリセット追加時は、着丈ベースラインを紫・ランドマーク推定から取り、入力との差で胴が伸縮します。
              {canvasSleeveSnapEligible ? (
                <span className="mt-2 block text-muted-foreground">
                  キャンバス袖スナップ（着丈メッシュ後）も採寸頂点により有効。
                </span>
              ) : (
                <span className="mt-2 block text-destructive">
                  袖のキャンバス補正はプライマリ／ミラー袖の採寸頂点が必要です。
                </span>
              )}
            </p>
          )}
          {!measureGradingReady && canvasSleeveSnapEligible && (
            <p className="mt-2 text-[10px] leading-snug text-foreground">
              ベースライン未設定のため build 時グレードは限定的ですが、採寸頂点がありキャンバス上で袖丈を入力値へ寄せることがあります。
            </p>
          )}
          {!measureGradingReady && !canvasSleeveSnapEligible && (
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              連結頂点だけでは形は変えません。下のプリセットで着丈・袖丈を選ぶと、区間に合わせて軽量グレーディングが有効になります。
            </p>
          )}
          {normalizedSizePresets.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {normalizedSizePresets.map((preset, rowIdx) => {
                const isActive =
                  customGarmentData.size.length === preset.length &&
                  customGarmentData.size.sleeve === preset.sleeve;
                /** ラベル＋寸法が重複しても行が潰れないようインデックスを含める */
                const rowKey = `${rowIdx}:${preset.label}:${preset.length}:${preset.sleeve}`;
                return (
                  <div key={rowKey} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => activatePreset(preset)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-left text-[11px] font-bold transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      <span className="font-mono">{preset.label}</span>
                      <span className="ml-2 font-normal text-[10px] opacity-80">
                        着丈 {preset.length}cm / 袖丈 {preset.sleeve}cm
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePreset(preset)}
                      className="shrink-0 rounded-md px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      aria-label={`${preset.label}を削除`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-2 rounded-md bg-muted/60 p-2">
            <p className="mb-1.5 text-[9px] font-semibold text-muted-foreground">新規プリセット追加</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                ref={presetLabelRef}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-[11px] outline-none ring-0 focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={`${String.fromCharCode(65 + sizePresets.length)}（名前）`}
                value={presetLabel}
                onChange={(e) => setPresetLabel(e.target.value)}
                maxLength={8}
              />
              <input
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-[11px] outline-none ring-0 focus-visible:ring-2 focus-visible:ring-ring"
                inputMode="decimal"
                placeholder="着丈"
                value={presetLength}
                onChange={(e) => setPresetLength(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addPreset(); }}
              />
              <input
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-[11px] outline-none ring-0 focus-visible:ring-2 focus-visible:ring-ring"
                inputMode="decimal"
                placeholder="袖丈"
                value={presetSleeve}
                onChange={(e) => setPresetSleeve(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addPreset(); }}
              />
              <button
                type="button"
                onClick={addPreset}
                disabled={parseCmLocal(presetLength) == null || parseCmLocal(presetSleeve) == null}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors sm:col-span-1",
                  parseCmLocal(presetLength) != null &&
                    parseCmLocal(presetSleeve) != null
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                追加
              </button>
            </div>
          </div>
        </DevPanelSection>
      )}
      {isGenericTop && (
        <DevPanelSection title="ウィジェット体型（服 # 2点）">
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
            服プロットの連結 # を2つ指定。ワープ後の2点間の長さ（cm）と、くびれ参照弦（モデルプロットの紫・体重で変わる）を比べて小さめ／おすすめ／大きめを出します。未指定時は身幅×2と弦の差にフォールバックします。
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-0.5 text-[9px] font-semibold text-muted-foreground">
              左 #
              <input
                className="w-20 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-[11px] outline-none ring-0 focus-visible:ring-2 focus-visible:ring-ring"
                inputMode="numeric"
                value={fitCompareA}
                onChange={(e) => setFitCompareA(e.target.value)}
                placeholder="例 120"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-[9px] font-semibold text-muted-foreground">
              右 #
              <input
                className="w-20 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-[11px] outline-none ring-0 focus-visible:ring-2 focus-visible:ring-ring"
                inputMode="numeric"
                value={fitCompareB}
                onChange={(e) => setFitCompareB(e.target.value)}
                placeholder="例 350"
              />
            </label>
            <button
              type="button"
              onClick={applyFitComparePair}
              className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              保存
            </button>
            <button
              type="button"
              onClick={clearFitComparePair}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-[10px] text-muted-foreground hover:bg-muted"
            >
              クリア
            </button>
          </div>
        </DevPanelSection>
      )}
    </>
  );
}
