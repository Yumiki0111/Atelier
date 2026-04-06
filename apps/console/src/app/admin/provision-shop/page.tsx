"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, UserPlus, Key, Globe, AlertCircle, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ProvisionResult {
  shop_id: string;
  public_key: string;
  secret_key: string;
  message: string;
}

export default function ProvisionShopPage() {
  const [shopName, setShopName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("localhost:3000");
  const [adminToken, setAdminToken] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopName || !ownerEmail || !adminToken) {
      toast.error("すべての必須項目を入力してください");
      return;
    }

    setIsProvisioning(true);
    setResult(null);

    try {
      const domainsArray = allowedDomains
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      const response = await fetch("/api/internal/provision-shop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-Atelier-admin-token": adminToken,
        },
        body: JSON.stringify({
          shopName,
          ownerEmail,
          allowedDomains: domainsArray,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "ショップの作成に失敗しました");
      }

      const data: ProvisionResult = await response.json();
      setResult(data);
      toast.success("ショップを作成し、オーナーに招待メールを送信しました");

      // フォームをリセット（ただしadminTokenは保持）
      setShopName("");
      setOwnerEmail("");
      setAllowedDomains("localhost:3000");
    } catch (error) {
      console.error("Provision error:", error);
      const errorMessage = error instanceof Error ? error.message : "ショップの作成に失敗しました";
      
      if (errorMessage.includes("Unauthorized")) {
        toast.error("管理者トークンが無効です");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsProvisioning(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("クリップボードにコピーしました");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("コピーに失敗しました");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ショップ作成（管理者専用）</h1>
        <p className="text-sm text-gray-600 mt-1">
          新しいショップを作成し、オーナーを招待します
        </p>
      </div>

      {/* 警告 */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">⚠️ 管理者専用機能</p>
              <p>
                この機能はFIT&LOOK運営者のみが使用できます。
                不正なアクセスは記録され、法的措置の対象となります。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 作成フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            ショップ情報
          </CardTitle>
          <CardDescription>
            新しいショップの基本情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProvision} className="space-y-4">
            {/* 管理者トークン */}
            <div className="space-y-2">
              <Label htmlFor="adminToken" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                管理者トークン（必須）
              </Label>
              <Input
                id="adminToken"
                type="password"
                placeholder="Atelier_ADMIN_TOKEN"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                環境変数 Atelier_ADMIN_TOKEN の値を入力してください
              </p>
            </div>

            <div className="border-t pt-4 space-y-4">
              {/* ショップ名 */}
              <div className="space-y-2">
                <Label htmlFor="shopName">ショップ名（必須）</Label>
                <Input
                  id="shopName"
                  placeholder="例: テストショップ"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  disabled={isProvisioning}
                  required
                />
              </div>

              {/* オーナーメール */}
              <div className="space-y-2">
                <Label htmlFor="ownerEmail" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  オーナーメールアドレス（必須）
                </Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  placeholder="owner@example.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  disabled={isProvisioning}
                  required
                />
                <p className="text-xs text-gray-500">
                  このメールアドレスに招待メールが送信されます
                </p>
              </div>

              {/* 許可ドメイン */}
              <div className="space-y-2">
                <Label htmlFor="allowedDomains" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  許可ドメイン
                </Label>
                <Input
                  id="allowedDomains"
                  placeholder="localhost:3000, example.com"
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  disabled={isProvisioning}
                />
                <p className="text-xs text-gray-500">
                  カンマ区切りで複数指定可能（例: localhost:3000, example.com）
                </p>
              </div>
            </div>

            <Button type="submit" disabled={isProvisioning} className="w-full">
              {isProvisioning ? "作成中..." : "ショップを作成"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 作成結果 */}
      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              ショップ作成完了
            </CardTitle>
            <CardDescription className="text-green-700">
              以下の情報を安全に保管してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Shop ID */}
            <div className="space-y-1">
              <Label className="text-sm text-green-800">Shop ID</Label>
              <div className="flex gap-2">
                <Input
                  value={result.shop_id}
                  readOnly
                  className="font-mono text-sm bg-white"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(result.shop_id, "shop_id")}
                >
                  {copiedField === "shop_id" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Public Key */}
            <div className="space-y-1">
              <Label className="text-sm text-green-800">Public Key（クライアント用）</Label>
              <div className="flex gap-2">
                <Input
                  value={result.public_key}
                  readOnly
                  className="font-mono text-sm bg-white"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(result.public_key, "public_key")}
                >
                  {copiedField === "public_key" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Secret Key */}
            <div className="space-y-1">
              <Label className="text-sm text-red-800">
                Secret Key（⚠️ 一度だけ表示）
              </Label>
              <div className="flex gap-2">
                <Input
                  value={result.secret_key}
                  readOnly
                  className="font-mono text-sm bg-white border-red-300"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(result.secret_key, "secret_key")}
                  className="border-red-300"
                >
                  {copiedField === "secret_key" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-red-700 font-medium">
                ⚠️ この画面を閉じると二度と表示されません。必ず安全な場所に保存してください。
              </p>
            </div>

            <div className="p-3 bg-green-100 border border-green-300 rounded-md">
              <p className="text-sm text-green-800">{result.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
