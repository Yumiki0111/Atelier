"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bookmark,
  Braces,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Palette,
  SquareCode,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LinkIssuancePanel } from "@/features/install/LinkIssuancePanel";

type NavItem = { href: string; label: string; icon: LucideIcon };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "データ & 公開",
    items: [
      { href: "/database/products", label: "商品ライブラリ", icon: Bookmark },
      { href: "/widget-design", label: "インターフェース", icon: Palette },
      { href: "/analytics", label: "アナリティクス", icon: BarChart3 },
      { href: "/install", label: "埋め込みスニペット", icon: SquareCode },
    ],
  },
  {
    label: "開発",
    items: [{ href: "/development", label: "開発", icon: Braces }],
  },
];

const bottomItems: { href: string; label: string; icon: LucideIcon; logout?: boolean }[] = [
  { href: "/settings", label: "アカウント設定", icon: UserCog },
  { href: "/logout", label: "ログアウト", icon: LogOut, logout: true },
];

function isRouteActive(pathname: string | null, href: string): boolean {
  return pathname === href || pathname?.startsWith(`${href}/`) === true;
}

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-[#EEEEEE] bg-sidebar shadow-none transition-[width] duration-300",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-[3.75rem] shrink-0 items-center transition-all",
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!isCollapsed && (
          <Link href="/database/products" className="flex min-w-0 flex-1 items-center pr-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="FIT&LOOK"
              className="h-auto max-h-7 w-full max-w-[min(100%,11rem)] object-contain object-left"
            />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "shrink-0 rounded-lg p-1.5 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-primary",
            !isCollapsed && "ml-auto"
          )}
          aria-label={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたみ"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      <div
        className="shrink-0 border-b border-[#EEEEEE]"
        role="presentation"
        aria-hidden
      />

      <div
        className={cn(
          "shrink-0",
          isCollapsed ? "px-2 pb-2 pt-3" : "px-3 pb-3 pt-3"
        )}
      >
        <button
          type="button"
          onClick={() => setLinkModalOpen(true)}
          className={cn(
            "flex items-center rounded-lg bg-zinc-950 text-zinc-50 shadow-none transition-colors hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            isCollapsed
              ? "mx-auto aspect-square h-10 w-10 shrink-0 justify-center p-0"
              : "w-full gap-2.5 px-3 py-2.5 text-sm font-medium"
          )}
          aria-label="プレビューリンク発行"
          title={isCollapsed ? "プレビューリンク発行" : undefined}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0"
            aria-hidden
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
            <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
          </svg>
          {!isCollapsed ? <span className="truncate">プレビューリンク発行</span> : null}
        </button>
      </div>

      <nav
        className={cn(
          "flex-1 space-y-4 overflow-y-auto py-4",
          isCollapsed ? "px-2" : "px-3"
        )}
      >
        {navGroups.map((group) => (
          <div key={group.label}>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = isRouteActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center overflow-hidden rounded-xl py-3 text-sm font-medium transition-colors",
                        isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                        !isActive &&
                          "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground",
                        isActive && "bg-[#FFF0ED] font-semibold text-[#FF6B35]"
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-[1.125rem] w-[1.125rem] shrink-0 stroke-[1.35] transition-[color,opacity]",
                          isActive ? "text-[#FF6B35]" : "text-muted-foreground/85"
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "overflow-hidden whitespace-nowrap transition-[opacity] duration-300",
                          isCollapsed ? "w-0 opacity-0" : "opacity-100"
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "mt-auto space-y-1 border-t border-[#EEEEEE] py-4",
          isCollapsed ? "px-2" : "px-3"
        )}
      >
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isLogout = item.logout === true;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center overflow-hidden rounded-xl py-3 text-sm font-medium transition-colors",
                isCollapsed ? "justify-center px-2" : "gap-3 px-3"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-[1.125rem] w-[1.125rem] shrink-0 stroke-[1.35] transition-colors",
                  isLogout
                    ? "text-rose-500/85 group-hover:text-rose-700"
                    : "text-muted-foreground/85"
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-[opacity] duration-300",
                  isCollapsed ? "w-0 opacity-0" : "opacity-100",
                  isLogout
                    ? "text-rose-600/90 group-hover:text-rose-800"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="max-h-[min(90vh,800px)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>プレビューリンク発行</DialogTitle>
            <DialogDescription>
              共有リンクの発行と埋め込みスニペットの取得・コピーができます。
            </DialogDescription>
          </DialogHeader>
          <LinkIssuancePanel />
        </DialogContent>
      </Dialog>
    </div>
  );
}
