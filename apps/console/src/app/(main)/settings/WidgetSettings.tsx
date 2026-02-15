"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Globe, Copy, CheckCircle, Eye, EyeOff, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth/api-client";

interface WidgetSettingsProps {
  shopId: string;
}

export function WidgetSettings({ shopId }: WidgetSettingsProps) {
  const [widgetKeys, setWidgetKeys] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingDomains, setIsEditingDomains] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [domainList, setDomainList] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchWidgetKeys();
  }, [shopId]);

  const fetchWidgetKeys = async () => {
    if (!shopId) return;

    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/widget-keys?shopId=${shopId}`);
      if (response.ok) {
        const data = await response.json();
        const key = data[0];
        setWidgetKeys(key);
        const domains = key?.allowed_domains || [];
        setDomainList(Array.isArray(domains) ? domains : []);
      }
    } catch (error) {
      console.error("Failed to fetch widget keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractDomain = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const url = new URL(trimmed);
        return url.hostname;
      }

      if (trimmed.includes(":")) {
        const [host] = trimmed.split(":");
        if (host === "localhost" || /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(host)) {
          return trimmed.toLowerCase();
        }
      }

      const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^localhost(:\d+)?$/;
      if (domainRegex.test(trimmed)) return trimmed.toLowerCase();

      return null;
    } catch {
      const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^localhost(:\d+)?$/;
      if (domainRegex.test(trimmed)) return trimmed.toLowerCase();
      return null;
    }
  };

  const handleAddDomain = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent) => {
    e.preventDefault();
    const trimmedDomain = domainInput.trim();
    if (!trimmedDomain) return;

    const domains = trimmedDomain.split(",").map(d => d.trim()).filter(d => d.length > 0);
    let addedCount = 0;

    for (const d of domains) {
      const extractedDomain = extractDomain(d);
      if (!extractedDomain) { toast.error(`無効なドメイン: ${d}`); continue; }
      if (domainList.includes(extractedDomain)) { toast.error(`既に追加済み: ${extractedDomain}`); continue; }
      setDomainList((prev) => [...prev, extractedDomain]);
      addedCount++;
    }

    if (addedCount > 0) toast.success(`${addedCount}件のドメインを追加しました`);
    setDomainInput("");
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    setDomainList((prev) => prev.filter((domain) => domain !== domainToRemove));
  };

  const handleSaveDomains = async () => {
    if (!widgetKeys) return;

    setIsUpdating(true);
    try {
      const response = await authenticatedFetch(`/api/widget-keys/${widgetKeys.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed_domains: domainList }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "許可ドメインの更新に失敗しました");
      }

      const updatedData = await response.json();
      setWidgetKeys(updatedData);
      const domains = updatedData?.allowed_domains || [];
      setDomainList(Array.isArray(domains) ? domains : []);

      toast.success("許可ドメインを更新しました");
      setIsEditingDomains(false);
      await fetchWidgetKeys();
    } catch (error) {
      console.error("Update domains error:", error);
      toast.error(error instanceof Error ? error.message : "許可ドメインの更新に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setDomainList(widgetKeys?.allowed_domains || []);
    setDomainInput("");
    setIsEditingDomains(false);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Widget 設定</CardTitle>
          <CardDescription>公開APIキーとドメイン設定</CardDescription>
        </CardHeader>
        <CardContent><p className="text-sm text-gray-500">読み込み中...</p></CardContent>
      </Card>
    );
  }

  if (!widgetKeys) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Widget 設定</CardTitle>
          <CardDescription>公開APIキーとドメイン設定</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Widget キーが見つかりません</p>
                <p>管理者に連絡して、Widget キーを発行してもらってください。</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Widget 設定</CardTitle>
        <CardDescription>公開APIキーとドメイン設定</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Public Key */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600">Public Key（クライアント用）</Label>
          <div className="flex gap-2">
            <Input
              value={showPublicKey ? widgetKeys.public_key : "pub_live_••••••••••••••••"}
              readOnly
              className="font-mono text-sm bg-gray-50"
            />
            <Button variant="outline" size="icon" onClick={() => setShowPublicKey(!showPublicKey)}>
              {showPublicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(widgetKeys.public_key, "public_key")}>
              {copiedField === "public_key" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500">このキーをウェブサイトに埋め込んで、Widget APIを使用します</p>
        </div>

        {/* Allowed Domains */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Globe className="h-4 w-4" />許可ドメイン
            </Label>
            {!isEditingDomains ? (
              <Button
                variant="outline" size="sm"
                onClick={() => {
                  const domains = widgetKeys?.allowed_domains || [];
                  setDomainList(Array.isArray(domains) ? domains : []);
                  setIsEditingDomains(true);
                }}
              >
                編集
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isUpdating}>キャンセル</Button>
                <Button size="sm" onClick={handleSaveDomains} disabled={isUpdating}>
                  {isUpdating ? "保存中..." : "保存"}
                </Button>
              </div>
            )}
          </div>

          {isEditingDomains ? (
            <div className="space-y-2">
              {domainList.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-gray-50 min-h-[60px]">
                  {domainList.map((domain) => (
                    <div key={domain} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md text-sm font-mono">
                      <Globe className="h-3.5 w-3.5" />
                      <span>{domain}</span>
                      <button type="button" onClick={() => handleRemoveDomain(domain)} className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors" disabled={isUpdating}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="example.com と入力して Enter またはカンマ（,）で確定"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAddDomain(e); }
                  }}
                  className="pl-9"
                  disabled={isUpdating}
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter キーまたはカンマ（,）でドメインを確定します。複数のドメインを一度に追加できます。
              </p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-gray-50 border rounded-md">
                {domainList && domainList.length > 0 ? (
                  <ul className="space-y-1">
                    {domainList.map((domain: string, index: number) => (
                      <li key={index} className="text-sm font-mono">• {domain}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">ドメインが設定されていません</p>
                )}
              </div>
              <p className="text-xs text-gray-500">これらのドメインからのみ Widget API を使用できます</p>
            </>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600">ステータス</Label>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${widgetKeys.enabled ? "bg-green-500" : "bg-gray-300"}`} />
            <span className="text-sm">{widgetKeys.enabled ? "有効" : "無効"}</span>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Widget API の使い方:</p>
              <p>
                <code className="bg-blue-100 px-1 rounded text-xs">
                  GET /api/public/widget-config?publicKey={"{PUBLIC_KEY}"}&externalProductId={"{PRODUCT_ID}"}
                </code>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
