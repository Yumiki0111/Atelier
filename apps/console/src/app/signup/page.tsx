"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 既にログインしている場合はホームにリダイレクト
    if (isAuthenticated && !authLoading) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await signup(email, password, name);
      // サインアップ成功後、ログインページにリダイレクト
      router.push("/login?message=アカウントが作成されました。ログインしてください。");
    } catch (error: any) {
      console.error("サインアップエラー:", error);
      
      // エラーメッセージの処理
      let errorMessage = error.message || "サインアップに失敗しました";
      
      if (errorMessage.includes("招待されていません") || errorMessage.includes("Not invited")) {
        errorMessage = "このメールアドレスは招待されていません。アカウントを作成するには、管理者からの招待が必要です。";
      }
      
      setError(errorMessage);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Atelier"
                width={80}
                height={0}
                className="h-8 w-auto object-contain"
              />
              <span className="text-2xl font-semibold">Atelier</span>
            </div>
          </div>

          {/* Info Message */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>招待制システム:</strong> アカウントを作成するには、管理者からの招待が必要です。招待メールに記載されたメールアドレスを使用してください。
            </p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">名前（任意）</Label>
              <Input
                id="name"
                type="text"
                placeholder="山田 太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@atelier.com"
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
                minLength={6}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">6文字以上で入力してください</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "登録中..." : "アカウントを作成"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              既にアカウントをお持ちですか？{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
