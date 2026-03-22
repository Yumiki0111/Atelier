export type GarmentType = "shirt" | "jacket" | "custom";

/** 組み込みジャケットのサイズ（JACKET_SIZES のキー） */
export type JacketSize = "3" | "4" | "5";

/** カスタム服のランドマークを連結頂点で手動指定するときのキー（服プロット # と同じ 0 起算） */
export interface CustomLandmarkVertexIndices {
  shoulderLeft: number;
  shoulderRight: number;
  hemCenter: number;
}

/** アップロードした商品SVG＋採寸。モデル(170/60)に対する比率で変換して着用する */
export interface CustomGarmentData {
  /** 元SVGの path の d 属性の配列 */
  pathDs: string[];
  /** 元SVG座標系でのランドマーク */
  landmarks: CustomLandmarks;
  /** この1サイズの採寸（cm） */
  size: SizeMeasure;
  /** 写真由来の輪郭のとき true。袖はモデル腕に沿わせ、襟後ろのヒントを足す */
  photoDerived?: boolean;
  /** 指定時は肩ラインにこの頂点インデックス（全path結合順）を使う。実験ジャケット92、Group11は15 */
  shoulderPointIndex?: number;
  /**
   * manual かつ shoulderLeft/Right/hemCenter が揃っているとき、landmarks の数値より連結頂点から座標を復元する。
   */
  landmarkIndexMode?: "auto" | "manual";
  /** 連結頂点（服プロット # と同じ 0 起算）で肩左右・裾中央を指定 */
  landmarkVertexIndices?: Partial<CustomLandmarkVertexIndices>;
  /** 指定時はこれらの頂点（全path結合順）をボディの首の線分に固定して変形する。テスト1: [84,158], テスト2: [37,86] */
  neckPinIndices?: number[];
  /** 開発フィット: 汎用トップ（アップロード SVG 想定） */
  presetId?: "genericSymmetricTop";
  /**
   * 汎用（genericSymmetricTop）。自動判定なし。
   * - 既定: 袖丈・着丈の連結 # で軽量グレーディング（design 縦スケール）→ 通常プレース。
   * - `applied` と 4 連結区間はデータ互換・API 用。開発 UI の path 割当・Apply は廃止。
   */
  genericSymmetricTop?: {
    applied?: boolean;
    seamOuterLeft?: [number, number];
    seamOuterRight?: [number, number];
    sleeveInnerLeft?: [number, number];
    sleeveInnerRight?: [number, number];
    /**
     * @deprecated 互換用。パイプラインは {@link gradingBaselineLengthCm} または現在の `size.length` を使う。
     */
    referenceBodyLengthCm?: number;
    /**
     * Apply 確定時の着丈(cm)。SVG実寸・採寸と一致させ、この値で `bodyLengthCm` を揃えると
     * Apply 直後の着丈スケール比が 1 になり、形のジャンプを防げる。サイズプリセット変更時は `size.length / 基準` でグレーディング。
     */
    gradingBaselineLengthCm?: number;
    /** Apply 確定時の袖丈(cm)。将来の袖グレーディング基準用（現在は主に記録）。 */
    gradingBaselineSleeveCm?: number;
    /**
     * 袖丈の計測表示に使う区間（連結頂点）。両方指定時のみ有効。
     * 省略時は外腕シーム（seamOuterLeft の頂点範囲）を使用。
     */
    sleeveMeasureVertexStart?: number;
    sleeveMeasureVertexEnd?: number;
    /**
     * 着丈計測ライン（紫）用の連結頂点。両方指定時のみ `FittingCanvasPlotOverlay` で辿る。
     */
    lengthMeasureVertexStart?: number;
    lengthMeasureVertexEnd?: number;
    /**
     * Apply 時に確定したトポロジー（再推定せず固定運用）。
     * これがある場合、毎フレームの推定差で形が揺れない。
     */
    lockedTopology?: {
      seamOuterLeft: { from: number; to: number };
      seamOuterRight: { from: number; to: number };
      sleeveInnerLeft: { from: number; to: number };
      sleeveInnerRight: { from: number; to: number };
      attachLeftSvg: [number, number];
      attachRightSvg: [number, number];
      seamOuterLeftVertices?: [number, number];
      seamOuterRightVertices?: [number, number];
      sleeveInnerLeftVertices?: [number, number];
      sleeveInnerRightVertices?: [number, number];
    };
    /**
     * ユーザー定義のサイズプリセット。着丈/袖丈をセットで登録して
     * ワンタッチで切り替えられる。ブローゾンの 3/4/5 に相当。
     */
    sizePresets?: { label: string; length: number; sleeve: number }[];
  };

