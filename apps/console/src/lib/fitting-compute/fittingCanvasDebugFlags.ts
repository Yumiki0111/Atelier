/**
 * 採寸オーバーレイ／custom-garment のデバッグログ用。
 * 本番ビルドでは常に無効（sessionStorage にフラグがあっても console に出さない）。
 */
export function isDebugFittingMeasureEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem("DEBUG_FITTING_MEASURE") === "1";
}
