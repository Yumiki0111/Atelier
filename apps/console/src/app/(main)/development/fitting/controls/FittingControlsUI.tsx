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
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
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
        <span className="block text-[12px] font-medium leading-snug text-slate-700">{label}</span>
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