  /**
   * デバッグ用: アップロードSVG内に含まれていた「リグっぽい」path を、
   * フィット計算から除外した上で別途表示するための raw path d 配列。
   */
  debugRigPathDs?: string[];

  /**
   * true のとき、useFittingCanvasData 側の shoulderSeamY 再推定を無効化して
   * landmarks.shoulderY をそのまま shoulderSeamY として使う。
   * リグ由来のランドマーク整列のために使用する。
   */
  useShoulderSeamYFromLandmarks?: boolean;
}

/**
 * 汎用フィット入力中、服プロットで連結頂点範囲を緑表示するため（開発 UI）。
 * 着丈計測 `lengthMeasure` は紫線のみで、頂点の緑強調には使わない。
 */
export type GenericVertexPlotHighlight = {
  seamOuterLeft?: [number, number];
  seamOuterRight?: [number, number];
  sleeveInnerLeft?: [number, number];
  sleeveInnerRight?: [number, number];
  sleeveMeasure?: [number, number];
  lengthMeasure?: [number, number];
};

/**
 * 採寸スケール適用可能な服の設計パラメータ。
 * コート・ブローゾン等、着丈・袖丈を採寸値に合わせてスケールする服で使用。
 */
export interface ScalableGarmentSpec {
  /** 設計時の肩Y（着丈スケール基準） */
  designShoulderY: number;
  /** 設計時の裾Y */
  designHemY: number;
  /** 設計着丈(cm)。ベースサイズ */
  bodyLengthCm: number;
  /** 着丈スケールをかけるボディパスのpathIdx一覧（袖パスは除く） */
  bodyPathIndices: number[];
  /** 袖パス構造 */
  sleeve: {
    /** 肩の点index（anchor） */
    anchorIdx: number;
    /** 袖丈計測・スケールの開始index */
    lengthStartIdx: number;
    /** 袖丈計測・スケールの終了index */
    lengthEndIdx: number;
    /**
     * 袖丈の anchor 基準スケールを **この index 未満** の頂点にだけ適用する（省略時は lengthEndIdx まで従来どおり）。
     * 内袖が胴と共有する裾ラインを、着丈スケール後に袖スケールで再変形しないために使う（ブローゾン path2/8）。
     * 袖丈比 s の計算用 |ΔY| は引き続き lengthStartIdx〜lengthEndIdx。
     */
    lengthApplyEndExclusive?: number;
    /** 袖口の点index（腕角度計算用） */
    cuffIdx: number;
    /** 内腕の [start, end] index。指定時は innerAnchorIdx 方向にスケール */
    innerIndices?: [number, number];
    /** 内腕の基準点index（袖付け接続点）。innerIndices 指定時に必要 */
    innerAnchorIdx?: number;
    /** 内腕スケール率。省略時は1 */
    innerScaleFn?: (sleeveCm: number) => number;
  };
  /** デフォルト袖丈(cm) */
  defaultSleeveCm: number;
  /** 袖丈計測: 全path結合順での [開始, 終了] インデックス。実測 cm は両端の |ΔY|（採寸オーバーレイ） */
  sleeveMeasureIndices: [number, number];
  /** 脇ラインブレンド距離(px)。省略時は500。服の長さに応じて調整 */
  seamBlendMaxDist?: number;
  /**
   * true のときのみ、設計座標で胴バウンディングの中心 X ±3px 付近の頂点をボディ中心 BODY_CX に寄せる（ブローゾン用）。
   * 汎用 SVG では前中心・ポケット付近まで縦線に潰れて「変な線」になるため既定は付けない。
   */
  snapCenterXToBody?: boolean;
  /**
   * 着丈グレーディング（`scaleBodyToSpec`）時、裾帯の前中心付近だけ design Y を `designHemY` まで引き上げる基準 X（design 座標）。
   * 未指定なら一様スケールのみ（従来どおり）。
   */
  gradingHemAlignOriginX?: number;
  /** 実行時: サイド裾の最深 design Y。`buildSleeveOnlyCtx` が補間する */
  gradingHemAlignTargetY?: number;
  /** 実行時: 前中心とみなす半幅（design）。`buildSleeveOnlyCtx` が服幅から付与 */
  gradingHemAlignStripHalf?: number;
}

