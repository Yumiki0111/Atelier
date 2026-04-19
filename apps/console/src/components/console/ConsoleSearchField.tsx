"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { consoleHairlineBorder } from "@/lib/console-ui";

export type ConsoleSearchFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  "type"
> & {
  /** ラッパーに付与（通常は `min-w-0 flex-1` など） */
  wrapperClassName?: string;
};

/**
 * 虫眼鏡＋薄い枠の検索欄（商品ライブラリと同じ見た目）。
 */
export function ConsoleSearchField({
  className,
  wrapperClassName,
  ...props
}: ConsoleSearchFieldProps) {
  return (
    <div className={cn("relative min-w-0", wrapperClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-[1.25] text-muted-foreground/75"
        aria-hidden
      />
      <Input
        type="search"
        className={cn(
          "h-11 rounded-md border bg-background pl-10 pr-3 shadow-none placeholder:text-muted-foreground/70",
          consoleHairlineBorder,
          className
        )}
        {...props}
      />
    </div>
  );
}
