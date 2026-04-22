"use client";

import { cn } from "@/lib/utils";

type ConsoleMainColumnProps = {
  children: React.ReactNode;
  /** 開発タブ：全体をはみ出さないフレックス列にする */
  developmentMode?: boolean;
};

/** メインカラムのスクロール領域の余白（全ページ共通） */
const mainColumnPadding = cn(
  "px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7"
);

export function ConsoleMainColumn({
  children,
  developmentMode = false,
}: ConsoleMainColumnProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto bg-background",
          developmentMode
            ? "flex min-h-0 flex-col px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6"
            : ["min-w-0", mainColumnPadding]
        )}
      >
        {children}
      </div>
    </div>
  );
}
