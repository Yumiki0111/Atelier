/**
 * custom-garment のデバッグログ・オーバーレイ用フラグ。
 * 開発時: ブラウザ DevTools で `sessionStorage.setItem('DEBUG_FITTING_MEASURE','1')` 後にリロード。
 * 本番ビルドでは常に無効（sessionStorage にフラグがあっても console に出さない）。
 */
export function isDebugFittingMeasureEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem("DEBUG_FITTING_MEASURE") === "1";
}

/**
 * 左・右の胴くびれ（脇〜腹の稜）幅補正の連結 # 区間。`bodyWarp` とモデルプロットのガイド線で共有。
 * 格子ボディは `grid-body-silhouette-path-source.svg`（22 path・イラスト前面）※テンプレ再生成後の頂点列とずれる場合がある。
 */
export const BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE = [484, 498] as const;
export const BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE = [636, 650] as const;

/**
 * モデルプロット用の参照弦（左右の「最窪」付近を結ぶ）。`bodyWarp` の重み付けは上記区間ポリライン基準。
 */
export const BODY_INDENT_WAIST_REFERENCE_CHORD_GLOBAL_INDICES = [491, 643] as const;

/** `DEBUG_FITTING_BODY_VERTICES=1` のマゼン強調・console 用（帯の端＋参照弦の #） */
export const DEBUG_BODY_VERTEX_GLOBAL_INDICES: readonly number[] = [
  484, 491, 498, 636, 643, 650,
];

/**
 * モデルプロット上の指定 # をマゼンタ強調し、コンソールにテンプレ→ワープ後を出す。
 * 開発: `sessionStorage.setItem('DEBUG_FITTING_BODY_VERTICES','1')` 後にリロード。
 */
export function isDebugFittingBodyVerticesEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem("DEBUG_FITTING_BODY_VERTICES") === "1";
}
