"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-gray-500">ログアウト中...</p>
    </div>
  );
}
