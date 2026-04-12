"use client";

import { cn } from "@/lib/utils";

type ConsoleMainColumnProps = {
  children: React.ReactNode;
  /** 開発タブ：全体をはみ出さないフレックス列にする */
  developmentMode?: boolean;
};

export function ConsoleMainColumn({
  children,
  developmentMode = false,
}: ConsoleMainColumnProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-background",
        developmentMode && "overflow-hidden"
      )}
    >
      <div
        className={cn(
          "min-h-0 flex-1 p-3 sm:p-4 lg:p-5",
          developmentMode ? "flex min-h-0 flex-col overflow-hidden" : ""
        )}
      >
        <div
          className={cn(
            "min-h-0 h-full",
            developmentMode
              ? "flex min-h-0 flex-col overflow-hidden overscroll-none px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6"
              : "min-w-0 overflow-y-auto bg-background px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
