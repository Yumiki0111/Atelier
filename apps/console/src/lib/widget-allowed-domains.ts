/**
 * Widget キーの allowed_domains 判定（公開 API の Origin / Referer の host と照合）。
 * {@link apps/console/src/lib/api/cors.ts} の validatePublicKeyAndDomain と同じルール。
 */
export function isWidgetAllowedHost(host: string, allowedDomains: string[] | null | undefined): boolean {
  const list = allowedDomains ?? [];
  if (list.length === 0) return false;
  return list.some((domain) => {
    if (host === domain) return true;
    if (host.endsWith(`.${domain}`)) return true;
    return false;
  });
}
