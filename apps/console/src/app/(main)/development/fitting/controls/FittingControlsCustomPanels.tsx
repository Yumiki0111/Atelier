"use client";

import { useRef, useState } from "react";
import type { CustomGarmentData, JacketSize, ShirtSize, SizeMeasure } from "../lib/types";
import { cn } from "@/lib/utils";
import { DevPanelSection } from "./FittingControlsUI";
import {
  genericMeasureOnlyGradingActive,
  genericSymmetricTopCanvasSleeveSnapEligible,
  measureOriginalSleeveCmFromDesignPaths,
  resolveGenericGradingBodyLengthCmReference,
} from "../generic";
import { logDevFitPipelineAfterSizePresetChange } from "@/lib/fitting-compute/fittingCanvasDevSizePresetDebug";

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

  const sizePresets = customGarmentData.genericSymmetricTop?.sizePresets ?? [];
  const isGenericTop = customGarmentData.presetId === "genericSymmetricTop";
  const gt = customGarmentData.genericSymmetricTop;
  const measureGradingReady = isGenericTop && genericMeasureOnlyGradingActive(gt);
  const canvasSleeveSnapEligible = isGenericTop && genericSymmetricTopCanvasSleeveSnapEligible(gt);

  const normalizedSizePresets = sizePresets.map((p) => ({
    label: p.label,
    length: p.length,
    sleeve: p.sleeve,
  }));

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
    const next = [...sizePresets, { label, length: len, sleeve: slv }];
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

  const deletePreset = (idx: number) => {
    const next = sizePresets.filter((_, i) => i !== idx);
    onCustomGarmentApply({
      ...customGarmentData,
      genericSymmetricTop: {
        ...customGarmentData.genericSymmetricTop,
        sizePresets: next.length > 0 ? next : undefined,
      },
    });
  };

  return (
    <>
      {isGenericTop && (
        <DevPanelSection title="サイズプリセット">
          {measureGradingReady && (
            <p className="mt-2 text-[10px] leading-snug text-slate-600">
              軽量グレーディング有効（build 時の胴／袖スケール。ベースライン＋採寸区間が揃った軸のみ）。
              初回プリセット追加時は、着丈ベースラインを紫・ランドマーク推定から取り、入力との差で胴が伸縮します。
              {canvasSleeveSnapEligible ? (
                <span className="mt-2 block text-slate-500">
                  キャンバス袖スナップ（着丈メッシュ後）も採寸頂点により有効。
                </span>
              ) : (
                <span className="mt-2 block text-amber-800/90">
                  袖のキャンバス補正はプライマリ／ミラー袖の採寸頂点が必要です。
                </span>
              )}
            </p>
          )}
          {!measureGradingReady && canvasSleeveSnapEligible && (
            <p className="mt-2 text-[10px] leading-snug text-sky-900">
              ベースライン未設定のため build 時グレードは限定的ですが、採寸頂点がありキャンバス上で袖丈を入力値へ寄せることがあります。
            </p>
          )}
          {!measureGradingReady && !canvasSleeveSnapEligible && (
            <p className="mt-2 text-[10px] leading-snug text-amber-700">
              連結頂点だけでは形は変えません。下のプリセットで着丈・袖丈を選ぶと、区間に合わせて軽量グレーディングが有効になります。
            </p>
          )}
          {normalizedSizePresets.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {normalizedSizePresets.map((preset, idx) => {
                const isActive =
                  customGarmentData.size.length === preset.length &&
                  customGarmentData.size.sleeve === preset.sleeve;
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => activatePreset(preset)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-left text-[11px] font-bold transition-colors",
                        isActive
                          ? "bg-sky-700 text-white"
                          : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80"
                      )}
                    >
                      <span className="font-mono">{preset.label}</span>
                      <span className="ml-2 font-normal text-[10px] opacity-80">
                        着丈 {preset.length}cm / 袖丈 {preset.sleeve}cm
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePreset(idx)}
                      className="shrink-0 rounded-md px-2 py-1.5 text-[10px] text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      aria-label={`${preset.label}を削除`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-2 rounded-md bg-slate-100/80 p-2">
            <p className="mb-1.5 text-[9px] font-semibold text-slate-500">新規プリセット追加</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                ref={presetLabelRef}
                className="w-full rounded-md bg-white px-2 py-1.5 font-mono text-[11px] outline-none ring-0 focus:ring-2 focus:ring-sky-400/30"
                placeholder={`${String.fromCharCode(65 + sizePresets.length)}（名前）`}
                value={presetLabel}
                onChange={(e) => setPresetLabel(e.target.value)}
                maxLength={8}
              />
              <input
                className="w-full rounded-md bg-white px-2 py-1.5 font-mono text-[11px] outline-none ring-0 focus:ring-2 focus:ring-sky-400/30"
                inputMode="decimal"
                placeholder="着丈"
                value={presetLength}
                onChange={(e) => setPresetLength(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addPreset(); }}
              />
              <input
                className="w-full rounded-md bg-white px-2 py-1.5 font-mono text-[11px] outline-none ring-0 focus:ring-2 focus:ring-sky-400/30"
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
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "cursor-not-allowed bg-slate-200 text-slate-500"
                )}
              >
                追加
              </button>
            </div>
          </div>
        </DevPanelSection>
      )}
    </>
  );
}
