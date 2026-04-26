"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ConsoleMainColumn } from "@/components/shell/ConsoleMainColumn";
import { ProductSelectionProvider } from "@/contexts/ProductSelectionContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isAuthenticated,
    isLoading,
    canAccessDevelopment,
    isProvisionAdmin,
    operatorShopId,
    setOperatorShopId,
  } = useAuth();

  useEffect(() => {
    // 認証状態を確認中は何もしない
    if (isLoading) return;
    
    // 未認証の場合はログイン画面にリダイレクト
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const isDevelopmentPath =
    pathname === "/development" || pathname?.startsWith("/development/");

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (isDevelopmentPath && !canAccessDevelopment) {
      router.replace("/database/products");
    }
  }, [
    isLoading,
    isAuthenticated,
    isDevelopmentPath,
    canAccessDevelopment,
    router,
  ]);

  // 認証状態を確認中は何も表示しない
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  // 未認証の場合は何も表示しない（リダイレクト中）
  if (!isAuthenticated) {
    return null;
  }

  // メンバーが /development を直打ちした場合、子を描画せずリダイレクト待ち
  if (isDevelopmentPath && !canAccessDevelopment) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">移動中...</p>
      </div>
    );
  }

  const isDevelopment = isDevelopmentPath;

  return (
    <ProductSelectionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          {isProvisionAdmin && operatorShopId ? (
            <div
              className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-amber-200/90 bg-amber-50/90 px-4 py-2 text-sm text-amber-950"
              role="status"
            >
              <span>
                運営モード: ブランドショップの管理画面を表示中（Shop ID{" "}
                <code className="rounded bg-amber-100/90 px-1 font-mono text-xs">{operatorShopId}</code>）
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 border-amber-300 bg-background" asChild>
                  <Link href="/admin/shops">ショップを切り替え</Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-amber-900 hover:bg-amber-100/80"
                  onClick={() => {
                    setOperatorShopId(null);
                    router.push("/admin/provision-shop");
                  }}
                >
                  運営メニューに戻る
                </Button>
              </div>
            </div>
          ) : null}
          <ConsoleMainColumn developmentMode={isDevelopment}>{children}</ConsoleMainColumn>
        </div>
      </div>
    </ProductSelectionProvider>
  );
}
