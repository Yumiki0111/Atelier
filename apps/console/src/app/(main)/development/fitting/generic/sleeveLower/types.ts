/**
 * 袖下（胴端〜ジャンクション）の再配置パイプライン — 拘束と実行順の単一情報源。
 *
 * **パイプライン順（generic キャンバス袖丈）**
 * 1. 上袖 first-edge 伸縮（`scaleOnce`）— 採寸チェーン弧長目標
 * 2. 袖口隣接点の相対角維持（`applyCuffPartnerPreserveAngleToPath`）
 * 3. 下袖内点の再配置（`solveLowerSleeveInteriorFromRest`）— 本モジュール
 * 4. 胴アウトラインへの投影（`snapSleeveBodySeamVertexToBodyOutline`）— `applyGenericSleeveScaleAfterLengthMesh` 末尾で 1 回（post seam sync の後）
 * 5. 胴–袖の coincident weld（`genericMeasureOnlySleeveScale` 内ヘルパ）
 *
 * Hard / soft は {@link LowerSleeveSolveRequest} を参照。
 */

/** パス上で座標を固定してはいけないローカル index（採寸チェーンなど）。ソルバは触れない。 */
export type LowerSleeveFrozenLocalIndices = ReadonlySet<number>;

export interface LowerSleeveSolveRequest {
  /** 胴端〜ジャンクションを含む path 上の連続ローカル index（両端含む） */
  chainLocal: readonly number[];
  /**
   * スケール前の頂点列（`getPathPoints(designPath)` と同じ順）。
   * 静止形状の弦フレームに使う。
   */
  ptsRest: ReadonlyArray<readonly [number, number]>;
  /**
   * 上袖・袖口処理後の胴端・ジャンクション座標（hard 端点）。
   * `ptsRest` と同じ index。
   */
  ptsAfterUpper: ReadonlyArray<readonly [number, number]>;
  /** チェーンの両端がこの index。通常 chainLocal[0] が胴、最後がジャンクション */
  bodyLocal: number;
  junctionLocal: number;
  /** 触れてはいけない頂点（採寸帯と重なる index など） */
  frozen?: LowerSleeveFrozenLocalIndices | null;
}

export interface LowerSleeveSolveResult {
  /** chainLocal の内点（両端除く）の新座標 */
  updates: Map<number, [number, number]>;
}
