import type {
  GarmentType,
  ShirtSize,
  JacketSize,
  CustomGarmentData,
  ShoulderDebug,
  MeasureOverlayData,
  GenericVertexPlotHighlight,
} from "@/app/(main)/development/fitting/lib/types";
import type { BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";

export interface UseFittingCanvasDataParams {
  height: number;
  weight: number;
  garment: GarmentType;
  shirtSize: ShirtSize;
  jacketSize: JacketSize;
  customGarmentData: CustomGarmentData | null;
  animProgress: number;
  fromSize: ShirtSize | null;
  toSize: ShirtSize | null;
  fromCustomGarmentData?: CustomGarmentData | null;
  toCustomGarmentData?: CustomGarmentData | null;
  rigBodyEnabled?: boolean;
  /**
   * 開発用: 既定 `mv_model` の代わりに線画検証ボディ＋対応リグ直線を使う。
   * 本番・既定値では無効（既存パイプラインと同一）。
   */
  bodyModelVariant?: BodyModelVariant;
  /**
   * 汎用フィットの下書き区間（パスカタログ）。`genericSymmetricTop` に未反映でも採寸オーバーレイ・赤/紫線を同期させる。
   */
  genericVertexPlotHighlight?: GenericVertexPlotHighlight | null;
}

export type FittingCanvasRigLandmarksDebug = {
  inferredFromRig: boolean;
  rigShoulderY: number | null;
  rigHemY: number | null;
  usedShoulderY: number | null;
  usedHemY: number | null;
  /** モデルリグロック時に `buildTopPlacement` をリグ推定肩・裾に合わせたか */
  useRigLandmarksForPlacement: boolean;
  genericApplied: boolean | null;
  /** 汎用トップでリグが無い／本数不一致のときの注意文（キャンバスデバッグ用） */
  rigRequirementWarnings?: string[];
};

/** リグ肩〜袖先の角度デバッグ（`sessionStorage DEBUG_RIG_ARM=1` でキャンバス表示） */
export type FittingCanvasRigArmAngleDebug = {
  heightCm: number;
  weightKg: number;
  /** ワープ後アウトライン 肩→袖先 の方位角（°）。atan2(Δy,Δx)、+Y 下向き */
  warpedArmAxisDegL: number;
  warpedArmAxisDegR: number;
  /** 170/60・同じ定義 */
  refWarpedArmAxisDegL: number;
  refWarpedArmAxisDegR: number;
  deltaVsRefDegL: number;
  deltaVsRefDegR: number;
  /** 肩で「中心縦（下向き）」と「肩→袖先」のなす角（°）。リグはこの角を基準体型で固定 */
  interiorShoulderVerticalDegL: number;
  interiorShoulderVerticalDegR: number;
  refInteriorVerticalDegL: number;
  refInteriorVerticalDegR: number;
  /** 身長補間アウトラインのみ（ワープ前）肩→袖先の方位角（°） */
  rawArmAxisDegL: number;
  rawArmAxisDegR: number;
  /** `getDeltaThetas`（胴スキニング用）を度にしたもの */
  skinningDeltaThetaDegL: number;
  skinningDeltaThetaDegR: number;
  /**
   * 袖付け根: 肩から見た「体の外側水平」（左=-X, 右=+X）と上腕（肩→袖先）のなす角（°）
   */
  sleeveRootHorizontalDegL: number;
  sleeveRootHorizontalDegR: number;
  warpedShoulderL: [number, number];
  warpedWristL: [number, number];
  warpedShoulderR: [number, number];
  warpedWristR: [number, number];
};

/** モデル+rig.svg の赤リグ（肩図は path 1/2＝腕方向・5/6＝鎖骨。3/4 は脚）を warp した端点と角度 */
export type RigRedLineArmDiagram = {
  shoulderL: [number, number];
  wristL: [number, number];
  shoulderR: [number, number];
  wristR: [number, number];
  clavicleEndL: [number, number];
  clavicleEndR: [number, number];
  /** 左右鎖骨が胸元で合流する付近（path5/6 終点の中点）。首元で軸↔肩線の角を取る */
  neckCenter: [number, number];
  /** path0 中心軸の単位方向（首→足） */
  spineDownUnit: [number, number];
  /** 首元で中心軸（下向き）と「首元→肩リグ」のなす内角（°） */
  interiorSpineShoulderDegL: number;
  interiorSpineShoulderDegR: number;
  /** 肩頂点で鎖骨線と上腕線のなす内角（°） */
  interiorClavicleArmDegL: number;
  interiorClavicleArmDegR: number;
  warpedClavicleAxisDegL: number;
  warpedClavicleAxisDegR: number;
  warpedArmAxisDegL: number;
  warpedArmAxisDegR: number;
};

export interface FittingCanvasSnapshot {
  bodyPaths: string[];
  /** 現在体型ワープ（リグスキニング・服リグ合わせ等の計算用） */
  rigLineWarpedPaths: string[];
  /**
   * 基準リグ（170/60 ワープ）を脊髄で現在体型に配置したパス（頭付近はスケールを弱め、胴〜腕は脊髄長に追従）。
   * 赤リグ表示・肩角度デバッグ図・肌輪郭のリグ追従はこちらを共有。
   */
  rigLineWarpedRigViewPaths: string[];
  /** `rigLineWarpedRigViewPaths` から取った肩・首元の角度図。未ロード時は null */
  rigRedLineArmDiagram: RigRedLineArmDiagram | null;
  /** 胴くびれ参照弦の連結 #（プロット・ゆとり計算と同一） */
  indentWaistReferenceChordGlobalIndices: readonly [number, number];
  /** 既定 0。検証ボディで左右にはみ出すとき負値になり得る */
  viewBoxMinX: number;
  /** 既定 1505。検証ボディで横幅を広げる */
  viewBoxWidth: number;
  viewBoxHeight: number;
  shirtPathD: string | null;
  jacketFill: string | null;
  jacketDetail: string | null;
  customPathDs: string[];
  /** `customPathDs` と同じ長さ。アップロード SVG 由来の破線・線幅・stroke（未指定は undefined） */
  customPathStrokeDasharrays: (string | undefined)[];
  customPathStrokeWidths: (number | undefined)[];
  customPathStrokes: (string | undefined)[];
  customRigPathDs: string[];
  shoulderDebug: ShoulderDebug | null;
  bodyPlotPoints: { label: string; point: [number, number] }[];
  bodyOutlinePoints: [number, number][];
  measureOverlay: MeasureOverlayData;
  rigLandmarksDebug?: FittingCanvasRigLandmarksDebug;
  rigArmAngleDebug: FittingCanvasRigArmAngleDebug;
  /**
   * `DEBUG_FITTING_BODY_VERTICES=1` のときのみ。`globalIndex` は `bodyOutlinePoints` の # と同じ連結順。
   */
  bodyVertexDebugEntries: { globalIndex: number; template: [number, number] }[] | null;
}
