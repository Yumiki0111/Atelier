"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type WidgetDesignFormState = {
  /** 店頭での起動ボタン配置（スニペットの data-fitlook-placement） */
  launcherPlacement: "floating" | "inline";
  /** 起動ボタン形状（widget の button.shape） */
  buttonShape: "circle" | "pill";
  buttonColor: string;
  buttonText: string;
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
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="color"
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-0.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          spellCheck={false}
          aria-label={`${label}（16進）`}
        />
      </div>
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
    <div className="w-full min-w-0">
      <div className={cn("overflow-hidden")}>
        {isLoading ? (
          <p className="py-4 text-sm text-muted-foreground">読み込み中…</p>
        ) : (
          <>
            <section className="border-b border-border/40 px-0 py-4 sm:py-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                店頭サイト・起動ボタン
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                埋め込みスニペットに表示されるボタンだけです。下の「試着ウィジェット内」とは別の設定です。
              </p>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">配置</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, launcherPlacement: "inline" }))}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        form.launcherPlacement === "inline"
                          ? "border-primary bg-primary/[0.07] font-medium text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      サイズに埋め込み
                      <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                        サイズ行の近くにボタン（インライン）
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, launcherPlacement: "floating" }))}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        form.launcherPlacement === "floating"
                          ? "border-primary bg-primary/[0.07] font-medium text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      フローティング
                      <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                        画面右下の固定ボタン
                      </span>
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">形</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, buttonShape: "pill" }))}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium",
                        form.buttonShape === "pill"
                          ? "border-primary bg-primary/[0.07]"
                          : "border-border bg-background"
                      )}
                    >
                      ピル（推奨・インライン向き）
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, buttonShape: "circle" }))}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium",
                        form.buttonShape === "circle"
                          ? "border-primary bg-primary/[0.07]"
                          : "border-border bg-background"
                      )}
                    >
                      円（アイコン）
                    </button>
                  </div>
                </div>
                <ColorHexField
                  id="launcher-btn-color"
                  label="ボタン色"
                  value={form.buttonColor}
                  onChange={(v) => setForm((f) => ({ ...f, buttonColor: v }))}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="launcher-btn-text" className="text-xs font-medium">
                    ボタン文言（ピル時）
                  </Label>
                  <Input
                    id="launcher-btn-text"
                    value={form.buttonText}
                    onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))}
                    placeholder="例: 自分のサイズで試着"
                    className="text-sm"
                  />
                </div>
              </div>
            </section>

            <section className="border-b border-border/40 px-0 py-4 sm:py-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                試着ウィジェット内・配色
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                試着を開いたあとのモーダル（または埋め込み画面）の色です。
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <ColorHexField
                  id="iface-bg"
                  label="上部（ヘッダー周り）"
                  value={form.interfaceBackgroundColor}
                  onChange={(v) => setForm((f) => ({ ...f, interfaceBackgroundColor: v }))}
                />
                <ColorHexField
                  id="canvas-bg"
                  label="メイン（試着・サイズ・下地）"
                  value={form.canvasBackgroundColor}
                  onChange={(v) => setForm((f) => ({ ...f, canvasBackgroundColor: v }))}
                />
                <div className="sm:col-span-2">
                  <ColorHexField
                    id="cta-accent"
                    label="アクセント（CTA ボタン）"
                    value={form.ctaAccentColor}
                    onChange={(v) => setForm((f) => ({ ...f, ctaAccentColor: v }))}
                  />
                </div>
              </div>
            </section>

            <section className="px-0 py-4 sm:py-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                試着ウィジェット内・ボタン文言
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                カートに追加・体型確定など、試着画面の CTA に使います（店頭の起動ボタン文言とは別です）。
              </p>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cta-cart" className="text-xs font-medium">
                    カートに追加
                  </Label>
                  <Input
                    id="cta-cart"
                    value={form.ctaCartLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaCartLabel: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cta-tryon" className="text-xs font-medium">
                    この体型で試着する
                  </Label>
                  <Input
                    id="cta-tryon"
                    value={form.ctaTryOnLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaTryOnLabel: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              </div>
            </section>

            <div className="flex flex-col items-stretch gap-2 border-t border-border/40 bg-background px-0 py-4 sm:flex-row sm:items-center sm:justify-end">
              <Button type="button" className="w-full sm:w-auto" onClick={onSave} disabled={saving}>
                {saving ? "保存中…" : "変更を保存"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function WidgetDesignEmptyState({
  title,
  variant,
}: {
  title: string;
  variant: "muted" | "destructive";
}) {
  return (
    <div
      className={cn(
        "border-b border-border/40 py-3",
        variant === "destructive" && "border-destructive/25"
      )}
    >
      <p
        className={cn(
          "text-sm font-medium",
          variant === "destructive" ? "text-destructive" : "text-foreground"
        )}
      >
        {title}
      </p>
    </div>
  );
}
