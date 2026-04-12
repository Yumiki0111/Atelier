"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { ShareDemoLinkSection } from "@/features/demo-share/ShareDemoLinkSection";

interface WidgetKey {
  id: string;
  shop_id: string;
  public_key: string;
  allowed_domains: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

async function fetchWidgetKeys(shopId: string): Promise<WidgetKey[]> {
  const response = await authenticatedFetch(`/api/widget-keys?shopId=${encodeURIComponent(shopId)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch widget keys");
  }
  return response.json();
}

async function fetchWidgetDesignForInstall(): Promise<{ launcherPlacement?: string } | null> {
  const r = await authenticatedFetch("/api/widget-design");
  if (!r.ok) return null;
  return r.json();
}

export function LinkIssuancePanel() {
  const { shopId } = useAuth();
  const embedFromDesign = useRef(false);
  useEffect(() => {
    embedFromDesign.current = false;
  }, [shopId]);
  const { data: widgetKeys = [], isLoading: isLoadingKeys } = useQuery({
    queryKey: ["widget-keys", shopId],
    queryFn: () => fetchWidgetKeys(shopId),
    enabled: !!shopId,
  });
  const { data: shopWidgetDesign } = useQuery({
    queryKey: ["widget-design", shopId],
    queryFn: fetchWidgetDesignForInstall,
    enabled: !!shopId,
  });
  const [copied, setCopied] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string>("");

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_WIDGET_CDN_URL;
    if (envUrl) {
      setWidgetUrl(envUrl);
    } else if (typeof window !== "undefined") {
      setWidgetUrl(`${window.location.origin}/widget.js`);
    }
  }, []);

  const publicKey = widgetKeys.find((key) => key.enabled)?.public_key;

  const [embedMode, setEmbedMode] = useState<"floating" | "inline">("inline");

  useEffect(() => {
    if (!shopWidgetDesign || embedFromDesign.current) return;
    embedFromDesign.current = true;
    setEmbedMode(shopWidgetDesign.launcherPlacement === "floating" ? "floating" : "inline");
  }, [shopWidgetDesign]);

  const generateSnippet = (externalProductId?: string, mode: "floating" | "inline" = "floating") => {
    if (!publicKey) {
      return "<!-- Widgetキーが設定されていません。設定ページでWidgetキーを確認してください。 -->";
    }

    if (!widgetUrl) {
      return "<!-- ウィジェットURLを読み込み中... -->";
    }

    const attributes: string[] = [`data-fitlook-public-key="${publicKey}"`];

    if (externalProductId) {
      attributes.push(`data-fitlook-external-product-id="${externalProductId}"`);
    }

    if (mode === "inline") {
      attributes.push(`data-fitlook-placement="inline"`);
      attributes.push(`data-fitlook-initial-size="M"`);
    }

    const inlineHint =
      mode === "inline"
        ? `<!-- サイズ行ごとに data-fitlook-initial-size を、その行のサイズキー（S/M/L 等）に合わせて変えてください -->\n`
        : "";

    return `${inlineHint}<div
  ${attributes.join("\n  ")}>
</div>
<script async src="${widgetUrl}"></script>`;
  };

  const snippet = generateSnippet(undefined, embedMode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("スニペットをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const isLoading = isLoadingKeys;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">読み込み中…</p>;
  }

  if (!publicKey) {
    return <p className="text-sm font-medium text-foreground">Widget キーがまだありません</p>;
  }

  return (
    <div className="space-y-8">
      <ShareDemoLinkSection />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="embed-mode">埋め込みスタイル</Label>
          <p className="text-xs text-muted-foreground">
            既定は「インターフェース」の起動ボタン設定に合わせます。変更はどちらからでも可能です。
          </p>
          <Select
            value={embedMode}
            onValueChange={(value) => setEmbedMode(value as "floating" | "inline")}
          >
            <SelectTrigger id="embed-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="floating">フローティング（右下固定ボタン）</SelectItem>
              <SelectItem value="inline">インライン（サイズ表・ブロック内に配置）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>埋め込みスニペット</Label>
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  コピーしました
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  コピー
                </>
              )}
            </Button>
          </div>
          <textarea
            value={snippet}
            readOnly
            className="min-h-[100px] w-full resize-none rounded-md border border-input bg-background p-3 font-mono text-sm text-foreground"
          />
        </div>
      </div>
    </div>
  );
}
