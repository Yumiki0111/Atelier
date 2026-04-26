/**
 * FIT&LOOK 運営（プラットフォーム管理者）メールの判定。
 * サーバー: PLATFORM_ADMIN_EMAILS（カンマ区切り）に加え info@fitandlook.com を常に含める。
 * クライアント: NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS があればマージ（表示制御用）。
 */

export const DEFAULT_PLATFORM_ADMIN_EMAIL = "info@fitandlook.com";

/** ブランド（ショップ）アカウント発行・内部 provision API を使えるメール（既定は info@ のみ） */
export const DEFAULT_PROVISION_ADMIN_EMAIL = DEFAULT_PLATFORM_ADMIN_EMAIL;

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => normalizeAdminEmail(s))
    .filter((s) => s.length > 0);
}

/** サーバー専用: process.env.PLATFORM_ADMIN_EMAILS */
export function getPlatformAdminEmailsServer(): string[] {
  const fromEnv = parseEmailList(process.env.PLATFORM_ADMIN_EMAILS);
  return [...new Set([normalizeAdminEmail(DEFAULT_PLATFORM_ADMIN_EMAIL), ...fromEnv])];
}

export function isPlatformAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const n = normalizeAdminEmail(email);
  return getPlatformAdminEmailsServer().includes(n);
}

/** クライアント: NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS + デフォルト */
export function getPlatformAdminEmailsClient(): string[] {
  const fromPublic = parseEmailList(process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS);
  return [...new Set([normalizeAdminEmail(DEFAULT_PLATFORM_ADMIN_EMAIL), ...fromPublic])];
}

export function isPlatformAdminEmailClient(email: string | undefined | null): boolean {
  if (!email) return false;
  const n = normalizeAdminEmail(email);
  return getPlatformAdminEmailsClient().includes(n);
}

/** サーバー: PROVISION_ADMIN_EMAILS（カンマ区切り）＋ info@ */
export function getProvisionAdminEmailsServer(): string[] {
  const fromEnv = parseEmailList(process.env.PROVISION_ADMIN_EMAILS);
  return [...new Set([normalizeAdminEmail(DEFAULT_PROVISION_ADMIN_EMAIL), ...fromEnv])];
}

export function isProvisionAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return getProvisionAdminEmailsServer().includes(normalizeAdminEmail(email));
}

/** クライアント: NEXT_PUBLIC_PROVISION_ADMIN_EMAILS ＋ info@ */
export function getProvisionAdminEmailsClient(): string[] {
  const fromPublic = parseEmailList(process.env.NEXT_PUBLIC_PROVISION_ADMIN_EMAILS);
  return [...new Set([normalizeAdminEmail(DEFAULT_PROVISION_ADMIN_EMAIL), ...fromPublic])];
}

export function isProvisionAdminEmailClient(email: string | undefined | null): boolean {
  if (!email) return false;
  return getProvisionAdminEmailsClient().includes(normalizeAdminEmail(email));
}
