/**
 * 埋め込み試着（`/embed/widget-fit`）からウィジェットと同型のイベントを送る。
 * 本番ウィジェットは `packages/widget` の `sendEvent`、こちらは同一オリジンの `/api/events`。
 */
export async function sendWidgetAnalyticsEvent(event: {
  shopId: string;
  productId?: string;
  type: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[sendWidgetAnalyticsEvent]", res.status, detail.slice(0, 500));
    }
  } catch {
    /* 試着 UI は継続 */
  }
}
