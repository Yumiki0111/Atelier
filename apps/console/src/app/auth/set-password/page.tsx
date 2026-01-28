"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, [isAuthenticated, user]);

  const checkAuthState = async () => {
    // 認証状態を確認
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      // セッションがない場合はログインページへ
      router.push("/login?message=パスワード設定にはログインが必要です。招待メールのリンクからアクセスしてください。");
      return;
    }

    // 招待リンクから来た場合、セッションは存在するがパスワードが未設定の可能性がある
    // このページでパスワードを設定する
    
    setIsChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error("パスワードを入力してください");
      return;
    }

    if (password.length < 6) {
      toast.error("パスワードは6文字以上で入力してください");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("パスワードが一致しません");
      return;
    }

    setIsSubmitting(true);

    try {
      // Supabase でパスワードを更新
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (updateError) {
        throw new Error(updateError.message || "パスワードの設定に失敗しました");
      }

      toast.success("パスワードを設定しました");
      
      // オンボーディングページへリダイレクト（名前やショップ名の設定）
      router.push("/onboarding");
    } catch (error) {
      console.error("Set password error:", error);
      const errorMessage = error instanceof Error ? error.message : "パスワードの設定に失敗しました";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-4 text-sm text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Key className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">パスワードを設定</CardTitle>
          <CardDescription className="text-base">
            Atelier にアクセスするためのパスワードを設定してください
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* メールアドレス表示 */}
            {user?.email && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">メールアドレス:</span> {user.email}
                </p>
              </div>
            )}

            {/* パスワード入力 */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">
                パスワード <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="6文字以上で入力してください"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  minLength={6}
                  className="text-base h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* パスワード確認 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base">
                パスワード（確認） <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="同じパスワードを入力してください"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  minLength={6}
                  className="text-base h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">パスワードについて:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>6文字以上で入力してください</li>
                    <li>安全のため、推測されにくいパスワードを設定してください</li>
                    <li>パスワードを忘れた場合は、管理者に連絡してください</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 送信ボタン */}
            <Button
              type="submit"
              disabled={isSubmitting || !password.trim() || !confirmPassword.trim()}
              className="w-full h-12 text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  設定中...
                </>
              ) : (
                "パスワードを設定"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
