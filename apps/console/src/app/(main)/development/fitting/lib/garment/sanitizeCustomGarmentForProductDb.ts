import type { CustomGarmentData } from "../types";

/**
 * 商品DBに載せる用: `CustomGarmentData` をそのまま保存可能な形に深くコピーする。
 *
 * `debugRigPathDs`（アップロード SVG 内の服リグ線）は **削除しない**。
 * 削除すると DB から読み出した試着が `rigGeometryLockedToModel` にならず、開発タブと同じ
 * 脊髄合わせ・テンプレ整列が効かず、服が体に対して大きくずれる（例: 縦方向のズレ）。
 */
export function sanitizeCustomGarmentForProductDb(data: CustomGarmentData): Record<string, unknown> {
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}
