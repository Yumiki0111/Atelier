/**
 * アップロード SVG / カスタム服の path 変換・リグ分離・ランドマーク推定。
 * 親の `customGarmentUtils.ts` から再エクスポート。
 */
export { getScalableSpec } from "./scalableSpec";
export {
  buildCustomTransformedPaths,
  buildCustomTransformedPathsWithVertexPlots,
  type BuildCustomTransformedPathsOptions,
  type CustomGarmentTransformResult,
} from "./buildCustomTransformedPaths";
export { parseSvgPaths } from "./parseSvgPaths";
export { splitGarmentPathsFromSvg, filterGarmentPathsFromSvg, getLandmarksFromPaths } from "./svgGarmentSplit";
