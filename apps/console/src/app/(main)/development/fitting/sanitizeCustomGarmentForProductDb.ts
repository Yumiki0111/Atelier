import type { CustomGarmentData } from "./types";

/**
 * 商品DBに載せる用: SVG path・ランドマーク・採寸・汎用トップのグレーディング／計測頂点などは残し、
 * リグ path（debugRigPathDs）は送らない。
 */
export function sanitizeCustomGarmentForProductDb(data: CustomGarmentData): Record<string, unknown> {
  const raw = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  delete raw.debugRigPathDs;
  return raw;
}
