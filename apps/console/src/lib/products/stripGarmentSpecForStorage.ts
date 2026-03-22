/**
 * API 層の二重チェック: クライアントが誤って含めても保存しないキー
 */
export function stripGarmentSpecForStorage(spec: unknown): unknown | null {
  if (spec == null) return null;
  if (typeof spec !== "object" || Array.isArray(spec)) return spec;
  const o = { ...(spec as Record<string, unknown>) };
  delete o.debugRigPathDs;
  return o;
}
