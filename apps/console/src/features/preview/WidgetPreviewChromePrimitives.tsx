"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PREVIEW_ACCENT,
  PREVIEW_SURFACE_BG,
  usePreviewChromeScale,
  usePreviewChromeTheme,
} from "./WidgetPreviewChromeTheme";

/** 上部「商品に戻る」（試着メイン・体型シート共通） */
export function PreviewBackRow({
  onClick,
  label = "商品に戻る",
}: {
  onClick: () => void;
  label?: string;
}) {
  const scale = usePreviewChromeScale();
  const isEmbed = scale === "embed";
  const theme = usePreviewChromeTheme();
  const fg = theme.interface.fg;
  return (
    <div
      className={cn(
        "shrink-0 pb-1 pt-[max(10px,env(safe-area-inset-top))]",
        isEmbed ? "px-4" : "px-3",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex cursor-pointer items-center border-none bg-transparent pl-0 pr-1",
          isEmbed ? "min-h-[44px] gap-1.5 py-2 text-[14px]" : "gap-1 py-1.5 text-[12px]",
        )}
        style={{ color: fg }}
      >
        <ArrowLeft
          className={cn("shrink-0", isEmbed ? "h-[18px] w-[18px]" : "h-3.5 w-3.5")}
          strokeWidth={isEmbed ? 1.75 : 1.5}
          color={fg}
          aria-hidden
        />
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
  const scale = usePreviewChromeScale();
  const isEmbed = scale === "embed";
  const theme = usePreviewChromeTheme();
  const { fg, mutedFg, border, surfaceSubtle } = theme.interface;
  return (
    <div
      className={cn(
        "flex shrink-0 flex-row items-start justify-between pt-0.5",
        isEmbed ? "gap-2 px-4 pb-2" : "gap-1.5 px-3 pb-2",
      )}
    >
      <div
        className={cn("flex min-w-0 flex-1 flex-row items-start", isEmbed ? "gap-2" : "gap-1.5")}
      >
        <div
          className={cn("shrink-0 overflow-hidden rounded-full border", isEmbed ? "h-10 w-10" : "h-8 w-8")}
          style={{ borderRadius: "50%", borderColor: border, backgroundColor: surfaceSubtle }}
        >
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center",
                isEmbed ? "text-[9px]" : "text-[7px]",
              )}
              style={{ color: mutedFg }}
            >
              IMG
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div
            className={cn(
              "min-w-0 truncate font-normal",
              isEmbed ? "text-[11px] leading-snug" : "text-[9px] leading-tight",
            )}
            style={{ color: fg }}
            title={productName}
          >
            {productName}
          </div>
          <div className={cn("font-normal", isEmbed ? "text-[10px]" : "text-[8px]")} style={{ color: fg }}>
            {priceDisplay}
          </div>
        </div>
      </div>
      {rightSlot ?? null}
    </div>
  );
}

export function PreviewBodyChangeButton({ onClick }: { onClick: () => void }) {
  const scale = usePreviewChromeScale();
  const isEmbed = scale === "embed";
  const imgPx = isEmbed ? 16 : 12;
  const theme = usePreviewChromeTheme();
  const { fg, border, chipIdleBg } = theme.interface;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border font-semibold",
        isEmbed
          ? "min-h-[40px] gap-1 px-2.5 py-1.5 text-[11px] leading-tight"
          : "h-8 gap-[3px] px-[7px] py-0 text-[9px] leading-none",
      )}
      style={{
        borderColor: border,
        backgroundColor: chipIdleBg,
        color: fg,
      }}
    >
      <span className={cn("flex shrink-0 items-center justify-center", isEmbed ? "h-4 w-4" : "h-3 w-3")}>
        <Image
          src="/human-logo.png"
          alt=""
          width={imgPx}
          height={imgPx}
          className={cn("shrink-0 object-contain", isEmbed ? "h-4 w-4" : "h-3 w-3")}
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
  const scale = usePreviewChromeScale();
  const isEmbed = scale === "embed";
  const theme = usePreviewChromeTheme();
  const idleBorder = theme.interface.border;
  return (
    <div
      className={cn(
        "flex shrink-0 flex-row items-center px-3.5 pb-3.5",
        isEmbed ? "gap-3" : "gap-2.5",
      )}
    >
      {swatches.map((sw) => (
        <button
          key={sw.id}
          type="button"
          aria-label={sw.label || sw.id}
          onClick={() => onSelect(sw.id)}
          className={cn("shrink-0 cursor-pointer rounded-full p-0", isEmbed ? "h-9 w-9" : "h-7 w-7")}
          style={{
            background: sw.hex,
            border: sw.id === selectedId ? `3px solid ${accentColor}` : `1px solid ${idleBorder}`,
          }}
        />
      ))}
    </div>
  );
}

/** 試着キャンバス枠（背景・パディング共通）
 * 親の flex 列で残り高さを確実に取る（basis-0 + min-h-0）。
 * コンソールは `overflow-visible`（採寸図・ストロークのはみ出しを残す）。
 * 埋め込み（ウィジェット iframe）は `overflow-hidden` と z-0：下層の描画がヘッダー／サイズ行の上に乗らない。
 */
export function PreviewViewerShell({
  children,
  backgroundColor,
  clipContent = false,
}: {
  children: ReactNode;
  /** 描画キャンパス（試着 SVG エリア）。未指定時は `PREVIEW_SURFACE_BG` */
  backgroundColor?: string;
  /** フォン枠プレビュー：キャンバス外へのはみ出しを隠す（メイン試着・体型シートの両方で使用） */
  clipContent?: boolean;
}) {
  const scale = usePreviewChromeScale();
  const isEmbed = scale === "embed";
  const hideOverflow = isEmbed || clipContent;
  return (
    <div
      className={cn(
        "relative z-0 flex min-h-0 min-w-0 flex-1 basis-0 flex-col",
        hideOverflow
          ? "justify-center overflow-hidden px-0 pb-px pt-0"
          : "overflow-visible px-2 pb-2 pt-2",
      )}
      style={{ backgroundColor: backgroundColor ?? PREVIEW_SURFACE_BG }}
      data-fitlook-viewer-container
    >
      {children}
    </div>
  );
}
