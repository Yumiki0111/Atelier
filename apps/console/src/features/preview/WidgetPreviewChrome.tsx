"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft, ShoppingCart } from "lucide-react";

export const PREVIEW_ACCENT = "#3d3835";

/** 試着プレビュー全体の下地（描画キャンパス・ヘッダー下・フォン画面内を同じ色に） */
export const PREVIEW_SURFACE_BG = "#fafafa";

/** 上部「商品に戻る」（試着メイン・体型シート共通） */
export function PreviewBackRow({
  onClick,
  label = "商品に戻る",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <div className="shrink-0 px-3 pb-1 pt-[max(10px,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onClick}
        className="flex cursor-pointer items-center gap-1 border-none bg-transparent py-1.5 pl-0 pr-1 text-[12px] text-[#111]"
      >
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
        {label}
      </button>
    </div>
  );
}

/** サムネ・商品名・価格・右スロット（体型を変更など） */
export function PreviewProductRow({
  productName,
  priceDisplay,
  thumbnailUrl,
  rightSlot,
}: {
  productName: string;
  priceDisplay: string;
  thumbnailUrl?: string | null;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-row items-start justify-between gap-1.5 px-3 pb-2 pt-0.5">
      <div className="flex min-w-0 flex-1 flex-row items-start gap-1.5">
        <div
          className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[#e5e7eb] bg-[#f3f4f6]"
          style={{ borderRadius: "50%" }}
        >
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[7px] text-[#9ca3af]">
              IMG
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="break-words text-[9px] font-normal leading-tight text-[#111]">{productName}</div>
          <div className="text-[8px] font-normal text-[#111]">{priceDisplay}</div>
        </div>
      </div>
      {rightSlot ?? null}
    </div>
  );
}

export function PreviewBodyChangeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 shrink-0 cursor-pointer items-center gap-[3px] whitespace-nowrap rounded-full border border-[#111] bg-white px-[7px] py-0 text-[9px] font-semibold leading-none text-[#111]"
    >
      <span className="flex h-3 w-3 shrink-0 items-center justify-center">
        <Image
          src="/human-logo.png"
          alt=""
          width={12}
          height={12}
          className="h-3 w-3 shrink-0 object-contain"
          aria-hidden
        />
      </span>
      <span className="flex items-center">体型を変更</span>
    </button>
  );
}

/** カラー（試着不可モード時のみ。メイン・体型シートで同じ見た目） */
export function PreviewColorSwatchRow({
  swatches,
  selectedId,
  onSelect,
  accentColor = PREVIEW_ACCENT,
}: {
  swatches: { id: string; hex: string; label?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** 選択枠・アクセント（未指定時は `PREVIEW_ACCENT`） */
  accentColor?: string;
}) {
  return (
    <div className="flex shrink-0 flex-row items-center gap-2.5 px-3.5 pb-3.5">
      {swatches.map((sw) => (
        <button
          key={sw.id}
          type="button"
          aria-label={sw.label || sw.id}
          onClick={() => onSelect(sw.id)}
          className="h-7 w-7 shrink-0 cursor-pointer rounded-full p-0"
          style={{
            background: sw.hex,
            border:
              sw.id === selectedId ? `3px solid ${accentColor}` : "1px solid #ccc",
          }}
        />
      ))}
    </div>
  );
}

/** 試着キャンバス枠（背景・パディング共通）
 * 親の flex 列で残り高さを確実に取る（basis-0 + min-h-0）。
 * overflow は visible：子 SVG のストロークや viewBox 外の描画を親の overflow-hidden で切らない。
 */
export function PreviewViewerShell({
  children,
  backgroundColor,
}: {
  children: ReactNode;
  /** 描画キャンパス（試着 SVG エリア）。未指定時は `PREVIEW_SURFACE_BG` */
  backgroundColor?: string;
}) {
  return (
    <div
      className="relative flex min-h-0 flex-1 basis-0 flex-col overflow-visible px-4 pb-4 pt-4"
      style={{ backgroundColor: backgroundColor ?? PREVIEW_SURFACE_BG }}
      data-fitlook-viewer-container
    >
      {children}
    </div>
  );
}

const WINDOW = 3;

/** サイズカルーセル（試着メインのみ） */
export function PreviewSizeCarousel({
  sizeKeys,
  currentSize,
  windowStart,
  onWindowStartChange,
  onSelectSize,
  accentColor = PREVIEW_ACCENT,
}: {
  sizeKeys: string[];
  currentSize: string;
  windowStart: number;
  onWindowStartChange: (next: number) => void;
  onSelectSize: (size: string) => void;
  accentColor?: string;
}) {
  const slice = sizeKeys.slice(windowStart, windowStart + WINDOW);
  return (
    <div className="flex shrink-0 flex-col gap-1.5 px-3 pb-1.5 pt-2">
      <div className="flex flex-row items-center justify-center gap-1.5">
        <button
          type="button"
          className="h-7 w-7 border-none bg-transparent text-[17px] leading-none text-[#111] disabled:pointer-events-none disabled:opacity-35"
          disabled={windowStart <= 0}
          onClick={() => onWindowStartChange(Math.max(0, windowStart - 1))}
        >
          ‹
        </button>
        <div className="flex flex-row items-center justify-center gap-1.5">
          {slice.map((sz) => {
            const isSel = sz === currentSize;
            return (
              <button
                key={sz}
                type="button"
                onClick={() => onSelectSize(sz)}
                className="h-[34px] w-[34px] shrink-0 cursor-pointer rounded-full text-[13px] font-semibold"
                style={
                  isSel
                    ? { background: accentColor, color: "#fff", border: "none" }
                    : { background: "#fff", color: "#111", border: "1px solid #111" }
                }
              >
                {sz}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="h-7 w-7 border-none bg-transparent text-[17px] leading-none text-[#111] disabled:pointer-events-none disabled:opacity-35"
          disabled={windowStart + WINDOW >= sizeKeys.length}
          onClick={() =>
            onWindowStartChange(Math.min(sizeKeys.length - WINDOW, windowStart + 1))
          }
        >
          ›
        </button>
      </div>
    </div>
  );
}

/** 身長・体型スライダー（サイズ行と同じ横パディング・段組） */
export function PreviewFitParamSliders({
  heightCm,
  bodyVal,
  onHeightChange,
  onBodyValChange,
  accentColor = PREVIEW_ACCENT,
}: {
  heightCm: number;
  bodyVal: number;
  onHeightChange: (v: number) => void;
  onBodyValChange: (v: number) => void;
  accentColor?: string;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1.5 px-3 pb-1.5 pt-2">
      <div>
        <div className="mb-1 flex justify-between text-[9px] font-normal leading-tight text-[#111]">
          <span>身長</span>
          <span>
            {heightCm} cm
          </span>
        </div>
        <input
          type="range"
          min={150}
          max={195}
          value={heightCm}
          onChange={(e) => onHeightChange(parseInt(e.target.value, 10) || 170)}
          className="h-7 w-full"
          style={{ accentColor }}
        />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[9px] font-normal leading-tight text-[#111]">
          <span>体型</span>
          <span>{bodyVal}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={bodyVal}
          onChange={(e) => onBodyValChange(parseInt(e.target.value, 10) || 0)}
          className="h-7 w-full"
          style={{ accentColor }}
        />
      </div>
    </div>
  );
}

/** 下段アクセントボタン（カート追加 / この体型で試着する） */
export function PreviewAccentCtaButton({
  variant,
  onClick,
  label,
  accentColor = PREVIEW_ACCENT,
}: {
  variant: "cart" | "tryOn";
  onClick?: () => void;
  label: ReactNode;
  accentColor?: string;
}) {
  return (
    <div className="shrink-0 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full cursor-pointer flex-row items-center justify-between rounded-[10px] border-none px-3.5 py-2.5 text-[13px] font-bold text-white"
        style={{ background: accentColor }}
      >
        {variant === "cart" ? (
          <>
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-[15px] w-[15px]" strokeWidth={1.6} color="#fff" />
            </span>
            <span className="flex-1 text-center">{label}</span>
            <span
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px]"
              style={{ border: "1px solid rgba(255,255,255,0.9)" }}
            >
              →
            </span>
          </>
        ) : (
          <>
            <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center" aria-hidden />
            <span className="flex-1 text-center">{label}</span>
            <span
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px]"
              style={{ border: "1px solid rgba(255,255,255,0.9)" }}
            >
              →
            </span>
          </>
        )}
      </button>
    </div>
  );
}

export { PreviewBodySilhouette } from "./PreviewBodySilhouette";
