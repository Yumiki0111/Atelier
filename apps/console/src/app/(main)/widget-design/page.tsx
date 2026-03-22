"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// インターフェース機能は無効化。ダッシュボードへリダイレクト
export default function WidgetDesignPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return (
    <div className="flex min-h-[200px] items-center justify-center text-gray-500">
      リダイレクト中...
    </div>
  );
}
