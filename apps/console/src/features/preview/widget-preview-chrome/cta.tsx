"use client";

import type { ReactNode } from "react";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { PREVIEW_ACCENT, usePreviewChromeScale } from "./theme";

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
          isEmbed ? "min-h-[52px] rounded-[12px] px-4 py-3.5 text-[15px]" : "rounded-[10px] px-3.5 py-2.5 text-[13px]",
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
                isEmbed ? "h-[26px] w-[26px] text-[12px]" : "h-[22px] w-[22px] text-[11px]",
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
                isEmbed ? "h-[18px] w-[18px]" : "h-[15px] w-[15px]",
              )}
              aria-hidden
            />
            <span className="flex-1 text-center">{label}</span>
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full",
                isEmbed ? "h-[26px] w-[26px] text-[12px]" : "h-[22px] w-[22px] text-[11px]",
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
