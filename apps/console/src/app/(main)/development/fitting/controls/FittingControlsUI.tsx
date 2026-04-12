"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export function DevPanelSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-1.5", className)}>
      <div className="px-0.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      <div className="pt-0.5">{children}</div>
    </section>
  );
}

/** 左ラベル + 右ピル型スイッチ（設定画面風） */
export function PanelSwitchRow({
  label,
  checked,
  onToggle,
  id,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-xs font-medium leading-snug text-foreground">{label}</span>
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={(next) => {
          if (next !== checked) onToggle();
        }}
        className="shrink-0"
      />
    </div>
  );
}

