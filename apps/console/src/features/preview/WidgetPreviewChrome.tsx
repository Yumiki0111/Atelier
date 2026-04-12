"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGET_DESIGN_CANVAS_BG_DEFAULT,
  WIDGET_DESIGN_CTA_ACCENT_DEFAULT,
} from "@Atelier/shared";
import {
  buildPreviewChromeTheme,
  type PreviewChromeTheme,
} from "@/lib/previewChromeTheme";

export const PREVIEW_ACCENT = WIDGET_DESIGN_CTA_ACCENT_DEFAULT;

/** 試着プレビュー全体の下地（描画キャンパス・ヘッダー下・フォン画面内を同じ色に） */
export const PREVIEW_SURFACE_BG = WIDGET_DESIGN_CANVAS_BG_DEFAULT;

const DEFAULT_PREVIEW_CHROME_THEME = buildPreviewChromeTheme(
  PREVIEW_SURFACE_BG,
  PREVIEW_SURFACE_BG
);

const PreviewChromeThemeContext = createContext<PreviewChromeTheme>(DEFAULT_PREVIEW_CHROME_THEME);

export function PreviewChromeThemeProvider({
  interfaceBackgroundColor,
  canvasBackgroundColor,
  children,
}: {
  interfaceBackgroundColor: string;
  canvasBackgroundColor: string;
  children: ReactNode;
}) {
  const value = useMemo(
    () => buildPreviewChromeTheme(interfaceBackgroundColor, canvasBackgroundColor),
    [interfaceBackgroundColor, canvasBackgroundColor]
  );
  return (
    <PreviewChromeThemeContext.Provider value={value}>{children}</PreviewChromeThemeContext.Provider>
  );
}

export function usePreviewChromeTheme(): PreviewChromeTheme {
  return useContext(PreviewChromeThemeContext);
}

/** `default` = コンソールのプレビュー（コンパクト）。`embed` = ウィジェット iframe 用（タップしやすい） */
export type PreviewChromeUiScale = "default" | "embed";

const PreviewChromeScaleContext = createContext<PreviewChromeUiScale>("default");

export function PreviewChromeScaleProvider({
  value,
  children,
}: {
  value: PreviewChromeUiScale;
  children: ReactNode;
}) {
  return (
    <PreviewChromeScaleContext.Provider value={value}>{children}</PreviewChromeScaleContext.Provider>
  );
}

