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
import {
  WIDGET_DESIGN_CANVAS_BG_DEFAULT,
  WIDGET_DESIGN_CTA_ACCENT_DEFAULT,
  WIDGET_DESIGN_INTERFACE_BG_DEFAULT,
  normalizeWidgetCtaAccentColor,
} from "@Atelier/shared";
import { PageHeader } from "@/components/page-header/PageHeader";
import { consolePageShellClass, consolePanelClass } from "@/lib/console-ui";
import { cn } from "@/lib/utils";

const DEFAULTS: WidgetDesignFormState = {
  launcherPlacement: "inline",
  buttonShape: "pill",
  buttonColor: "#ffffff",
  buttonText: "自分のサイズで試着",
  interfaceBackgroundColor: WIDGET_DESIGN_INTERFACE_BG_DEFAULT,
  canvasBackgroundColor: WIDGET_DESIGN_CANVAS_BG_DEFAULT,
  ctaCartLabel: "カートに追加",
  ctaTryOnLabel: "この体型で試着する",
  ctaAccentColor: WIDGET_DESIGN_CTA_ACCENT_DEFAULT,
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
    launcherPlacement: data.launcherPlacement === "floating" ? "floating" : "inline",
    buttonShape: data.buttonShape === "circle" ? "circle" : "pill",
    buttonColor: data.buttonColor ?? DEFAULTS.buttonColor,
    buttonText: data.buttonText ?? DEFAULTS.buttonText,
    interfaceBackgroundColor: data.interfaceBackgroundColor ?? DEFAULTS.interfaceBackgroundColor,
    canvasBackgroundColor: data.canvasBackgroundColor ?? DEFAULTS.canvasBackgroundColor,
    ctaCartLabel: data.ctaCartLabel ?? DEFAULTS.ctaCartLabel,
    ctaTryOnLabel: data.ctaTryOnLabel ?? DEFAULTS.ctaTryOnLabel,
    ctaAccentColor: normalizeWidgetCtaAccentColor(data.ctaAccentColor),
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
          launcherPlacement: form.launcherPlacement,
          buttonShape: form.buttonShape,
          buttonColor: form.buttonColor,
          buttonText: form.buttonText,
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
        launcherPlacement: next.launcherPlacement === "floating" ? "floating" : "inline",
        buttonShape: next.buttonShape === "circle" ? "circle" : "pill",
        buttonColor: next.buttonColor ?? DEFAULTS.buttonColor,
        buttonText: next.buttonText ?? DEFAULTS.buttonText,
        interfaceBackgroundColor: next.interfaceBackgroundColor ?? DEFAULTS.interfaceBackgroundColor,
        canvasBackgroundColor: next.canvasBackgroundColor ?? DEFAULTS.canvasBackgroundColor,
        ctaCartLabel: next.ctaCartLabel ?? DEFAULTS.ctaCartLabel,
        ctaTryOnLabel: next.ctaTryOnLabel ?? DEFAULTS.ctaTryOnLabel,
        ctaAccentColor: normalizeWidgetCtaAccentColor(next.ctaAccentColor),
      });
      await queryClient.invalidateQueries({ queryKey: ["widget-design"] });
      toast.success("保存しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const pageHeader = <PageHeader title="インターフェース" />;

  if (authLoading) {
    return (
      <div className={consolePageShellClass}>
        {pageHeader}
        <p className="text-sm text-muted-foreground">認証情報を確認しています…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={consolePageShellClass}>
        {pageHeader}
        <WidgetDesignEmptyState title="ショップにログインしてください" variant="muted" />
      </div>
    );
  }

  if (!hasRealShop) {
    return (
      <div className={consolePageShellClass}>
        {pageHeader}
        <WidgetDesignEmptyState title="ショップ情報を取得できませんでした" variant="destructive" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={consolePageShellClass}>
        {pageHeader}
        <WidgetDesignEmptyState title="設定を読み込めませんでした" variant="destructive" />
      </div>
    );
  }

  return (
    <div className={consolePageShellClass}>
      {pageHeader}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
        <div
          className={cn(
            consolePanelClass,
            "min-w-0 w-full shrink-0 overflow-hidden lg:max-w-xl"
          )}
        >
          <div className="border-b border-[#EEEEEE] bg-[#FAFAFA] px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-foreground">設定</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              店頭の起動ボタンと、試着ウィジェット内の色・文言をまとめて変更します。
            </p>
          </div>
          <div className="min-w-0 px-0">
            <WidgetDesignInterfaceForm
              form={form}
              setForm={setForm}
              saving={saving}
              onSave={handleSave}
              isLoading={isLoading}
            />
          </div>
        </div>
        <aside
          className={cn(
            consolePanelClass,
            "flex min-w-0 w-full flex-1 flex-col items-center overflow-hidden lg:items-stretch xl:sticky xl:top-4 xl:self-start"
          )}
        >
          <div className="w-full border-b border-[#EEEEEE] bg-[#FAFAFA] px-5 py-4 text-left sm:px-6">
            <h2 className="text-sm font-semibold text-foreground">プレビュー</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              保存前の見え方の目安です。実際の店舗テーマとは異なる場合があります。
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-1 flex-col items-center px-3 py-4 sm:px-5">
          <WidgetDesignInterfacePreview
            launcherPlacement={form.launcherPlacement}
            buttonShape={form.buttonShape}
            buttonColor={form.buttonColor}
            buttonText={form.buttonText}
            interfaceBackgroundColor={form.interfaceBackgroundColor}
            canvasBackgroundColor={form.canvasBackgroundColor}
            ctaCartLabel={form.ctaCartLabel}
            ctaTryOnLabel={form.ctaTryOnLabel}
            ctaAccentColor={form.ctaAccentColor}
            sampleProduct={sampleProduct}
            sampleAssets={sampleAssets}
          />
          </div>
        </aside>
      </div>
    </div>
  );
}
