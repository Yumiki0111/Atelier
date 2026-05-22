"use client";

import { forwardRef, useImperativeHandle } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import {
  GARMENT_FLAT_CM_FITTING_COLORS,
  GARMENT_FLAT_CM_PREVIEW_BG,
} from "./garmentFlatCmGradingConstants";
import {
  GARMENT_FLAT_CM_WEAR_DISPLAY_BODY,
  GARMENT_FLAT_CM_WEAR_DISPLAY_SHOULDER,
} from "./garmentFlatCmGradingMeasurements";
import { useGarmentFlatCmGradingFitting } from "./useGarmentFlatCmGradingFitting";
import { GarmentFlatCmGradingSidebarGarment } from "./GarmentFlatCmGradingSidebarGarment";
import { GarmentFlatCmGradingSidebarModel } from "./GarmentFlatCmGradingSidebarModel";
import { GarmentFlatCmGradingCanvas } from "./GarmentFlatCmGradingCanvas";
const { ink, rule, muted } = GARMENT_FLAT_CM_FITTING_COLORS;

export interface GarmentFlatCmGradingFittingProps {
  height: number;
  weight: number;
  onHeightChange: (cm: number) => void;
  onWeightChange: (kg: number) => void;
  className?: string;
}

export interface GarmentFlatCmGradingFittingHandle {
  /** 前面 SVG が未準備なら null */
  buildGarmentSpecForProductDb: () => CustomGarmentData | null;
}

export const GarmentFlatCmGradingFitting = forwardRef<
  GarmentFlatCmGradingFittingHandle,
  GarmentFlatCmGradingFittingProps
>(function GarmentFlatCmGradingFitting(
  { height, weight, onHeightChange, onWeightChange, className },
  ref
) {
  const ctx = useGarmentFlatCmGradingFitting(height, weight);

  useImperativeHandle(
    ref,
    () => ({ buildGarmentSpecForProductDb: ctx.buildGarmentSpec }),
    [ctx.buildGarmentSpec]
  );

  return (
    <div
      className={cn(
        "grid min-h-[min(100vh-12rem,640px)] w-full gap-0 overflow-hidden rounded-md border text-[#1A1A18] md:grid-cols-[272px_1fr] md:grid-rows-[auto_1fr]",
        className
      )}
      style={{ background: GARMENT_FLAT_CM_PREVIEW_BG, borderColor: rule }}
    >
      {/* ヘッダー */}
      <header
        className="flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b px-5 py-3.5 md:col-span-2"
        style={{ borderColor: rule }}
      >
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: ink }}>
          Garment 平置き cm
        </h2>
        <span className="min-w-0 font-mono text-[10px]" style={{ color: muted }}>
          平置きcm（4項目）→ px 換算 · 肩・身幅は着用見え補正 {GARMENT_FLAT_CM_WEAR_DISPLAY_SHOULDER} /{" "}
          {GARMENT_FLAT_CM_WEAR_DISPLAY_BODY}
        </span>
        <div
          className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px]"
          style={{ color: muted }}
        >
          <input
            ref={ctx.garmentSvgUploadRef}
            type="file"
            accept=".svg,image/svg+xml,text/svg+xml"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={ctx.onGarmentSvgFileChange}
          />
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 border border-transparent px-1 py-0.5 text-[10px] transition-colors hover:text-foreground disabled:opacity-40"
            style={{ color: muted }}
            disabled={!ctx.bundledAssetTexts}
            title="#rig にモデルと同じ 9 本のリグ。path id はトップス標準でなくても可（その場合は平置きcm のグレードが輪郭に掛からないことがあります）。背面試着で前面アートを流用する場合は背面 SVG は不要です。"
            onClick={() => ctx.garmentSvgUploadRef.current?.click()}
          >
            <Upload className="size-3.5" strokeWidth={2} aria-hidden />
            服SVG
          </button>
          <input
            ref={ctx.rearGarmentSvgUploadRef}
            type="file"
            accept=".svg,image/svg+xml,text/svg+xml"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={ctx.onRearGarmentSvgFileChange}
          />
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 border border-transparent px-1 py-0.5 text-[10px] transition-colors hover:text-foreground disabled:opacity-40"
            style={{ color: muted }}
            disabled={!ctx.bundledAssetTexts || !ctx.uploadedGarmentMarkup}
            title="背面用ガーメント（任意）。前面と同じリグ規約。未アップロードなら登録時も背面アートは省略可。"
            onClick={() => ctx.rearGarmentSvgUploadRef.current?.click()}
          >
            <Upload className="size-3.5" strokeWidth={2} aria-hidden />
            背面服SVG
            {ctx.uploadedRearGarmentMarkup ? (
              <span className="text-emerald-700" aria-hidden>
                ✓
              </span>
            ) : (
              <span className="opacity-60">（任意）</span>
            )}
          </button>
          <button
            type="button"
            className="inline-flex shrink-0 items-center border px-2 py-0.5 transition-colors hover:bg-muted disabled:opacity-40"
            style={{ borderColor: rule }}
            disabled={!ctx.bundledAssetTexts}
            title="アセットの標準ガーメントを読み込み、採寸を S 基準に戻す"
            onClick={ctx.loadBundledGarment}
          >
            標準ガーメント
          </button>
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px]"
            title="前面プレビューのレイヤ表示。リグはモデル（赤）と服（青）を別々に重ねられます。"
          >
            {(
              [
                ["showModelBody", "モデル", ctx.showModelBody, ctx.setShowModelBody],
                ["showGarment", "服", ctx.showGarment, ctx.setShowGarment],
                ["showModelRig", "モデルリグ", ctx.showModelRig, ctx.setShowModelRig],
                ["showGarmentRig", "服リグ", ctx.showGarmentRig, ctx.setShowGarmentRig],
              ] as const
            ).map(([key, label, checked, setter]) => (
              <label key={key} className="flex cursor-pointer select-none items-center gap-1">
                <input
                  type="checkbox"
                  className="size-3 accent-[#1A1A18] ring-offset-[#F5F3EF] focus-visible:ring-1 focus-visible:ring-[#1A1A18]/30"
                  checked={checked}
                  onChange={(e) => setter(e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </header>

      {/* サイドバー */}
      <aside
        className="flex max-h-[min(50vh,420px)] flex-col gap-0 overflow-y-auto overflow-x-hidden border-r p-4 md:max-h-none"
        style={{ borderColor: rule }}
      >
        <div className="mb-4 flex shrink-0 gap-0.5">
          {(
            [
              ["garment", "Garment"],
              ["model", "Model"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={cn(
                "flex-1 border py-1.5 font-mono text-[10px] transition-colors",
                ctx.tab === k ? "text-[#F5F3EF]" : "text-muted-foreground"
              )}
              style={{
                borderColor: rule,
                background: ctx.tab === k ? ink : "transparent",
              }}
              onClick={() => ctx.setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {ctx.tab === "garment" && <GarmentFlatCmGradingSidebarGarment ctx={ctx} />}
        {ctx.tab === "model" && (
          <GarmentFlatCmGradingSidebarModel
            height={height}
            weight={weight}
            onHeightChange={onHeightChange}
            onWeightChange={onWeightChange}
            bmi={ctx.bmi}
          />
        )}
      </aside>

      {/* キャンバス */}
      <GarmentFlatCmGradingCanvas ctx={ctx} />
    </div>
  );
});
