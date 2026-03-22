/** リグ差し替え用プレースホルダ等。stroke 付きで描くと (0,0) にゴミ線が出るので描画しない。 */
export function shouldSuppressGarmentPathRender(d: string): boolean {
  const t = d.trim();
  if (!t) return true;
  return /^M\s*0(?:\s*,\s*|\s+)0\s*$/i.test(t);
}