/** アップロードSVG内のランドマーク（そのSVGのviewBox座標） */
export interface CustomLandmarks {
  shoulderY: number;
  shoulderLx: number;
  shoulderRx: number;
  hemY: number;
  hemCx: number;
  /** 指定時は着丈スケールをこの値(px)で計算。肩合わせしつつスケールを固定したいとき（例: Group 11） */
  garmentLengthOverride?: number;
  /** 指定時はボディ肩ラインに対するオフセット(px)。正で少し下げる。 */
  bodyShoulderOffsetY?: number;
  /** 指定時は scaleX を体肩幅でキャップ（でかい表示の防止）。ブローゾン・カーフヘア用 */
  totalWidth?: number;
  /** totalWidth 使用時の最大幅比（体肩幅基準）。例: shoulder/47 */
  maxWidthRatio?: number;
}

export type ShirtSize = "44" | "46" | "48" | "50" | "52" | "54";

export interface BodyParams {
  yScale: number;
  xScale: number;
}

export interface BodyZones {
  head_top: number;
  head_bot: number;
  neck_top: number;
  neck_bot: number;
  shoulder: number;
  armpit: number;
  chest: number;
  belly: number;
  waist: number;
  hip: number;
  crotch: number;
  knee: number;
  ankle: number;
  foot: number;
}

export interface SizeMeasure {
  shoulder: number;
  chest: number;
  length: number;
  sleeve: number;
}

export interface FitResult {
  chestDiff: number;
  hemDiff: number;
  estChest: number;
}

export interface JacketTransform {
  bSHL_slv: [number, number];
  bSHR_slv: [number, number];
  scaleY: number;
  slvScale: number;
  mBL: AffineMatrix | null;
  mBR: AffineMatrix | null;
  bshY: number;
  neckBotY: number;
  zones: BodyZones;
  yScale: number;
  xScale_body: number;
}

export interface AffineMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export type PointTransform = (x: number, y: number) => [number, number];

/** 肩の位置の判定・表示用（FittingCanvas のプロット表示） */
export interface ShoulderDebug {
  bodyShoulderContour: [number, number][];
  garmentShoulderContour: [number, number][];
  garmentShoulderPoints: [number, number][];
  shoulderPointIndex: number | null;
  garmentType: GarmentType;
  /** 袖丈: 計測両端の |ΔY|（px）と換算 cm（経路長ではない） */
  sleevePathLengthDebug?: { px: number; cm: number };
  /** プロット上の袖丈計測区間（連結頂点） */
  sleeveMeasurePlotRange?: [number, number];
  sleeveMeasurePlotRangeRight?: [number, number];
  /** プロット上の着丈計測区間 */
  lengthMeasurePlotRange?: [number, number];
  /** 着丈: 連結区間ありは上端〜下端の |ΔY|、なければ肩〜裾（px/cm。採寸オーバーレイと一致） */
  lengthPathLengthDebug?: { px: number; cm: number };
}

/** 画面に描画する採寸オーバーレイ用の座標 */
export interface MeasureOverlayData {
  bodyHeight: { top: [number, number]; bottom: [number, number] };
  garment: {
    shoulderLeft: [number, number];
    shoulderRight: [number, number];
    hemCenter: [number, number];
    size: SizeMeasure;
    /** 採寸がどのアイテム・サイズか（例: "Group 11 サイズ 3", "シャツ 48"） */
    sizeLabel?: string;
    chestLeft?: [number, number];
    chestRight?: [number, number];
    sleeveStart?: [number, number];
    sleeveEnd?: [number, number];
    /** 袖実寸(cm)。汎用トップ＋袖計測ありは `size.sleeve`。それ以外は端点 |ΔY|÷bodyPxPerCm */
    sleeveMeasuredCm?: number;
    /** 袖丈の赤線描画用の折れ線。数値は端点の縦差 */
    sleevePathPoints?: [number, number][];
    /** 実測着丈(cm)。汎用トップ＋着丈連結#ありは `size.length`（入力）。それ以外は端点 |ΔY| 等 */
    lengthMeasuredCm?: number;
    /** 着丈連結区間ありのときの上端（canvas）。縦寸ガイドの起点。無いときは肩平均 Y を使う */
    lengthMeasureTop?: [number, number];
    /** 汎用トップ：`lengthMeasuredCm` は幾何換算ではなく `size.length`（着丈 A） */
    lengthCmFromSizeInput?: boolean;
    /** 汎用トップ：`sleeveMeasuredCm` は `size.sleeve`（袖丈 D） */
    sleeveCmFromSizeInput?: boolean;
  } | null;
}
