"use client";

import { useState } from "react";
import { useProducts } from "@/features/products/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function ShareDemoLinkSection() {
  const { shopId } = useAuth();
  const { data: products = [], isLoading } = useProducts();
  const [productId, setProductId] = useState<string | null>(null);
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!productId) {
      toast.error("商品を選択してください");
      return;
    }
    setLoading(true);
    setIssuedUrl(null);
    try {
      const res = await authenticatedFetch("/api/demo-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "発行に失敗しました");
      }
      if (data.url) {
        setIssuedUrl(data.url);
        toast.success("共有リンクを発行しました");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "発行に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!issuedUrl) return;
    try {
      await navigator.clipboard.writeText(issuedUrl);
      setCopied(true);
      toast.success("URL をコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  if (!shopId) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold tracking-tight text-foreground">共有リンク</h2>

      <div className="space-y-2">
        <Label htmlFor="share-product">商品</Label>
        <Select
          value={productId || "none"}
          onValueChange={(v) => {
            setProductId(v === "none" ? null : v);
            setIssuedUrl(null);
          }}
          disabled={isLoading}
        >
          <SelectTrigger id="share-product">
            <SelectValue placeholder={isLoading ? "読み込み中..." : "商品を選択"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">選択してください</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id} title={p.name}>
                <span className="line-clamp-1 block min-w-0 text-left">
                  {p.name}
                  {p.externalProductId ? "" : "（外部ID未設定・発行不可）"}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="button" onClick={handleGenerate} disabled={loading || !productId} className="w-full sm:w-auto">
        {loading ? "発行中..." : "共有リンクを発行"}
      </Button>

      {issuedUrl && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">共有 URL</Label>
            <a
              href={issuedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1 inline-flex")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              開く
            </a>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "コピー済み" : "コピー"}
            </Button>
          </div>
          <p className="break-all font-mono text-xs text-foreground">{issuedUrl}</p>
        </div>
      )}

    </div>
  );
}
