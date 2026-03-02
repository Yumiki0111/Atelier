"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/", label: "ダッシュボード", icon: "/icon/home.png" },
  { href: "/widget-design", label: "インターフェース", icon: "/icon/palet.png" },
  { href: "/database/products", label: "商品データベース", icon: "/icon/jacket.png" },
  { href: "/analytics", label: "アナリティクス", icon: "/icon/analysis.png" },
  { href: "/install", label: "埋め込みスニペット", icon: "/icon/book.png" },
];

const bottomItems = [
  { href: "/settings", label: "アカウント設定", icon: "/icon/setting.png" },
  { href: "/logout", label: "ログアウト", icon: "/icon/log_out.png" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r bg-white transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b transition-all",
          isCollapsed ? "justify-center px-2" : "justify-between px-6"
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Atelier"
              width={80}
              height={0}
              className="h-6 w-auto object-contain"
            />
            <span className="text-xl font-semibold">Atelier</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "rounded-lg p-1.5 hover:bg-gray-100 transition-colors",
            !isCollapsed && "ml-auto"
          )}
          aria-label={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたみ"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 space-y-2 py-4 overflow-y-auto",
          isCollapsed ? "px-2" : "px-4"
        )}
      >
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg py-3 text-sm font-medium transition-colors overflow-hidden",
                isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Image
                src={item.icon}
                alt={item.label}
                width={20}
                height={20}
                className="h-5 w-5 object-contain flex-shrink-0"
              />
              <span
                className={cn(
                  "whitespace-nowrap overflow-hidden transition-opacity duration-300",
                  isCollapsed ? "opacity-0 w-0" : "opacity-100"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        
      </nav>

      {/* Bottom items */}
      <div
        className={cn(
          "border-t py-4 space-y-2",
          isCollapsed ? "px-2" : "px-4"
        )}
      >
        {bottomItems.map((item) => {
          const isLogout = item.href === "/logout";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg py-3 text-sm font-medium transition-colors overflow-hidden",
                isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                isLogout
                  ? "text-red-600 hover:bg-red-50 hover:text-red-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Image
                src={item.icon}
                alt={item.label}
                width={20}
                height={20}
                className="h-5 w-5 object-contain flex-shrink-0"
              />
              <span
                className={cn(
                  "whitespace-nowrap overflow-hidden transition-opacity duration-300",
                  isCollapsed ? "opacity-0 w-0" : "opacity-100"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
