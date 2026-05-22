"use client";

import { cn } from "@/lib/utils";

export function GarmentSizeReorderGrip({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex shrink-0 cursor-grab touch-none items-center justify-center rounded p-1.5 text-muted-foreground hover:bg-muted/60 active:cursor-grabbing",
        className
      )}
      aria-label="並び替え（ドラッグ）"
      {...props}
    >
      <span className="grid grid-cols-2 gap-[3px]" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="size-[3px] rounded-full bg-current opacity-55" />
        ))}
      </span>
    </button>
  );
}

export function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}
