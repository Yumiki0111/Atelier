/**
 * PostgREST (PGRST204 / PGRST205 など): リクエストしたテーブル・列が
 * 実際の Postgres に無い、または schema cache が古いときのメッセージ。
 */
export const POSTGREST_SCHEMA_DRIFT_MESSAGE_JA =
  "データベースのスキーマが最新ではありません。リポジトリルートで `npm run db:push` を実行するか、Supabase SQL Editor で `supabase/migrations` を適用してください。";

export function isPostgrestSchemaCacheError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  if (m.includes("could not find") && (m.includes("column") || m.includes("table"))) return true;
  if (m.includes("schema cache") && (m.includes("column") || m.includes("table"))) return true;
  if (m.includes("column") && m.includes("does not exist")) return true;
  if (m.includes("relation") && m.includes("does not exist")) return true;
  return false;
}

/** @deprecated 互換のため残す。`isPostgrestSchemaCacheError` と同じ。 */
export const isPostgrestMissingColumnMessage = isPostgrestSchemaCacheError;
