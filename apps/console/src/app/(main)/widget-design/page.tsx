"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { useAuth } from "@/contexts/AuthContext";
import {
  WidgetDesignInterfaceForm,
  WidgetDesignEmptyState,
  type WidgetDesignFormState,
} from "@/features/widget-design/WidgetDesignInterfaceForm";
import { WidgetDesignInterfacePreview } from "@/features/widget-design/WidgetDesignInterfacePreview";
import { useProducts } from "@/features/products/useProducts";
import { useAssets } from "@/features/products/useAssets";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";

const DEFAULTS: WidgetDesignFormState = {
  interfaceBackgroundColor: "#fafafa",
  canvasBackgroundColor: "#fafafa",
  ctaCartLabel: "カートに追加",
  ctaTryOnLabel: "この体型で試着する",
  ctaAccentColor: "#3d3835",
};

async function fetchWidgetDesign(): Promise<WidgetDesignFormState> {
  const res = await authenticatedFetch("/api/widget-design");
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: string;
    };
    if (res.status === 401) {
      throw new Error("ログインの有効期限が切れているか、認証に失敗しました。再度ログインしてください。");
    }
    const hint =
      body.details && typeof body.details === "string"
        ? `（${body.details}）`
        : "";
    throw new Error(`${body.error || "取得に失敗しました"}${hint}`);
  }
  const data = await res.json();
  return {
    interfaceBackgroundColor: data.interfaceBackgroundColor ?? DEFAULTS.interfaceBackgroundColor,
    canvasBackgroundColor: data.canvasBackgroundColor ?? DEFAULTS.canvasBackgroundColor,
    ctaCartLabel: data.ctaCartLabel ?? DEFAULTS.ctaCartLabel,
    ctaTryOnLabel: data.ctaTryOnLabel ?? DEFAULTS.ctaTryOnLabel,
    ctaAccentColor: data.ctaAccentColor ?? DEFAULTS.ctaAccentColor,
  };
}

export default function WidgetDesignPage() {
  const { shopId, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  /** `shopId` は未確定時に `"default_shop"` になり得るため、それだけでは有効とみなさない */
  const hasRealShop =
    isAuthenticated && !authLoading && shopId !== "" && shopId !== "default_shop";

  const { data, isLoading, error } = useQuery({
    queryKey: ["widget-design", shopId],
    queryFn: fetchWidgetDesign,
    enabled: hasRealShop,
  });

  const { data: products = [] } = useProducts();
  const sampleProduct = useMemo(
    () => products.find((p) => isGarmentSpecRenderable(p.garmentSpec)) ?? null,
    [products]
  );
  const { data: sampleAssets = [] } = useAssets(sampleProduct?.id);

  const [form, setForm] = useState<WidgetDesignFormState>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authenticatedFetch("/api/widget-design", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interfaceBackgroundColor: form.interfaceBackgroundColor,
          canvasBackgroundColor: form.canvasBackgroundColor,
          ctaCartLabel: form.ctaCartLabel,
          ctaTryOnLabel: form.ctaTryOnLabel,
          ctaAccentColor: form.ctaAccentColor,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "保存に失敗しました");
      }
      const next = await res.json();
      setForm({
        interfaceBackgroundColor: next.interfaceBackgroundColor ?? DEFAULTS.interfaceBackgroundColor,
        canvasBackgroundColor: next.canvasBackgroundColor ?? DEFAULTS.canvasBackgroundColor,
        ctaCartLabel: next.ctaCartLabel ?? DEFAULTS.ctaCartLabel,
        ctaTryOnLabel: next.ctaTryOnLabel ?? DEFAULTS.ctaTryOnLabel,
        ctaAccentColor: next.ctaAccentColor ?? DEFAULTS.ctaAccentColor,
      });
      await queryClient.invalidateQueries({ queryKey: ["widget-design"] });
      toast.success("保存しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">認証情報を確認しています…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <WidgetDesignEmptyState
          title="ショップにログインしてください"
          description="インターフェース設定を表示するには認証が必要です。"
          variant="muted"
        />
      </div>
    );
  }

  if (!hasRealShop) {
    return (
      <div className="space-y-6">
        <WidgetDesignEmptyState
          title="ショップ情報を取得できませんでした"
          description="アカウントにショップが紐づいていないか、一時的に取得に失敗しました。再読み込みするか、サポートにお問い合わせください。"
          variant="destructive"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <WidgetDesignEmptyState
          title="設定を読み込めませんでした"
          description={
            error instanceof Error
              ? error.message
              : "しばらくしてから再度お試しください。"
          }
          variant="destructive"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
      <div className="min-w-0 flex-1 space-y-6 lg:max-w-md">
        <WidgetDesignInterfaceForm
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={handleSave}
          isLoading={isLoading}
        />
      </div>
      <aside className="shrink-0 lg:sticky lg:top-6 lg:self-start">
        <WidgetDesignInterfacePreview
          interfaceBackgroundColor={form.interfaceBackgroundColor}
          canvasBackgroundColor={form.canvasBackgroundColor}
          ctaCartLabel={form.ctaCartLabel}
          ctaTryOnLabel={form.ctaTryOnLabel}
          ctaAccentColor={form.ctaAccentColor}
          sampleProduct={sampleProduct}
          sampleAssets={sampleAssets}
        />
      </aside>
    </div>
  );
}
