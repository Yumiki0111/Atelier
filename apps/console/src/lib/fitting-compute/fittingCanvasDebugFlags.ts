/**
 * 採寸オーバーレイ／custom-garment のデバッグログ用。
 * 開発時: ブラウザ DevTools で `sessionStorage.setItem('DEBUG_FITTING_MEASURE','1')` 後にリロード。
 * 袖丈パイプライン: `DEBUG_FITTING_SLEEVE_PIPELINE` を `'1'` に（`pipeline_out`・措定区間の弧長ログ）。
 * オーバーレイの袖デバッグ行はサイズプリセット追加後に自動表示（`DEBUG_FITTING_MEASURE` 不要）。
 * 本番ビルドでは常に無効（sessionStorage にフラグがあっても console に出さない）。
 */
export function isDebugFittingMeasureEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem("DEBUG_FITTING_MEASURE") === "1";
}

/**
 * 汎用トップ着丈パイプラインの順序検証ログ。
 * 開発時: `sessionStorage.setItem('DEBUG_FITTING_LENGTH_PIPELINE','1')` 後にリロード。
 */
export function isDebugFittingLengthPipelineEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem("DEBUG_FITTING_LENGTH_PIPELINE") === "1";
}

/**
 * 汎用トップ袖丈: スケール適用・チェーン採寸・ロールバック原因の切り分け。
 * 開発: `sessionStorage.setItem('DEBUG_FITTING_SLEEVE_PIPELINE','1')` 後にリロード。
 */
export function isDebugFittingSleevePipelineEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem("DEBUG_FITTING_SLEEVE_PIPELINE") === "1";
}

/**
 * 汎用トップ: 下袖追従（`tryLowerSleeveFollowArgs` 成否・junction 等）のログ `[FITTING_LOWER_SLEEVE_FOLLOW]`。
 * 開発ビルドでは **既定でオン**。ログを消したいときだけ `sessionStorage.setItem('DEBUG_FITTING_SLEEVE_WELD','0')` 後にリロード。
 * 本番では常にオフ。
 */
export function isDebugFittingSleeveWeldEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof sessionStorage === "undefined") return false;
  const v = sessionStorage.getItem("DEBUG_FITTING_SLEEVE_WELD");
  if (v === "0") return false;
  return true;
}

/**
 * 左・右の胴くびれ（脇〜腹の稜）幅補正の連結 # 区間。`bodyWarp` とモデルプロットのガイド線で共有。
 */
export const BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE = [207, 231] as const;
export const BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE = [420, 444] as const;

/**
 * モデルプロット用の参照弦（左右の「最窪」付近を結ぶ）。`bodyWarp` の重み付けは上記区間ポリライン基準。
 */
export const BODY_INDENT_WAIST_REFERENCE_CHORD_GLOBAL_INDICES = [218, 431] as const;

/** `DEBUG_FITTING_BODY_VERTICES=1` のマゼン強調・console 用（帯の端＋参照弦の #） */
export const DEBUG_BODY_VERTEX_GLOBAL_INDICES: readonly number[] = [
  207, 218, 231, 420, 431, 444,
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
