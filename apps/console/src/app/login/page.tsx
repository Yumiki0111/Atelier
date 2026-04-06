"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // URLパラメータからメッセージを取得
    const messageParam = searchParams.get("message");
    if (messageParam) {
      setMessage(messageParam);
    }

    // 既にログインしている場合はホームにリダイレクト
    if (isAuthenticated && !authLoading) {
      router.replace("/");
    }
  }, [isAuthenticated, authLoading, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await login(email, password);
      // ログイン成功後、ログイン関数内でリダイレクトが実行される
      // 念のため、isAuthenticatedが更新されたらリダイレクト
    } catch (error: any) {
      const message = error?.message || "ログインに失敗しました";
      if (process.env.NODE_ENV === "development") {
        console.error("ログインエラー:", error);
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 認証状態を確認中は何も表示しない
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  // 既にログインしている場合は何も表示しない（リダイレクト中）
  if (isAuthenticated && !authLoading) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="FIT&LOOK"
                width={80}
                height={0}
                className="h-8 w-auto object-contain"
              />
              <span className="text-2xl font-semibold">FIT&LOOK</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{message}</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-1">
                <p className="text-sm text-red-600">{error}</p>
                {error.includes("NEXT_PUBLIC_SUPABASE_URL") && (
                  <p className="text-xs text-red-500">
                    apps/console/.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定し、Supabase ダッシュボードでプロジェクトが有効か確認してください。
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでないですか？{" "}
              <Link href="/signup" className="text-blue-600 hover:underline">
                新規登録
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
