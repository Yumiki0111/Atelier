"use client";

import { Shirt } from "lucide-react";
import { cn } from "@/lib/utils";

function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#111111";
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#111111" : "#ffffff";
}

/**
 * Site launcher affordance (not the in-app phone UI). Mirrors widget `placement` + `button.shape`.
 */
export function WidgetLauncherPreviewMock({
  placement,
  shape,
  color,
  label,
}: {
  placement: "floating" | "inline";
  shape: "circle" | "pill";
  color: string;
  label: string;
}) {
  const fg = contrastText(color);
  const displayLabel = label.trim() || (shape === "pill" ? "自分のサイズで試着" : "");

  /** Slightly smaller copy for inline mock so one row fits narrow preview column (~310px). */
  const innerInline =
    shape === "circle" ? (
      <Shirt className="h-4 w-4" style={{ color: fg }} aria-hidden />
    ) : (
      <span className="flex items-center gap-1 text-[10px] font-semibold leading-none" style={{ color: fg }}>
        <Shirt className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {displayLabel ? <span className="whitespace-nowrap">{displayLabel}</span> : null}
      </span>
    );

  const inner =
    shape === "circle" ? (
      <Shirt className="h-5 w-5" style={{ color: fg }} aria-hidden />
    ) : (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold leading-tight sm:text-[12px]" style={{ color: fg }}>
        <Shirt className="h-4 w-4 shrink-0" aria-hidden />
        {displayLabel ? <span className="whitespace-nowrap">{displayLabel}</span> : null}
      </span>
    );

  if (placement === "floating") {
    return (
      <div className="relative h-28 w-full overflow-hidden rounded-lg border border-border/50 bg-muted/25">
        <p className="absolute left-2 top-2 text-[10px] text-muted-foreground">商品ページ（イメージ）</p>
        <div
          className={cn(
            "absolute bottom-2 right-2 flex items-center justify-center shadow-md",
            shape === "circle" ? "h-11 w-11 rounded-full" : "h-10 max-w-[200px] rounded-full px-3"
          )}
          style={{ backgroundColor: color }}
        >
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full rounded-lg border border-border/50 bg-muted/20 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">サイズ</p>
      {/* flex-wrap + max-width was wrapping the pill under S/M/L; keep single storefront row */}
      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
        {["S", "M", "L"].map((s) => (
          <div
            key={s}
            className={cn(
              "flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-md border border-border/40 bg-background px-2.5 text-[11px] font-semibold tabular-nums text-muted-foreground",
              s === "M" && "border-primary/35 ring-1 ring-primary/20"
            )}
          >
            {s}
          </div>
        ))}
        <div
          className={cn(
            "flex shrink-0 items-center justify-center shadow-sm",
            shape === "circle" ? "h-9 w-9 rounded-full" : "h-8 rounded-full px-2.5"
          )}
          style={{ backgroundColor: color }}
        >
          {innerInline}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        サイズチップと同じ行に試着ボタンを並べる想定（列を均等伸ばさない）
      </p>
    </div>
  );
}
