"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ConsoleMainColumn } from "@/components/shell/ConsoleMainColumn";
import { ProductSelectionProvider } from "@/contexts/ProductSelectionContext";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isProvisionAdmin } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ProductSelectionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {isProvisionAdmin ? (
            <div className="flex h-11 shrink-0 items-center justify-between gap-4 border-b border-[#EEEEEE] bg-background px-4 text-sm">
              <span className="truncate text-muted-foreground">運営 · アカウント発行</span>
              <Link
                href="/database/products"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                ブランド向けコンソール
              </Link>
            </div>
          ) : null}
          <ConsoleMainColumn>{children}</ConsoleMainColumn>
        </div>
      </div>
    </ProductSelectionProvider>
  );
}
