/**
 * 汎用フィット層の型（特定アセットの path 定数に依存しない）
 */

import type { ScalableGarmentSpec } from "../lib/types";
import type { ArmLogicConfig } from "../lib/scalableGarmentArmLogic";

/** 輪郭線インデックス（0 起算）の包含範囲。単一線は from === to */
export interface LineIndexRange {
  from: number;
  to: number;
}

/** 左右対称トップス向けトポロジー（各役割は 1 本以上の輪郭線の範囲） */
export interface InferredSymmetricTopTopology {
  /** 左：外腕アウトライン */
  seamOuterLeft: LineIndexRange;
  /** 右：外腕アウトライン */
  seamOuterRight: LineIndexRange;
  /** 左：内袖／脇シーム */
  sleeveInnerLeft: LineIndexRange;
  /** 右：内袖／脇シーム */
  sleeveInnerRight: LineIndexRange;
  /** 袖付け付近の推定接合点（SVG 座標） */
  attachLeftSvg: [number, number];
  attachRightSvg: [number, number];
  /**
   * UI が連結頂点範囲で指定したとき、外腕シーム点列の収集にこの区間だけ使う。
   * 未指定時は seamOuter* の path 範囲の全頂点。
   */
  seamOuterLeftVertices?: [number, number];
  seamOuterRightVertices?: [number, number];
  /** 左内袖の連結頂点区間（袖丈計測の既定 gStart/gEnd に使用） */
  sleeveInnerLeftVertices?: [number, number];
  sleeveInnerRightVertices?: [number, number];
}

export interface TopologyInferenceResult {
  ok: boolean;
  topology: InferredSymmetricTopTopology | null;
  /** 推定に失敗した理由や注意 */
  warnings: string[];
}

/** 解析 → 既存 scale / 腕ロジックに渡す束 */
export interface GenericFitResolved {
  scalableSpec: ScalableGarmentSpec;
  armConfig: ArmLogicConfig;
  topology: InferredSymmetricTopTopology;
}

export interface GenericFitOutput {
  /** モデル座標に変換後の path d 配列 */
  pathDsOut: string[];
  /**
   * 服プロット用（ボディ座標）。`pathDs` 連結頂点と同じ個数・順序。
   * sleeveOnly 適用時は `customGarmentVertexPlotsSleeveOnlyBodySpace` と同じ定義。
   */
  vertexPlotsBodySpace?: [number, number][];
  resolved: GenericFitResolved | null;
  warnings: string[];
}
