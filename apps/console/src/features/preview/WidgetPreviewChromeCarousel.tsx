"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  PREVIEW_ACCENT,
  usePreviewChromeScale,
  usePreviewChromeTheme,
} from "./WidgetPreviewChromeTheme";

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
    <div className={cn("flex shrink-0 flex-col px-3", isEmbed ? "gap-2 pb-0.5 pt-2" : "gap-1.5 pb-0 pt-2")}>
      {/** `PreviewAccentCtaButton` と同じ `px-3` + `w-full` 相当で、‹› は CTA 左右ゾーンに近い狭い列に収める */}
      <div className="flex w-full min-w-0 items-center">
        <button
          type="button"
          aria-label="前のサイズ"
          className={cn(
            "m-0 flex shrink-0 items-center justify-center rounded-full border-none bg-transparent p-0 leading-none disabled:pointer-events-none disabled:opacity-35",
            isEmbed ? "text-[26px]" : "text-[20px]",
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
              isEmbed ? "gap-2.5" : "gap-2",
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
                      : "h-9 min-w-[44px] px-2.5 text-[13px] rounded-[18px]",
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
            isEmbed ? "text-[26px]" : "text-[20px]",
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
