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

export {
  lineRangeFromTuple,
  formatLineRangeInput,
  parseLineRangeInput,
  parseSleeveMeasureVertexInput,
  parseSleeveMeasureVertexList,
  appendSleeveMeasureVertexWithR,
  lineIndexInRange,
  parseIndexSetListInput,
} from "./lineRangeUtils";
export type { ParseIndexSetListResult } from "./lineRangeUtils";

export {
  resolveGenericScalableSpec,
  resolveGenericGradingBodyLengthCmReference,
  designVerticalSpanPxToLengthCm,
} from "./resolveGenericScalableSpec";

export type { GenericSleeveMeasureVertexOverride } from "./applyGenericMeasureOnlyGrading";
export {
  applyGenericMeasureOnlyGrading,
  applyGenericSleeveScaleAfterLengthMesh,
  GenericSleevePipelineInvariantError,
  genericMeasureOnlyGradingActive,
  genericSymmetricTopCanvasSleeveSnapEligible,
  measureGenericTopSleeveCmFromPath,
  measureOriginalSleeveCmFromDesignPaths,
  resolveGenericSleevePxPerCmForMeasure,
  sleeveVerticalPxFromGlobalVertices,
} from "./applyGenericMeasureOnlyGrading";

export {
  buildSolveRequestFromPaths,
  solveLowerSleeveInteriorFromRest,
  smoothOpenChainInteriorsLaplacian2D,
  relaxOpenChainInteriorsTowardChordWhereBent2D,
  applyLocalVertexUpdatesToPathD,
  resolveLowerSleeveChainLocals,
  type LowerSleeveSolveRequest,
  type LowerSleeveSolveResult,
} from "./sleeveLower";

export {
  resolveEffectiveSleeveGradingGeometry,
  resolveEffectiveMirrorSleeveGradingGeometry,
  isLikelyVerticalSymmetryGuidePath,
  isNearlyVerticalThinPath,
  isVerticalCenterSpinePath,
  isGlobalVertexOnSymmetryGuidePath,
  snapVerticalConstructionPathsToLayoutCenterX,
  type EffectiveSleeveGradingGeometry,
} from "./resolveEffectiveSleeveGradingGeometry";

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
