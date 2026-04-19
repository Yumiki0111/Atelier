import { getApiBaseUrl } from "./widget-utils";

const INGEST = "http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3";

/** Cursor デバッグ: ingest + 同一 API オリジンの /api/debug-log（開発時のみサーバが記録） */
export function emitDebugLog(payload: {
  sessionId: string;
  runId?: string;
  hypothesisId?: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}): void {
  const body = JSON.stringify({ ...payload, timestamp: Date.now() });
  fetch(INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": payload.sessionId,
    },
    body,
  }).catch(() => {});
  const base = getApiBaseUrl()?.replace(/\/$/, "");
  if (base) {
    fetch(`${base}/api/debug-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(() => {});
  }
}
