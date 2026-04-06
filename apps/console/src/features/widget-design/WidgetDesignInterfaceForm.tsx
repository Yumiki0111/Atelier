"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type WidgetDesignFormState = {
  interfaceBackgroundColor: string;
  canvasBackgroundColor: string;
  ctaCartLabel: string;
  ctaTryOnLabel: string;
  /** カート／体型確定などのアクセント */
  ctaAccentColor: string;
};

function ColorHexField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="color"
          className="h-10 w-14 shrink-0 cursor-pointer p-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm"
          spellCheck={false}
          aria-label={`${label}（16進）`}
        />
      </div>
    </div>
  );
}

function WidgetDesignPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </div>
  );
}

export function WidgetDesignInterfaceForm({
  form,
  setForm,
  saving,
  onSave,
  isLoading,
}: {
  form: WidgetDesignFormState;
  setForm: React.Dispatch<React.SetStateAction<WidgetDesignFormState>>;
  saving: boolean;
  onSave: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-8">
      <WidgetDesignPageHeader
        title="インターフェース"
        description="背景・描画キャンパス・ボタン文言を変更します。右側で試着画面の見た目を確認できます。"
      />

      <div className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <ColorHexField
                id="iface-bg"
                label="背景（フォン画面内）"
                value={form.interfaceBackgroundColor}
                onChange={(v) => setForm((f) => ({ ...f, interfaceBackgroundColor: v }))}
              />
              <ColorHexField
                id="canvas-bg"
                label="描画キャンパス（試着エリア）"
                value={form.canvasBackgroundColor}
                onChange={(v) => setForm((f) => ({ ...f, canvasBackgroundColor: v }))}
              />
              <ColorHexField
                id="cta-accent"
                label="アクセント（カート・体型確定ボタンなど）"
                value={form.ctaAccentColor}
                onChange={(v) => setForm((f) => ({ ...f, ctaAccentColor: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-cart">カートに追加（文言）</Label>
              <Input
                id="cta-cart"
                value={form.ctaCartLabel}
                onChange={(e) => setForm((f) => ({ ...f, ctaCartLabel: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-tryon">この体型で試着する（文言）</Label>
              <Input
                id="cta-tryon"
                value={form.ctaTryOnLabel}
                onChange={(e) => setForm((f) => ({ ...f, ctaTryOnLabel: e.target.value }))}
              />
            </div>
          </>
        )}
      </div>

      {!isLoading && (
        <div className="flex justify-start">
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function WidgetDesignEmptyState({
  title,
  description,
  variant,
}: {
  title: string;
  description: string;
  variant: "muted" | "destructive";
}) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-gray-900">{title}</p>
      <p className={`text-sm ${variant === "destructive" ? "text-destructive" : "text-gray-600"}`}>
        {description}
      </p>
    </div>
  );
}
