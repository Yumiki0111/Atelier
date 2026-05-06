"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GARMENT_FLAT_CM_FITTING_COLORS } from "./garmentFlatCmGradingConstants";
import type { GarmentFlatCmGradingFittingCtx } from "./useGarmentFlatCmGradingFitting";
import { flatCmEqual, formatCmInputValue, parseCmInputDraft, clampGarmentCmKey, round1 } from "./garmentFlatCmGradingFittingMeasureFormat";

const { ink, rule, accent, muted } = GARMENT_FLAT_CM_FITTING_COLORS;

interface GarmentFlatCmGradingSidebarGarmentProps {
  ctx: GarmentFlatCmGradingFittingCtx;
}

export function GarmentFlatCmGradingSidebarGarment({ ctx }: GarmentFlatCmGradingSidebarGarmentProps) {
  const {
    presetsState,
    garmentCm,
    setGarmentCm,
    presetNameDraft,
    setPresetNameDraft,
    editingGarmentField,
    setEditingGarmentField,
    garmentFieldDraft,
    setGarmentFieldDraft,
    skipNextGarmentCmFieldBlurRef,
    activeGarmentCmFieldRef,
    applyUserPreset,
    deleteUserPreset,
    persistGarmentCm,
    overwriteActivePreset,
    loadGarmentCm,
  } = ctx;

  return (
    <div className="flex flex-col gap-4 pb-4 pt-1" style={{ color: ink }}>
      {/* 登録サイズ一覧 */}
      <div>
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: muted }}>
          登録サイズ（切替 · 上書き保存 · 削除 · 画面に即反映）
        </div>
        {presetsState && presetsState.userPresets.length > 0 ? (
          <div className="flex flex-col gap-1">
            {presetsState.userPresets.map((pr) => {
              const selected =
                presetsState.activeUserPresetId === pr.id && flatCmEqual(pr.cm, garmentCm);
              const cmSummary = [
                `肩 ${formatCmInputValue(pr.cm.shoulder)}`,
                `身 ${formatCmInputValue(pr.cm.bodyWidth)}`,
                `着 ${formatCmInputValue(pr.cm.bodyLength)}`,
                `袖 ${formatCmInputValue(pr.cm.sleeve)}`,
              ].join(" · ");
              return (
                <div key={pr.id} className="flex w-full max-w-full items-stretch gap-px">
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 flex-1 border px-2 py-2 text-left font-mono text-[11px] transition-colors",
                      selected ? "text-[#F5F3EF]" : ""
                    )}
                    style={{
                      borderColor: rule,
                      background: selected ? ink : "transparent",
                    }}
                    title={`${pr.name} — ${cmSummary} cm`}
                    disabled={!presetsState}
                    onMouseDown={() => {
                      if (activeGarmentCmFieldRef.current) skipNextGarmentCmFieldBlurRef.current = true;
                    }}
                    onClick={() => applyUserPreset(pr.id)}
                  >
                    <div className="truncate leading-tight">{pr.name}</div>
                    <div
                      className={cn(
                        "mt-0.5 truncate font-mono text-[9px] leading-snug",
                        selected ? "text-[#F5F3EF]/80" : "text-muted-foreground"
                      )}
                    >
                      {cmSummary}{" "}
                      <span className="tabular-nums">cm</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="flex shrink-0 items-center justify-center border px-2 py-2 font-mono text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                    style={{ borderColor: rule }}
                    title={`「${pr.name}」を削除`}
                    aria-label={`「${pr.name}」を削除`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (activeGarmentCmFieldRef.current) skipNextGarmentCmFieldBlurRef.current = true;
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteUserPreset(pr.id);
                    }}
                  >
                    <Trash2 className="size-3.5" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] leading-snug" style={{ color: muted }}>
            まだ登録がありません。「この寸法を登録（保存）」でここに並び、タップで切り替えできます。
          </p>
        )}
      </div>

      {/* 平置き cm 入力 */}
      <div>
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: muted }}>
          平置き（cm）
        </div>
        {(
          [
            ["肩幅（平置き）", "shoulder", "cm"],
            ["身幅（平置き）", "bodyWidth", "cm"],
            ["着丈（平置き）", "bodyLength", "cm"],
            ["袖丈（平置き・入力は絶対cm）", "sleeve", "cm"],
          ] as const
        ).map(([label, key, unit]) => (
          <label key={key} className="mb-2.5 block text-[11px]">
            <div className="mb-0.5 flex justify-between">
              <span>{label}</span>
              <span className="font-mono text-[10px]" style={{ color: accent }}>
                {garmentCm[key]} {unit}
              </span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={editingGarmentField === key ? garmentFieldDraft : formatCmInputValue(garmentCm[key])}
              placeholder={
                key === "shoulder"
                  ? "34–62"
                  : key === "bodyWidth"
                    ? "38–72"
                    : key === "bodyLength"
                      ? "54–92"
                      : "45–100"
              }
              className="w-full border bg-transparent px-1.5 py-1 font-mono text-[11px] outline-none focus:ring-1 focus:ring-foreground/20"
              style={{ borderColor: rule }}
              onFocus={() => {
                activeGarmentCmFieldRef.current = key;
                setEditingGarmentField(key);
                setGarmentFieldDraft(formatCmInputValue(garmentCm[key]));
              }}
              onChange={(e) => {
                const raw = e.target.value;
                setGarmentFieldDraft(raw);
                const n = parseCmInputDraft(raw);
                if (n !== null) {
                  setGarmentCm((prev) => ({
                    ...prev,
                    [key]: round1(clampGarmentCmKey(key, n)),
                  }));
                }
              }}
              onBlur={(e) => {
                if (editingGarmentField !== key) return;
                if (skipNextGarmentCmFieldBlurRef.current) {
                  skipNextGarmentCmFieldBlurRef.current = false;
                  activeGarmentCmFieldRef.current = null;
                  setEditingGarmentField(null);
                  return;
                }
                const raw = e.currentTarget.value;
                setGarmentCm((prev) => {
                  const n = parseCmInputDraft(raw);
                  const nextVal =
                    n !== null ? round1(clampGarmentCmKey(key, n)) : round1(prev[key]);
                  return { ...prev, [key]: nextVal };
                });
                activeGarmentCmFieldRef.current = null;
                setEditingGarmentField(null);
              }}
            />
          </label>
        ))}

        {/* サイズ名 & 保存ボタン群 */}
        <label className="mt-2 block text-[11px]">
          <div className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: muted }}>
            サイズ名（新規・選択中を上書きするとき共通）
          </div>
          <input
            type="text"
            value={presetNameDraft}
            placeholder={`サイズ${(presetsState?.userPresets.length ?? 0) + 1}`}
            autoComplete="off"
            className="w-full border bg-transparent px-1.5 py-1.5 font-mono text-[11px] outline-none focus:ring-1 focus:ring-foreground/20"
            style={{ borderColor: rule }}
            disabled={!presetsState}
            onChange={(e) => setPresetNameDraft(e.target.value)}
          />
        </label>
        <div className="mt-2 flex flex-col gap-1.5">
          <button
            type="button"
            className="border py-2 font-mono text-[10px]"
            style={{ borderColor: rule, background: "transparent", color: ink }}
            disabled={!presetsState?.activeUserPresetId}
            onMouseDown={() => {
              if (activeGarmentCmFieldRef.current) skipNextGarmentCmFieldBlurRef.current = true;
            }}
            onClick={overwriteActivePreset}
          >
            選択中の登録を上書き保存
          </button>
          <button
            type="button"
            className="border py-2 font-mono text-[10px]"
            style={{ borderColor: rule, background: ink, color: GARMENT_FLAT_CM_FITTING_COLORS.panel }}
            disabled={!presetsState}
            onClick={persistGarmentCm}
          >
            この寸法を登録（保存）
          </button>
          <button
            type="button"
            className="border py-2 font-mono text-[10px]"
            style={{ borderColor: rule, background: "transparent", color: ink }}
            onMouseDown={() => {
              if (activeGarmentCmFieldRef.current) skipNextGarmentCmFieldBlurRef.current = true;
            }}
            onClick={loadGarmentCm}
          >
            保存した寸法を読込
          </button>
        </div>
      </div>
    </div>
  );
}