function usePreviewChromeScale(): PreviewChromeUiScale {
  return useContext(PreviewChromeScaleContext);
}

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
    <div className="shrink-0 px-3 pb-1 pt-[max(10px,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex cursor-pointer items-center border-none bg-transparent pl-0 pr-1",
          isEmbed
            ? "min-h-[44px] gap-1.5 py-2 text-[14px]"
            : "gap-1 py-1.5 text-[12px]"
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
        "flex shrink-0 flex-row items-start justify-between px-3 pb-2 pt-0.5",
        isEmbed ? "gap-2" : "gap-1.5"
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-row items-start",
          isEmbed ? "gap-2" : "gap-1.5"
        )}
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
                isEmbed ? "text-[9px]" : "text-[7px]"
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
              isEmbed ? "text-[11px] leading-snug" : "text-[9px] leading-tight"
            )}
            style={{ color: fg }}
            title={productName}
          >
            {productName}
          </div>
          <div
            className={cn("font-normal", isEmbed ? "text-[10px]" : "text-[8px]")}
            style={{ color: fg }}
          >
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
          : "h-8 gap-[3px] px-[7px] py-0 text-[9px] leading-none"
      )}
      style={{
        borderColor: border,
        backgroundColor: chipIdleBg,
        color: fg,
      }}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center",
          isEmbed ? "h-4 w-4" : "h-3 w-3"
        )}
      >
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
        isEmbed ? "gap-3" : "gap-2.5"
      )}
    >
      {swatches.map((sw) => (
        <button
          key={sw.id}
          type="button"
          aria-label={sw.label || sw.id}
          onClick={() => onSelect(sw.id)}
          className={cn(
            "shrink-0 cursor-pointer rounded-full p-0",
            isEmbed ? "h-9 w-9" : "h-7 w-7"
          )}
          style={{
            background: sw.hex,
            border:
              sw.id === selectedId ? `3px solid ${accentColor}` : `1px solid ${idleBorder}`,
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
      className="relative flex min-h-0 flex-1 basis-0 flex-col overflow-visible px-2 pb-2 pt-2"
      style={{ backgroundColor: backgroundColor ?? PREVIEW_SURFACE_BG }}
      data-fitlook-viewer-container
    >
      {children}
    </div>
  );
}

/** 同時表示するサイズチップ数（‹› で全体をスクロール）。`WidgetStyleProductPreview` の windowStart 計算と一致させる */
export const PREVIEW_SIZE_CAROUSEL_WINDOW = 6;

/** `el` の左端までを `stop` のボーダー左基準で足し上げる（親の CSS transform は反映されない） */
function offsetLeftAccumulatedToAncestor(el: HTMLElement, stop: HTMLElement): number {
  let left = 0;
  let n: HTMLElement | null = el;
  while (n && n !== stop) {
    left += n.offsetLeft;
    n = n.offsetParent as HTMLElement | null;
  }
  return n === stop ? left : 0;
}

/** サイズカルーセル（試着メインのみ）。‹› は表示ウィンドウではなく「前後のサイズ」に切り替える。 */
export function PreviewSizeCarousel({
  sizeKeys,
  currentSize,
  windowStart,
  onSelectSize,
  accentColor = PREVIEW_ACCENT,
}: {
  sizeKeys: string[];
  currentSize: string;
  /** `currentSize` が見えるよう `sizeKeys` 上で切り出す開始インデックス（親で currentSize から算出） */
  windowStart: number;
  onSelectSize: (size: string) => void;
  accentColor?: string;
}) {
  const scale = usePreviewChromeScale();
  const isEmbed = scale === "embed";
  const cv = usePreviewChromeTheme().canvas;
  const slice = sizeKeys.slice(windowStart, windowStart + PREVIEW_SIZE_CAROUSEL_WINDOW);
  const idx = sizeKeys.indexOf(currentSize);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < sizeKeys.length - 1;

  const trackRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const [chipAlignX, setChipAlignX] = useState(0);

  /** 端のほんのわずかなフェードのみ（中央チップの見え方を邪魔しない） */
  const chipFadePx = isEmbed ? 4 : 3;
  const chipTrackMask = `linear-gradient(to right, transparent 0, #000 ${chipFadePx}px, #000 calc(100% - ${chipFadePx}px), transparent 100%)`;

  const recomputeChipAlign = useCallback(() => {
    const track = trackRef.current;
    const sel = selectedRef.current;
    if (!track || !sel) {
      setChipAlignX(0);
      return;
    }
    /** getBoundingClientRect は行の translate を含むため、2 回目のレイアウトで align が 0 に戻るバグになる。layout の offset のみで絶対値を出す。 */
    const tw = track.clientWidth;
    const selLeftInTrack = offsetLeftAccumulatedToAncestor(sel, track);
    const naturalCenter = selLeftInTrack + sel.offsetWidth / 2;
    setChipAlignX(Math.round(tw / 2 - naturalCenter));
  }, []);

  const sliceKey = slice.join("\0");

  useLayoutEffect(() => {
    recomputeChipAlign();
  }, [recomputeChipAlign, currentSize, windowStart, sliceKey, isEmbed]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recomputeChipAlign());
    ro.observe(track);
    return () => ro.disconnect();
  }, [recomputeChipAlign]);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col px-3",
        isEmbed ? "gap-2 pb-0.5 pt-2" : "gap-1.5 pb-0 pt-2"
      )}
    >
      {/** `PreviewAccentCtaButton` と同じ `px-3` + `w-full` 相当で、‹› は CTA 左右ゾーンに近い狭い列に収める */}
      <div className="flex w-full min-w-0 items-center">
        <button
          type="button"
          aria-label="前のサイズ"
          className={cn(
            "m-0 flex shrink-0 items-center justify-center rounded-full border-none bg-transparent p-0 leading-none disabled:pointer-events-none disabled:opacity-35",
            isEmbed ? "text-[26px]" : "text-[20px]"
          )}
          style={{ color: cv.fg }}
          disabled={!canPrev}
          onClick={() => {
            if (!canPrev || idx <= 0) return;
            onSelectSize(sizeKeys[idx - 1]!);
          }}
        >
          ‹
        </button>
        <div
          ref={trackRef}
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
          style={{
            WebkitMaskImage: chipTrackMask,
            maskImage: chipTrackMask,
          }}
        >
          <div
            className={cn(
              "flex w-max max-w-none flex-row flex-nowrap items-center will-change-transform motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
              isEmbed ? "gap-2.5" : "gap-2"
            )}
            style={{ transform: `translate3d(${chipAlignX}px,0,0)` }}
          >
            {slice.map((sz, i) => {
              const isSel = sz === currentSize;
              return (
                <button
                  key={`${windowStart}-${i}-${sz}`}
                  ref={isSel ? selectedRef : undefined}
                  type="button"
                  onClick={() => onSelectSize(sz)}
                  className={cn(
                    "shrink-0 cursor-pointer font-semibold",
                    isEmbed
                      ? "h-12 min-w-[56px] px-3.5 text-[16px] rounded-[24px]"
                      : "h-9 min-w-[44px] px-2.5 text-[13px] rounded-[18px]"
                  )}
                  style={
                    isSel
                      ? { background: accentColor, color: "#fff", border: "none" }
                      : {
                          background: cv.chipIdleBg,
                          color: cv.chipIdleFg,
                          border: `1px solid ${cv.chipIdleBorder}`,
                        }
                  }
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          aria-label="次のサイズ"
          className={cn(
            "m-0 flex shrink-0 items-center justify-center rounded-full border-none bg-transparent p-0 leading-none disabled:pointer-events-none disabled:opacity-35",
            isEmbed ? "text-[26px]" : "text-[20px]"
          )}
          style={{ color: cv.fg }}
          disabled={!canNext}
          onClick={() => {
            if (!canNext || idx < 0) return;
            onSelectSize(sizeKeys[idx + 1]!);
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

/** 親への数値コミット間隔（試着計算の負荷を抑える。バーはローカルで追従） */
const SLIDER_COMMIT_INTERVAL_MS = 72;

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
  const scale = usePreviewChromeScale();
  const isEmbed = scale === "embed";
  const cv = usePreviewChromeTheme().canvas;

  const [heightLocal, setHeightLocal] = useState(heightCm);
  const [bodyLocal, setBodyLocal] = useState(bodyVal);
  const heightRef = useRef(heightCm);
  const bodyRef = useRef(bodyVal);
  const lastHCommit = useRef(0);
  const lastBCommit = useRef(0);
  const hTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHeightLocal(heightCm);
    heightRef.current = heightCm;
  }, [heightCm]);
  useEffect(() => {
    setBodyLocal(bodyVal);
    bodyRef.current = bodyVal;
  }, [bodyVal]);

  useEffect(
    () => () => {
      if (hTimerRef.current) clearTimeout(hTimerRef.current);
      if (bTimerRef.current) clearTimeout(bTimerRef.current);
    },
    []
  );

  const commitHeight = useCallback(
    (v: number) => {
      lastHCommit.current = performance.now();
      onHeightChange(v);
    },
    [onHeightChange]
  );
  const commitBody = useCallback(
    (v: number) => {
      lastBCommit.current = performance.now();
      onBodyValChange(v);
    },
    [onBodyValChange]
  );

  const onHeightInput = useCallback(
    (v: number) => {
      setHeightLocal(v);
      heightRef.current = v;
      const now = performance.now();
      if (hTimerRef.current) {
        clearTimeout(hTimerRef.current);
        hTimerRef.current = null;
      }
      if (now - lastHCommit.current >= SLIDER_COMMIT_INTERVAL_MS) {
        commitHeight(v);
      } else {
        const wait = SLIDER_COMMIT_INTERVAL_MS - (now - lastHCommit.current);
        hTimerRef.current = setTimeout(() => {
          hTimerRef.current = null;
          commitHeight(heightRef.current);
        }, Math.max(0, wait));
      }
    },
    [commitHeight]
  );

  const onBodyInput = useCallback(
    (v: number) => {
      setBodyLocal(v);
      bodyRef.current = v;
      const now = performance.now();
      if (bTimerRef.current) {
        clearTimeout(bTimerRef.current);
        bTimerRef.current = null;
      }
      if (now - lastBCommit.current >= SLIDER_COMMIT_INTERVAL_MS) {
        commitBody(v);
      } else {
        const wait = SLIDER_COMMIT_INTERVAL_MS - (now - lastBCommit.current);
        bTimerRef.current = setTimeout(() => {
          bTimerRef.current = null;
          commitBody(bodyRef.current);
        }, Math.max(0, wait));
      }
    },
    [commitBody]
  );

  const flushHeight = useCallback(() => {
    if (hTimerRef.current) {
      clearTimeout(hTimerRef.current);
      hTimerRef.current = null;
    }
    commitHeight(heightRef.current);
  }, [commitHeight]);

  const flushBody = useCallback(() => {
    if (bTimerRef.current) {
      clearTimeout(bTimerRef.current);
      bTimerRef.current = null;
    }
    commitBody(bodyRef.current);
  }, [commitBody]);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col px-3",
        isEmbed ? "gap-2 pb-2 pt-2" : "gap-1.5 pb-1.5 pt-2"
      )}
    >
      <div>
        <div
          className={cn(
            "flex justify-between font-normal leading-tight",
            isEmbed ? "mb-1.5 text-[11px]" : "mb-1 text-[9px]"
          )}
          style={{ color: cv.fg }}
        >
          <span>身長</span>
          <span>
            {heightLocal} cm
          </span>
        </div>
        <input
          type="range"
          min={150}
          max={195}
          value={heightLocal}
          onChange={(e) => onHeightInput(parseInt(e.target.value, 10) || 170)}
          onPointerUp={flushHeight}
          onPointerCancel={flushHeight}
          className={cn("w-full", isEmbed ? "h-8" : "h-7")}
          style={{ accentColor }}
        />
      </div>
      <div>
        <div
          className={cn(
            "font-normal leading-tight",
            isEmbed ? "mb-1.5 text-[11px]" : "mb-1 text-[9px]"
          )}
          style={{ color: cv.fg }}
        >
          シルエット
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={bodyLocal}
          onChange={(e) => onBodyInput(parseInt(e.target.value, 10) || 0)}
          onPointerUp={flushBody}
          onPointerCancel={flushBody}
          className={cn("w-full", isEmbed ? "h-8" : "h-7")}
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
  const scale = usePreviewChromeScale();
  const isEmbed = scale === "embed";
  return (
    <div className="shrink-0 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-1">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full cursor-pointer flex-row items-center justify-between border-none font-bold text-white",
          isEmbed
            ? "min-h-[52px] rounded-[12px] px-4 py-3.5 text-[15px]"
            : "rounded-[10px] px-3.5 py-2.5 text-[13px]"
        )}
        style={{ background: accentColor }}
      >
        {variant === "cart" ? (
          <>
            <span className="flex items-center gap-2">
              <ShoppingCart
                className={isEmbed ? "h-[18px] w-[18px]" : "h-[15px] w-[15px]"}
                strokeWidth={isEmbed ? 1.75 : 1.6}
                color="#fff"
              />
            </span>
            <span className="flex-1 text-center">{label}</span>
            <span
              className={cn(
                "flex items-center justify-center rounded-full",
                isEmbed ? "h-[26px] w-[26px] text-[12px]" : "h-[22px] w-[22px] text-[11px]"
              )}
              style={{ border: "1px solid rgba(255,255,255,0.9)" }}
            >
              →
            </span>
          </>
        ) : (
          <>
            <span
              className={cn(
                "flex shrink-0 items-center justify-center",
                isEmbed ? "h-[18px] w-[18px]" : "h-[15px] w-[15px]"
              )}
              aria-hidden
            />
            <span className="flex-1 text-center">{label}</span>
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full",
                isEmbed ? "h-[26px] w-[26px] text-[12px]" : "h-[22px] w-[22px] text-[11px]"
              )}
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
