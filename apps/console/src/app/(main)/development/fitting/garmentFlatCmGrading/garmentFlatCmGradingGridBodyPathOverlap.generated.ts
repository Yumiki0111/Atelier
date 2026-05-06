/** 自動生成: npx tsx scripts/analyze-grid-body-path-overlap.ts
 * テンプレ座標上で path 頂点を 1/4px 量子化し、同じキーを踏む path ペアを数えた近似。
 * heuristic は bbox／Y 帯のヒューリスティック（厳密な胴・袖ラベルではない）。
 * illustratedCrossKindBridging: イラスト部のみ・ヒューリスティック異なるペア、共有格子本数>=4。
 * torsoLateralBridging: torsoPanel×lateralOrSleeve かつ共有本数>=8。
 */

export type GridBodyPathHeuristicKind =
  | "rigTail"
  | "torsoPanel"
  | "lateralOrSleeve"
  | "headNeckUpper"
  | "lowerBody"
  | "other";

export const GRID_BODY_PATH_OVERLAP_RIG_TAIL_PATHS = 9 as const;

export const GRID_BODY_PATH_OVERLAP_FRONT = {
  pathCount: 22,
  illustratedPathCount: 13,
  heuristicByPath: ["lateralOrSleeve","lateralOrSleeve","lateralOrSleeve","lowerBody","lowerBody","lowerBody","lowerBody","headNeckUpper","headNeckUpper","lateralOrSleeve","lateralOrSleeve","lateralOrSleeve","lateralOrSleeve","rigTail","rigTail","rigTail","rigTail","rigTail","rigTail","rigTail","rigTail","rigTail"] as const satisfies readonly GridBodyPathHeuristicKind[],
  pathAdjacencyDescending: [[5,6,70],[3,4,70],[11,12,51],[9,10,51],[1,2,17],[7,8,10]] as readonly (readonly [number, number, number])[],
  illustratedCrossKindBridging: [[0,8,4]] as readonly (readonly [number, number, number])[],
  torsoLateralBridging: [] as readonly (readonly [number, number, number])[],
} as const;

export const GRID_BODY_PATH_OVERLAP_BACK = {
  pathCount: 21,
  illustratedPathCount: 12,
  heuristicByPath: ["lateralOrSleeve","lateralOrSleeve","lowerBody","lowerBody","lowerBody","lowerBody","headNeckUpper","headNeckUpper","lateralOrSleeve","lateralOrSleeve","lateralOrSleeve","lateralOrSleeve","rigTail","rigTail","rigTail","rigTail","rigTail","rigTail","rigTail","rigTail","rigTail"] as const satisfies readonly GridBodyPathHeuristicKind[],
  pathAdjacencyDescending: [[6,7,52],[8,9,50],[10,11,50],[4,5,49],[2,3,49]] as readonly (readonly [number, number, number])[],
  illustratedCrossKindBridging: [] as readonly (readonly [number, number, number])[],
  torsoLateralBridging: [] as readonly (readonly [number, number, number])[],
} as const;
