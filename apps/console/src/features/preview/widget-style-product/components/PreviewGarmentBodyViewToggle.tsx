"use client";

import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GarmentPreviewBodyView } from "@/lib/widget-fit/resolveGarmentDataForPreviewView";

const LABEL: Record<GarmentPreviewBodyView, string> = {
  front: "前面",
  back: "背面",
};

export function PreviewGarmentBodyViewToggle(props: {
  value: GarmentPreviewBodyView;
  /** 前面 ↔ 背面をトグル */
  onToggle: () => void;
  accentColor: string;
  /** 体型調整シートなどで帯を細くする */
  compact?: boolean;
}) {
  const { value, onToggle, accentColor, compact } = props;
  const label = LABEL[value];
  return (
    <div
      className={cn(
        "flex w-full max-w-full shrink-0 items-center justify-center gap-1.5 px-1",
        compact ? "pb-0.5 pt-0" : "pb-0.5 pt-0.5",
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-semibold leading-none text-white transition-colors",
        )}
        style={{ borderColor: accentColor, backgroundColor: accentColor }}
        aria-label={
          value === "front"
            ? "試着を背面表示に切り替える（現在は前面）"
            : "試着を前面表示に切り替える（現在は背面）"
        }
        onClick={onToggle}
      >
        <ArrowLeftRight className="size-3 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
        {label}
      </button>
    </div>
  );
}
