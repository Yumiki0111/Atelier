"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ConsoleMainColumn } from "@/components/shell/ConsoleMainColumn";
import { ProductSelectionProvider } from "@/contexts/ProductSelectionContext";
import { useAuth } from "@/contexts/AuthContext";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // 認証状態を確認中は何もしない
    if (isLoading) return;
    
    // 未認証の場合はログイン画面にリダイレクト
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

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

  const isDevelopment =
    pathname === "/development" || pathname?.startsWith("/development/");

  return (
    <ProductSelectionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <ConsoleMainColumn developmentMode={isDevelopment}>{children}</ConsoleMainColumn>
      </div>
    </ProductSelectionProvider>
  );
}
