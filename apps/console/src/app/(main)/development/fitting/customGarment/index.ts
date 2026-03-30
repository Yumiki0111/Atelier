/**
 * アップロード SVG / カスタム服の path 変換・リグ分離・ランドマーク推定。
 * 親の `customGarmentUtils.ts` から再エクスポート。
 */
export { getScalableSpec } from "./scalableSpec";
export {
  buildCustomTransformedPaths,
  buildCustomTransformedPathsWithVertexPlots,
  genericLengthMeasureVerticalSpanPx,
  type BuildCustomTransformedPathsOptions,
  type CustomGarmentTransformResult,
} from "./buildCustomTransformedPaths";
export {
  parseSvgPaths,
  parseSvgPathsDetailed,
  type SvgParsedPath,
  type SvgPathPresentation,
} from "./parseSvgPaths";
export { expandSvgParsedPathsBySubpaths, splitPathDataIntoSubpaths } from "./splitSvgSubpaths";
export {
  splitGarmentPathsFromSvg,
  splitGarmentPathsFromSvgParsed,
  filterGarmentPathsFromSvg,
  getLandmarksFromPaths,
} from "./svgGarmentSplit";
