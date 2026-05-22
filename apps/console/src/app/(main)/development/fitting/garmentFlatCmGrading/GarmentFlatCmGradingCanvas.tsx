"use client";

import { useCallback, useState, type DragEvent } from "react";
import { toast } from "sonner";
import {
  GARMENT_FLAT_CM_FITTING_COLORS,
  GARMENT_FLAT_CM_VIEWBOX,
  GARMENT_FLAT_CM_PREVIEW_BG,
} from "./garmentFlatCmGradingConstants";
import { GarmentFlatCmGradingFittingFitSnapSvg } from "./garmentFlatCmGradingFittingFitSnapSvg";
import type { GarmentFlatCmGradingFittingCtx } from "./useGarmentFlatCmGradingFitting";

const { ink, rule, muted, accent, panel } = GARMENT_FLAT_CM_FITTING_COLORS;

interface GarmentFlatCmGradingCanvasProps {
  ctx: GarmentFlatCmGradingFittingCtx;
}

function isLikelySvgFile(file: File): boolean {
  const name = file.name?.toLowerCase() ?? "";
  const t = file.type;
  return (
    t === "image/svg+xml" || t === "text/svg+xml" || t === "text/xml" || t === "text/plain" || name.endsWith(".svg")
  );
}

export function GarmentFlatCmGradingCanvas({ ctx }: GarmentFlatCmGradingCanvasProps) {
  const {
    fitSnapFront,
    fitSnapBack,
    showModelBody,
    showGarment,
    showModelRig,
    showGarmentRig,
    loadError,
    bundledAssetTexts,
    overlay,
    garmentFrontSvgRef,
    garmentBackSvgRef,
    uploadedGarmentMarkup,
    applyGarmentSvgText,
    applyRearGarmentSvgText,
  } = ctx;

  const [dragTarget, setDragTarget] = useState<"front" | "rear" | null>(null);

  const canDropFront = Boolean(bundledAssetTexts);
  const canDropRear = Boolean(bundledAssetTexts && uploadedGarmentMarkup != null);

  const onDragOver = useCallback(
    (zone: "front" | "rear") => (e: DragEvent<HTMLDivElement>) => {
      const allowed = zone === "front" ? canDropFront : canDropRear;
      if (!allowed) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragTarget(zone);
    },
    [canDropFront, canDropRear]
  );

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    const next = e.relatedTarget instanceof Node ? !e.currentTarget.contains(e.relatedTarget) : true;
    if (next) setDragTarget(null);
  }, []);

  const onDropFront = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragTarget(null);
      if (!canDropFront) return;
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (!isLikelySvgFile(file)) {
        toast.error("SVG ファイルをドロップしてください");
        return;
      }
      try {
        applyGarmentSvgText(await file.text());
      } catch {
        toast.error("ファイルの読み込みに失敗しました");
      }
    },
    [applyGarmentSvgText, canDropFront]
  );

  const onDropRear = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragTarget(null);
      if (!canDropRear) {
        toast.error("先に前面の服SVGを読み込んでください（標準ガーメントまたは左パネルへドロップ）。");
        return;
      }
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (!isLikelySvgFile(file)) {
        toast.error("SVG ファイルをドロップしてください");
        return;
      }
      try {
        applyRearGarmentSvgText(await file.text());
      } catch {
        toast.error("ファイルの読み込みに失敗しました");
      }
    },
    [applyRearGarmentSvgText, canDropRear]
  );

  return (
    <main className="relative flex items-center justify-center p-6 md:min-h-[480px]">
      {loadError && (
        <p className="absolute left-3 top-3 max-w-md text-xs text-destructive">
          平置き cm テンプレ SVG の読み込みに失敗しました: {loadError}
        </p>
      )}
      {!bundledAssetTexts && !loadError && (
        <p className="text-xs text-muted-foreground">アセットを読み込み中…</p>
      )}

      <svg
        ref={garmentBackSvgRef}
        aria-hidden
        className="pointer-events-none absolute size-0 overflow-hidden opacity-0"
        viewBox={GARMENT_FLAT_CM_VIEWBOX}
        xmlns="http://www.w3.org/2000/svg"
      />
      <svg
        ref={garmentFrontSvgRef}
        aria-hidden
        className="pointer-events-none absolute size-0 overflow-hidden opacity-0"
        viewBox={GARMENT_FLAT_CM_VIEWBOX}
        xmlns="http://www.w3.org/2000/svg"
      />

      <div className="relative w-full max-w-[min(1000px,100%)]">
        <div className="grid w-full gap-4 md:grid-cols-2">
          <div
            role="region"
            aria-label="前面プレビュー（SVG ドロップ可）"
            className="relative isolate flex min-h-[min(48vh,360px)] flex-col"
            onDragOver={onDragOver("front")}
            onDragLeave={onDragLeave}
            onDrop={onDropFront}
          >
            <div
              className="mb-2 flex items-baseline justify-between gap-2 border-b pb-1.5 font-mono text-[10px]"
              style={{ borderColor: rule }}
            >
              <span style={{ color: ink }}>前面 · 服SVG</span>
              <span style={{ color: muted }}>ドロップで読込</span>
            </div>
            <div
              className="relative flex flex-1 items-center justify-center overflow-visible rounded-sm border border-dashed transition-colors"
              style={{
                borderColor: dragTarget === "front" ? accent : rule,
                background:
                  dragTarget === "front" ? `${accent}14` : `${GARMENT_FLAT_CM_PREVIEW_BG}66`,
              }}
            >
              {fitSnapFront == null ? (
                <p className="px-4 text-center font-mono text-[10px] leading-relaxed" style={{ color: muted }}>
                  試着ワープを組むには #rig 9 本が必要です。標準ガーメントを読み込むか、このエリアへ SVG をドロップしてください。
                </p>
              ) : (
                <GarmentFlatCmGradingFittingFitSnapSvg
                  fitSnap={fitSnapFront}
                  showModelBody={showModelBody}
                  showGarment={showGarment}
                  showModelRig={showModelRig}
                  showGarmentRig={showGarmentRig}
                />
              )}
            </div>
          </div>

          <div
            role="region"
            aria-label="背面プレビュー（任意の背面アート SVG をドロップ）"
            className={`relative isolate flex min-h-[min(48vh,360px)] flex-col ${!canDropRear ? "opacity-60" : ""}`}
            onDragOver={onDragOver("rear")}
            onDragLeave={onDragLeave}
            onDrop={onDropRear}
          >
            <div
              className="mb-2 flex items-baseline justify-between gap-2 border-b pb-1.5 font-mono text-[10px]"
              style={{ borderColor: rule }}
            >
              <span style={{ color: ink }}>背面 · 試着（背面ボディ）</span>
              <span style={{ color: muted }}>任意アートはドロップ</span>
            </div>
            <div
              className="relative flex flex-1 items-center justify-center overflow-visible rounded-sm border border-dashed transition-colors"
              style={{
                borderColor: dragTarget === "rear" && canDropRear ? accent : rule,
                background:
                  dragTarget === "rear" && canDropRear ? `${accent}14` : `${GARMENT_FLAT_CM_PREVIEW_BG}66`,
              }}
            >
              {fitSnapBack == null ? (
                <p className="px-4 text-center font-mono text-[10px] leading-relaxed" style={{ color: muted }}>
                  {canDropRear
                    ? "背面専用アートを別 SVG で載せる場合はここにドロップ（未指定時は前面アートを流用します）。"
                    : "左でメインの服SVGを読み込んでから、背面用 SVG をドロップできます。"}
                </p>
              ) : (
                <GarmentFlatCmGradingFittingFitSnapSvg
                  fitSnap={fitSnapBack}
                  showModelBody={showModelBody}
                  showGarment={showGarment}
                  showModelRig={showModelRig}
                  showGarmentRig={showGarmentRig}
                />
              )}
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-4 right-4 border p-3 font-mono text-[10px] leading-[1.9]"
          style={{ background: panel, borderColor: rule, color: ink }}
        >
          <div className="flex justify-between gap-[18px]">
            <span style={{ color: muted }}>肩幅</span>
            <span style={{ color: overlay.sh.accent ? accent : ink }}>{overlay.sh.text}</span>
          </div>
          <div className="flex justify-between gap-[18px]">
            <span style={{ color: muted }}>身幅</span>
            <span style={{ color: overlay.bw.accent ? accent : ink }}>{overlay.bw.text}</span>
          </div>
          <div className="flex justify-between gap-[18px]">
            <span style={{ color: muted }}>着丈</span>
            <span style={{ color: overlay.bl.accent ? accent : ink }}>{overlay.bl.text}</span>
          </div>
          <div className="flex justify-between gap-[18px]">
            <span style={{ color: muted }}>袖（片側）</span>
            <span style={{ color: overlay.sl.accent ? accent : ink }}>{overlay.sl.text}</span>
          </div>
          <div className="flex justify-between gap-[18px]">
            <span style={{ color: muted }}>size</span>
            <span style={{ color: ink }}>{overlay.sizeLabel}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
