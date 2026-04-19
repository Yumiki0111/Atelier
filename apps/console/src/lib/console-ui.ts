import { cn } from "@/lib/utils";

/**
 * コンソール共通のフラットUI（商品ライブラリを基準）。
 * 他ページのフォーム・表でも import して統一する。
 */

/** メインカラム内の各ページの外枠（最大幅・タイトルと本文の縦間隔） */
export const consolePageShellClass =
  "mx-auto w-full max-w-[120rem] space-y-8";

export const consoleHairlineColor = "#EEEEEE";

export const consoleHairlineBorder = "border-[#EEEEEE]";

/** セクション見出し直下の区切り（薄いヘアライン） */
export const consoleSectionRuleClass = cn("border-b", consoleHairlineBorder);

/** 角丸＋ヘアライン枠のパネル（表・カード下地） */
export const consolePanelClass = cn(
  "overflow-hidden rounded-lg border bg-background shadow-none",
  consoleHairlineBorder
);

/** 検索アイコン付き入力と並べるセレクトの共通トリガー */
export const consoleControlSelectTriggerClass = cn(
  "h-11 w-full rounded-md border bg-background shadow-none",
  consoleHairlineBorder
);

/** 一覧の主ボタン（オレンジ系 primary） */
export const consolePrimaryCtaButtonClass = cn(
  "h-10 gap-2 border-0 bg-primary text-primary-foreground hover:brightness-95",
  "focus-visible:ring-2 focus-visible:ring-primary/50"
);

/** 表：ヘッダー行・区切り線 */
export const consoleTableHeaderBg = "bg-[#F9F9F9]";

export const consoleTableHeadCellClass = cn(
  consoleTableHeaderBg,
  "text-left text-xs font-medium text-muted-foreground"
);

export const consoleTableFixedClass = cn(
  "w-full min-w-[42rem] table-fixed border-collapse border-0 text-sm [&_td]:border-0 [&_th]:border-0"
);

export const consoleTableHeaderRowClass = cn(
  "whitespace-nowrap border-b hover:bg-[#F9F9F9]",
  consoleHairlineBorder,
  consoleTableHeaderBg
);

export const consoleTableBodyRowClass = cn(
  "group whitespace-nowrap border-b transition-colors hover:bg-transparent",
  consoleHairlineBorder
);

/** 参照デザインのアクセント（コーラル）のチェックボックス */
export const consoleAccentCheckboxClassName = cn(
  "border-[#EEEEEE] data-[state=checked]:border-[#FF6B35] data-[state=checked]:bg-[#FF6B35] data-[state=checked]:text-white"
);

export type ConsoleTableRowTone = {
  bulkSelected: boolean;
  previewSelected: boolean;
  previewable: boolean;
};

/** 表セル背景（選択・プレビュー・ホバーを統一） */
export function consoleTableRowCellBgClass(t: ConsoleTableRowTone): string {
  if (t.bulkSelected) {
    return "bg-[#FFF0ED] group-hover:bg-[#FFE8E3]";
  }
  if (t.previewSelected) {
    return "bg-[#FFF0ED] group-hover:bg-[#FFE8E3]";
  }
  if (t.previewable) {
    return "bg-background group-hover:bg-[#FFF0ED]";
  }
  return "bg-background group-hover:bg-[#FAFAFA]";
}
