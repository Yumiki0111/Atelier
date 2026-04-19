"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsoleSectionPanel } from "@/components/console/ConsoleSectionPanel";
import { Key, Globe, Copy, CheckCircle, Eye, EyeOff, X } from "lucide-react";
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
      <ConsoleSectionPanel
        title="埋め込みキーとドメイン"
        description="公開用キーと、ウィジェットを表示してよいドメインを管理します。"
        icon={Key}
      >
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </ConsoleSectionPanel>
    );
  }

  if (!widgetKeys) {
    return (
      <ConsoleSectionPanel
        title="埋め込みキーとドメイン"
        description="公開用キーと、ウィジェットを表示してよいドメインを管理します。"
        icon={Key}
      >
        <p className="text-sm text-muted-foreground">Widget キーが見つかりません</p>
      </ConsoleSectionPanel>
    );
  }

  return (
    <ConsoleSectionPanel
      title="埋め込みキーとドメイン"
      description="公開用キーと、ウィジェットを表示してよいドメインを管理します。"
      icon={Key}
    >
      <div className="space-y-4">
        {/* Public Key */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Public Key（クライアント用）</Label>
          <div className="flex gap-2">
            <Input
              value={showPublicKey ? widgetKeys.public_key : "pub_live_••••••••••••••••"}
              readOnly
              className="font-mono text-sm bg-muted/40"
            />
            <Button variant="outline" size="icon" onClick={() => setShowPublicKey(!showPublicKey)}>
              {showPublicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(widgetKeys.public_key, "public_key")}>
              {copiedField === "public_key" ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Allowed Domains */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm text-muted-foreground">
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
                <div className="flex min-h-[60px] flex-wrap gap-2 rounded-md bg-secondary/50 p-3">
                  {domainList.map((domain) => (
                    <div key={domain} className="flex items-center gap-1.5 rounded-md bg-muted/50 px-3 py-1.5 font-mono text-sm text-foreground">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{domain}</span>
                      <button type="button" onClick={() => handleRemoveDomain(domain)} className="ml-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" disabled={isUpdating}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            </div>
          ) : (
            <>
              <div className="rounded-md bg-muted/40 p-3">
                {domainList && domainList.length > 0 ? (
                  <ul className="space-y-1">
                    {domainList.map((domain: string, index: number) => (
                      <li key={index} className="text-sm font-mono">• {domain}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">ドメインが設定されていません</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">ステータス</Label>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${widgetKeys.enabled ? "bg-primary" : "bg-muted-foreground/30"}`} />
            <span className="text-sm">{widgetKeys.enabled ? "有効" : "無効"}</span>
          </div>
        </div>
      </div>
    </ConsoleSectionPanel>
  );
}
