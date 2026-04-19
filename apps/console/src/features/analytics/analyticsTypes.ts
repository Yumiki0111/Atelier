/** 日次・合計で共通のコア指標（本番＋プレビューリンクの合算） */
export type AnalyticsCoreMetrics = {
  /** 試着ウィジェット（モーダル／埋め込み）を開いた回数 */
  widgetOpens: number;
  /** 「この体型で試着する」確定（`height_change`） */
  bodyTryOnApplies: number;
  /** サイズ変更（`size_change`） */
  sizeChanges: number;
  /** カート追加タップ（`add_to_cart_click` 等） */
  addToCart: number;
};

/** `meta.eventSource === "preview_link"` のみ */
export type AnalyticsPreviewLinkMetrics = {
  previewLinkWidgetOpens: number;
  previewLinkBodyTryOnApplies: number;
  previewLinkSizeChanges: number;
  previewLinkAddToCart: number;
};

export type AnalyticsSeriesRow = {
  date: string;
  fullDate: string;
} & AnalyticsCoreMetrics &
  AnalyticsPreviewLinkMetrics;

export type AnalyticsResponse = {
  series: AnalyticsSeriesRow[];
  totals: AnalyticsCoreMetrics & AnalyticsPreviewLinkMetrics;
};
