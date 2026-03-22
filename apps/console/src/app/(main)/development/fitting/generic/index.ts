/**
 * 汎用フィット（手入力インデックス範囲 + sleeveOnly: 着丈・袖丈・外腕の腕追従ブレンド）。
 */

export type {
  InferredSymmetricTopTopology,
  LineIndexRange,
  TopologyInferenceResult,
  GenericFitResolved,
  GenericFitOutput,
} from "./types";

export { pathBBoxFeatures, allPathFeatures, nearestPointOnPath } from "./pathFeatures";
export type { PathBBoxFeatures } from "./pathFeatures";

export {
  inferSymmetricTopTopology,
  buildSymmetricTopTopologyFromIndices,
  buildSymmetricTopTopologyFromGlobalVertices,
} from "./inferSymmetricTop";
export type { SymmetricTopTopologyIndices, SymmetricTopGlobalVertexRanges } from "./inferSymmetricTop";

export { lineRangeFromTuple, formatLineRangeInput, parseLineRangeInput, lineIndexInRange } from "./lineRangeUtils";

export {
  resolveGenericScalableSpec,
  resolveGenericGradingBodyLengthCmReference,
  designVerticalSpanPxToLengthCm,
} from "./resolveGenericScalableSpec";

export {
  applyGenericMeasureOnlyGrading,
  genericMeasureOnlyGradingActive,
} from "./applyGenericMeasureOnlyGrading";

export {
  buildGenericScalableSpec,
  buildGenericArmConfig,
  resolveGenericSymmetricTop,
  type BuildGenericScalableSpecOptions,
} from "./buildGenericSpec";

export {
  runGenericSymmetricTopFit,
  runGenericSymmetricTopFitManual,
  runGenericSymmetricTopFitWithTopology,
} from "./runGenericTopFit";
