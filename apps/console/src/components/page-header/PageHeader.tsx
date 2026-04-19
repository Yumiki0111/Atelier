import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  /** タイトル横のメタ情報（件数バッジなど） */
  badge?: ReactNode;
  /** 右上：期間セレクト・ボタンなど */
  actions?: ReactNode;
  className?: string;
};

/**
 * ページタイトル（コンソール共通）。
 * 下線は付けず、本文との余白は親の `consolePageShellClass` などで揃える。
 */
export function PageHeader({ title, badge, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("min-w-0", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <h1 className="text-balance text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {title}
            </h1>
            {badge != null && badge !== false ? badge : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
