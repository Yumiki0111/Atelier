"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Key, Globe, AlertCircle, Copy, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { PageHeader } from "@/components/page-header/PageHeader";
import { ConsoleSectionPanel } from "@/components/console/ConsoleSectionPanel";
import { consolePageShellClass, consolePrimaryCtaButtonClass } from "@/lib/console-ui";
import { cn } from "@/lib/utils";

interface ProvisionResult {
  shop_id: string;
  public_key: string;
  secret_key: string;
  message: string;
}

export default function ProvisionShopPage() {
  const { isAuthenticated, isLoading, isProvisionAdmin } = useAuth();
  const [shopName, setShopName] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [useAdminToken, setUseAdminToken] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const canProvisionWithSessionOnly = isAuthenticated && isProvisionAdmin;
  const effectiveTokenMode = !canProvisionWithSessionOnly || useAdminToken;

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopName.trim()) {
      toast.error("ショップ名を入力してください");
      return;
    }

    if (effectiveTokenMode && !adminToken.trim()) {
      toast.error("管理者トークンを入力してください");
      return;
    }

    setIsProvisioning(true);
    setResult(null);

    try {
      const domainsArray = allowedDomains
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (effectiveTokenMode) {
        headers["x-admin-token"] = adminToken;
      }

      const response = effectiveTokenMode
        ? await fetch("/api/internal/provision-shop", {
            method: "POST",
            headers,
            body: JSON.stringify({
              shopName: shopName.trim(),
              allowedDomains: domainsArray,
            }),
          })
        : await authenticatedFetch("/api/internal/provision-shop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shopName: shopName.trim(),
              allowedDomains: domainsArray,
            }),
          });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "ショップの作成に失敗しました");
      }

      const data: ProvisionResult = await response.json();
      setResult(data);
      toast.success("ショップを作成しました");

      setShopName("");
      setAllowedDomains("");
    } catch (error) {
      console.error("Provision error:", error);
      const errorMessage = error instanceof Error ? error.message : "ショップの作成に失敗しました";

      if (errorMessage.includes("Unauthorized")) {
        toast.error("権限がありません。運営アカウントでログインするか、管理者トークンを確認してください");
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
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className={consolePageShellClass}>
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className={consolePageShellClass}>
      <PageHeader title="ブランドアカウント発行" />
      <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
        新しいショップ（ブランド）とウィジェット用キーを発行します。オーナー招待は別途行ってください。
      </p>

      {!canProvisionWithSessionOnly ? (
        <ConsoleSectionPanel
          title="初回セットアップ"
          description="運営メールでのログインがまだない場合は、ADMIN_TOKEN で実行できます。"
          icon={Info}
          className="border-blue-200/80 bg-blue-50/40"
          headingClassName="bg-blue-50/80"
        >
          <p className="text-sm text-foreground">
            環境変数 <code className="rounded bg-blue-100/80 px-1.5 py-0.5 text-xs">ADMIN_TOKEN</code>{" "}
            を下のフォームに入力してください。運営アカウント作成後は{" "}
            <Link href="/login" className="font-medium text-primary underline underline-offset-2">
              ログイン
            </Link>
            するとトークンなしで実行できます。
          </p>
        </ConsoleSectionPanel>
      ) : null}

      <ConsoleSectionPanel
        title="運営専用機能"
        description="FIT&LOOK 運営者のみが使用できます。不正なアクセスは記録され、法的措置の対象となります。"
        icon={AlertCircle}
        className="border-amber-200/80 bg-amber-50/30"
        headingClassName="bg-amber-50/50"
      >
        <p className="text-sm text-muted-foreground">
          発行後、オーナー用の <code className="rounded bg-muted px-1 text-xs">pending_invites</code>{" "}
          と招待メールは運用に合わせて設定してください。
        </p>
      </ConsoleSectionPanel>

      <ConsoleSectionPanel
        title="ショップ情報"
        description="ショップ名は必須です。許可ドメインは空のままでも発行でき、後からコンソールのウィジェット設定で追加できます。"
        icon={Building2}
      >
        <form onSubmit={handleProvision} className="space-y-4">
          {canProvisionWithSessionOnly ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-[#EEEEEE] pb-4">
              <Checkbox
                id="useAdminToken"
                checked={useAdminToken}
                onCheckedChange={(v) => setUseAdminToken(v === true)}
              />
              <Label htmlFor="useAdminToken" className="cursor-pointer text-sm font-normal leading-none">
                ADMIN_TOKEN で実行する（CLI・緊急時）
              </Label>
            </div>
          ) : null}

          {effectiveTokenMode ? (
            <div className="space-y-2">
              <Label htmlFor="adminToken" className="flex items-center gap-2">
                <Key className="h-4 w-4" aria-hidden />
                管理者トークン（必須）
              </Label>
              <Input
                id="adminToken"
                type="password"
                placeholder="ADMIN_TOKEN"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">サーバーの ADMIN_TOKEN と同じ値を入力してください</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">現在のログインセッションで認証します（発行管理者メールのみ有効）。</p>
          )}

          <div className="space-y-4 border-t border-[#EEEEEE] pt-4">
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

            <div className="space-y-2">
              <Label htmlFor="allowedDomains" className="flex items-center gap-2">
                <Globe className="h-4 w-4" aria-hidden />
                許可ドメイン（任意）
              </Label>
              <Input
                id="allowedDomains"
                placeholder="空欄可 — 例: localhost:3000, example.com"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                disabled={isProvisioning}
              />
              <p className="text-xs text-muted-foreground">
                カンマ区切り。空欄のときはウィジェット API は許可ドメインを設定するまで利用できません。
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isProvisioning}
            className={cn("w-full", consolePrimaryCtaButtonClass)}
          >
            {isProvisioning ? "作成中..." : "ショップを作成"}
          </Button>

          {!isAuthenticated ? (
            <p className="text-center text-xs text-muted-foreground">
              既にアカウントをお持ちの方は{" "}
              <Link href="/login" className="text-primary underline underline-offset-2">
                ログイン
              </Link>
            </p>
          ) : null}
        </form>
      </ConsoleSectionPanel>

      {result ? (
        <ConsoleSectionPanel
          title="ショップ作成完了"
          description="以下の情報を安全に保管してください。Secret Key はこの画面を閉じると再表示できません。"
          icon={CheckCircle}
          className="border-emerald-200/80 bg-emerald-50/25"
          headingClassName="bg-emerald-50/60"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Shop ID</Label>
              <div className="flex gap-2">
                <Input value={result.shop_id} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" type="button" onClick={() => copyToClipboard(result.shop_id, "shop_id")}>
                  {copiedField === "shop_id" ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Public Key（クライアント用）</Label>
              <div className="flex gap-2">
                <Input value={result.public_key} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" type="button" onClick={() => copyToClipboard(result.public_key, "public_key")}>
                  {copiedField === "public_key" ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-destructive">Secret Key（一度だけ表示）</Label>
              <div className="flex gap-2">
                <Input value={result.secret_key} readOnly className="font-mono text-sm border-destructive/30" />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  className="border-destructive/30"
                  onClick={() => copyToClipboard(result.secret_key, "secret_key")}
                >
                  {copiedField === "secret_key" ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900">
              {result.message}
            </p>
          </div>
        </ConsoleSectionPanel>
      ) : null}
    </div>
  );
}
