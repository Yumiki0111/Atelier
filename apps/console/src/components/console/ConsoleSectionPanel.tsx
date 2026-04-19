"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { consolePanelClass, consoleSectionRuleClass } from "@/lib/console-ui";

export type ConsoleSectionPanelProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  /** 見出しブロックの追加クラス */
  headingClassName?: string;
  /** 本文ラッパー */
  contentClassName?: string;
};

/**
 * 薄い枠＋見出しでブロックを区切る（アカウント設定・開発などで統一）。
 */
export function ConsoleSectionPanel({
  title,
  description,
  icon: Icon,
  children,
  className,
  headingClassName,
  contentClassName,
}: ConsoleSectionPanelProps) {
  return (
    <section className={cn(consolePanelClass, className)}>
      <div
        className={cn(
          "flex gap-3 bg-[#FAFAFA] px-5 py-4 sm:px-6",
          consoleSectionRuleClass,
          headingClassName
        )}
      >
        {Icon ? (
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className={cn("p-5 sm:p-6", contentClassName)}>{children}</div>
    </section>
  );
}
