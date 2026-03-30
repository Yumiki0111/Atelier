/**
 * API 層の二重チェック。`garment_spec` を保存前に正規化する。
 *
 * 以前は `debugRigPathDs` を落としていたが、試着 API／ウィジェットが開発と同じ着せ分岐に入るには
 * 服側リグ path が必要なため、**永続化する**。
 */
export function stripGarmentSpecForStorage(spec: unknown): unknown | null {
  if (spec == null) return null;
  if (typeof spec !== "object" || Array.isArray(spec)) return spec;
  return { ...(spec as Record<string, unknown>) };
}
