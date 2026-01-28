"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth/api-client";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, shopId, userRole } = useAuth();
  const [shopName, setShopName] = useState("");
  const [userName, setUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [currentShopName, setCurrentShopName] = useState<string | null>(null);
  
  // オーナーのみショップ名を変更可能
  const isOwner = userRole === "owner";

  useEffect(() => {
    checkOnboardingStatus();
  }, [shopId]);

  const checkOnboardingStatus = async () => {
    if (!shopId) return;

    try {
      // プロフィール情報を取得（name が設定されているかチェック）
      const profileResponse = await authenticatedFetch("/api/auth/profile");
      let userName: string | null = null;
      
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        userName = profile.name || null;
      }

      // shops テーブルから現在のショップ名を取得
      const shopResponse = await authenticatedFetch(`/api/shops/${shopId}`);
      
      if (shopResponse.ok) {
        const shop = await shopResponse.json();
        
        // ショップ名とユーザー名の両方が設定されている場合はダッシュボードへ
        if (shop.name && shop.name !== "新規ショップ" && userName) {
          router.push("/");
          return;
        }
        
        setCurrentShopName(shop.name || "");
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    } finally {
      setIsCheckingOnboarding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // オーナーの場合のみショップ名を必須
    if (isOwner && !shopName.trim()) {
      toast.error("ショップ名を入力してください");
      return;
    }

    if (!userName.trim()) {
      toast.error("名前を入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      // オーナーの場合のみショップ名を更新
      if (isOwner) {
        const shopResponse = await authenticatedFetch(`/api/shops/${shopId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: shopName.trim(),
          }),
        });

        if (!shopResponse.ok) {
          const error = await shopResponse.json();
          throw new Error(error.error || "ショップ名の更新に失敗しました");
        }
      }

      // ユーザー名を更新
      const profileResponse = await authenticatedFetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userName.trim(),
        }),
      });

      if (!profileResponse.ok) {
        const error = await profileResponse.json();
        throw new Error(error.error || "名前の更新に失敗しました");
      }

      toast.success("基本情報を設定しました");
      router.push("/");
    } catch (error) {
      console.error("Onboarding error:", error);
      const errorMessage = error instanceof Error ? error.message : "エラーが発生しました";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingOnboarding) {
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
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Atelier へようこそ！</CardTitle>
          <CardDescription className="text-base">
            {isOwner 
              ? "まずはショップの基本情報を設定しましょう"
              : "まずはあなたの基本情報を設定しましょう"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ステップインジケーター */}
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="text-sm font-medium text-blue-600">基本情報</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm text-gray-500">完了</span>
              </div>
            </div>

            {/* 名前入力 */}
            <div className="space-y-2">
              <Label htmlFor="userName" className="text-base">
                お名前 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="userName"
                placeholder="例: 山田 太郎"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={isSubmitting}
                required
                className="text-base h-12"
              />
            </div>

            {/* ショップ名入力（オーナーのみ） */}
            {isOwner && (
              <div className="space-y-2">
                <Label htmlFor="shopName" className="text-base">
                  ショップ名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="shopName"
                  placeholder="例: 株式会社サンプル"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="text-base h-12"
                />
                <p className="text-sm text-gray-500">
                  あとから変更できます
                </p>
              </div>
            )}

            {/* メンバーの場合、ショップ名を表示のみ */}
            {!isOwner && currentShopName && (
              <div className="space-y-2">
                <Label className="text-base">ショップ名</Label>
                <div className="p-3 bg-gray-50 border rounded-md">
                  <p className="text-base font-medium">{currentShopName}</p>
                </div>
                <p className="text-sm text-gray-500">
                  ショップ名の変更はオーナーのみ可能です
                </p>
              </div>
            )}

            {/* メール情報（確認用） */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    アカウント情報
                  </p>
                  <p className="text-sm text-blue-700">
                    メール: <span className="font-mono">{user?.email}</span>
                  </p>
                  <p className="text-sm text-blue-700">
                    Shop ID: <span className="font-mono text-xs">{shopId}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || !userName.trim() || (isOwner && !shopName.trim())}
                className="flex-1 h-12 text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    設定中...
                  </>
                ) : (
                  "次へ進む"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
