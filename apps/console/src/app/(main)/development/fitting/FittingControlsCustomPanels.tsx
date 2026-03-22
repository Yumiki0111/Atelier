"use client";

import { useRef, useState } from "react";
import type { CustomGarmentData, ShoulderDebug } from "./types";
import { cn } from "@/lib/utils";
import { DevPanelSection } from "./FittingControlsUI";
import { genericMeasureOnlyGradingActive } from "./generic";
import { parseIndex } from "./FittingControlsGenericUtils";

function parseCmLocal(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function FittingControlsCustomPanels({
  customGarmentData,
  shoulderDebug,
  onCustomGarmentApply,
}: {
  customGarmentData: CustomGarmentData;
  shoulderDebug: ShoulderDebug | null;
  onCustomGarmentApply: (data: CustomGarmentData) => void;
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

  const normalizedSizePresets = sizePresets.map((p) => ({
    label: p.label,
    length: p.length,
    sleeve: p.sleeve,
  }));

  const activatePreset = (preset: { label: string; length: number; sleeve: number }) => {
    onCustomGarmentApply({
      ...customGarmentData,
      size: {
        ...customGarmentData.size,
        length: preset.length,
        sleeve: preset.sleeve,
      },
    });
  };

  const addPreset = () => {
    const len = parseCmLocal(presetLength);
    const slv = parseCmLocal(presetSleeve);
    if (len == null || slv == null) return;
    const label = presetLabel.trim() || String.fromCharCode(65 + sizePresets.length);
    const next = [...sizePresets, { label, length: len, sleeve: slv }];
    onCustomGarmentApply({
      ...customGarmentData,
      size: { ...customGarmentData.size, length: len, sleeve: slv },
      genericSymmetricTop: { ...customGarmentData.genericSymmetricTop, sizePresets: next },
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
          {!measureGradingReady && (
            <p className="mt-2 text-[10px] leading-snug text-amber-700">
              「連結頂点 #（採寸・参考）」で袖丈・着丈の区間を入れると、プレースを保ったままサイズ表の着丈・袖丈に合わせて伸縮します。
            </p>
          )}
          {measureGradingReady && (
            <p className="mt-2 text-[10px] leading-snug text-slate-600">軽量グレーディング有効。</p>
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

      <DevPanelSection title="肩の頂点インデックス（連結）">
        <p className="text-[9px] leading-snug text-slate-500">肩Yをこの連結頂点で固定します。</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-2 rounded-md bg-slate-100/80 px-2 py-1.5 font-mono text-[11px]">
          <span className="font-sans text-[10px] font-medium text-slate-500">いま効いている基準</span>
          <span className="font-bold text-red-700">
            {customGarmentData && shoulderDebug?.garmentType === "custom" && shoulderDebug.shoulderPointIndex != null ? `索引 ${shoulderDebug.shoulderPointIndex}` : "—"}
          </span>
        </div>
        <>
          <label className="mt-2 flex flex-col gap-1 text-[10px]">
            <span className="font-medium text-slate-600">手入力で固定（任意）</span>
            <input
              className="rounded-md bg-slate-100/90 px-2 py-1.5 font-mono text-[11px] outline-none ring-0 focus:bg-white focus:ring-2 focus:ring-sky-400/30"
              inputMode="numeric"
              placeholder="空欄＝自動推定"
              value={customGarmentData.shoulderPointIndex !== undefined ? String(customGarmentData.shoulderPointIndex) : ""}
              onChange={(e) => {
                const v = parseIndex(e.target.value);
                const next: CustomGarmentData = { ...customGarmentData };
                if (v === undefined) {
                  delete next.shoulderPointIndex;
                } else {
                  next.shoulderPointIndex = v;
                }
                onCustomGarmentApply(next);
              }}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={shoulderDebug?.garmentType !== "custom" || shoulderDebug.shoulderPointIndex == null}
              onClick={() => {
                if (shoulderDebug?.garmentType !== "custom" || shoulderDebug.shoulderPointIndex == null) return;
                onCustomGarmentApply({
                  ...customGarmentData,
                  shoulderPointIndex: shoulderDebug.shoulderPointIndex,
                });
              }}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-colors",
                shoulderDebug?.garmentType === "custom" && shoulderDebug.shoulderPointIndex != null
                  ? "bg-sky-600 text-white hover:bg-sky-500"
                  : "cursor-not-allowed bg-slate-200 text-slate-500"
              )}
            >
              表示中の値を固定
            </button>
            <button
              type="button"
              disabled={customGarmentData.shoulderPointIndex === undefined}
              onClick={() => {
                const next = { ...customGarmentData };
                delete next.shoulderPointIndex;
                onCustomGarmentApply(next);
              }}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-colors",
                customGarmentData.shoulderPointIndex !== undefined
                  ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  : "cursor-not-allowed border border-transparent bg-slate-100 text-slate-400"
              )}
            >
              クリア（自動推定）
            </button>
          </div>
        </>
      </DevPanelSection>
    </>
  );
}
