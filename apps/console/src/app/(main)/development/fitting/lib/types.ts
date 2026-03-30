export type GarmentType = "shirt" | "jacket" | "custom";

/** 組み込みジャケットのサイズ（JACKET_SIZES のキー） */
export type JacketSize = "3" | "4" | "5";

/** アップロードした商品SVG＋採寸。モデル(170/60)に対する比率で変換して着用する */
export interface CustomGarmentData {
  /** 元SVGの path の d 属性の配列 */
  pathDs: string[];
  /** `pathDs` と同じ長さ。破線でない path は undefined（アップロード時の stroke-dasharray） */
  pathStrokeDasharrays?: (string | undefined)[];
  /** `pathDs` と同じ長さ。SVG の stroke-width（数値化したユーザー単位）。未指定は undefined */
  pathStrokeWidths?: (number | undefined)[];
  /** `pathDs` と同じ長さ。stroke の色（#rgb / currentColor 等）。未指定は undefined */
  pathStrokes?: (string | undefined)[];
  /** 元SVG座標系での肩・裾などの参照点（path 推定またはリグ推定） */
  landmarks: CustomLandmarks;
  /** この1サイズの採寸（cm） */
  size: SizeMeasure;
  /** 写真由来の輪郭のとき true。袖はモデル腕に沿わせ、襟後ろのヒントを足す */
  photoDerived?: boolean;
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
     * 軽量グレード用の着丈基準(cm)。未設定の間は連結頂点だけでは胴グレードを走らせない。
     * サイズプリセットを初めて選んだときに、変更前の `size.length` を入れる。
     */
    gradingBaselineLengthCm?: number;
    /** 軽量グレード用の袖丈基準(cm)。プリセット初回選択時に変更前の `size.sleeve` を入れる。 */
    gradingBaselineSleeveCm?: number;
    /**
     * 袖丈の計測表示に使う区間（連結頂点）。両方指定時のみ有効。
     * 省略時は外腕シーム（seamOuterLeft の頂点範囲）を使用。
     */
    sleeveMeasureVertexStart?: number;
    sleeveMeasureVertexEnd?: number;
    /**
     * 袖丈の折れ線（連結 #）。カンマ入力で順序付き。指定時は赤線はこの順で結ぶ。
     * `sleeveMeasureVertexStart/End` は min/max（スケール区間）と揃える。
     */
    sleeveMeasureVertexChain?: number[];
    /**
     * 反対側の袖（ミラー袖）の計測区間。両方指定すると：
     * 1. 両袖パスが `scaleBodyToSpec`（胴グレード）の対象から除外される（変形防止）。
     * 2. 両袖パスにそれぞれ独立して sleeve grading が適用される。
     * ミラー袖連結を指定しない場合は従来の動作（後方互換）。
     */
    sleeveMirrorMeasureVertexStart?: number;
    sleeveMirrorMeasureVertexEnd?: number;
    sleeveMirrorMeasureVertexChain?: number[];
    /**
     * 着丈計測用の連結頂点（グレード分母・採寸オーバーレイ）。服プロットの太い紫ポリラインは描画しない。
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
}

/**
 * 汎用フィット入力中、服プロットで連結頂点範囲を緑表示するため（開発 UI）。
 * 着丈計測 `lengthMeasure` は頂点の緑強調には使わない。
 */
export type GenericVertexPlotHighlight = {
  seamOuterLeft?: [number, number];
  seamOuterRight?: [number, number];
  sleeveInnerLeft?: [number, number];
  sleeveInnerRight?: [number, number];
  sleeveMeasure?: [number, number];
  /** 袖丈計測: カンマ列があるときはこの順の # だけ強調（非連続対応） */
  sleeveMeasureVertexChain?: number[];
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
     * 袖丈比 s の計算用は lengthStartIdx〜lengthEndIdx 間の縦 |Δy| 合算（`measureLocalChain` 指定時はその順の頂点列）。
     */
    lengthApplyEndExclusive?: number;
    /**
     * 汎用トップの `sleeveMeasureVertexChain` を袖 path のローカル index に写した列（順序付き）。
     * 指定時は `lengthStartIdx`〜`lengthEndIdx` の連続区間ではなく、この順の頂点列で縦 |Δy| 合算し、`scaleSleevePathToSpec` と採寸オーバーレイを一致させる。
     */
    measureLocalChain?: number[];
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
  /** 袖丈計測: 全path結合順での [開始, 終了] インデックス。実測は弧長（採寸オーバーレイ） */
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

/** アップロードSVG内の肩・裾などの参照座標（viewBox座標） */
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
  /** 袖丈: チェーンの弧長（px）と換算 cm */
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
    /** 袖実寸(cm)。チェーン弧長 px の換算（sleevePathLengthDebug と整合） */
    sleeveMeasuredCm?: number;
    /** 袖丈の赤線描画用の折れ線。実寸は弧長。矢印は端点間の直線 */
    sleevePathPoints?: [number, number][];
    /**
     * 汎用トップ: 赤線がプロット編集ハイライトの連結で、確定した袖チェーン（gt）と異なる。
     * 表示の幾何 cm はパイプライン確定値のため、線と数値が一致しないことがある。
     */
    sleeveMeasureRedLineIsEditPreview?: boolean;
    /** ミラー袖（反対側）の赤線用。指定時は右側にも同様の採寸ガイドを描く */
    sleevePathPointsRight?: [number, number][];
    sleeveStartRight?: [number, number];
    sleeveEndRight?: [number, number];
    /** 実測着丈(cm)。着丈 # 区間の頂点縦差換算（lengthPathLengthDebug と整合） */
    lengthMeasuredCm?: number;
    /** 着丈連結区間ありのときの上端（canvas）。縦寸ガイドの起点。無いときは肩平均 Y を使う */
    lengthMeasureTop?: [number, number];
    /** 着丈ガイド下端（カスタム服はメッシュ裾と一致） */
    lengthGuideHem?: [number, number];
    /** 着丈: 紫区間の縦スパン px÷bodyPxPerCm（Y 再スケール後のメッシュ座標） */
    lengthGeomDebug?: { px: number; cm: number };
    /** 着丈 Y 再スケール前（ワープ直後）の同紫区間縦スパン。オーバーレイの幾何の正として優先表示 */
    lengthGeomBeforeLengthMeshDebug?: { px: number; cm: number };
    /**
     * 汎用トップ: プロットの着丈ハイライト区間が確定 `lengthMeasureVertexStart/End` と異なる。
     * 表示の幾何 cm は確定 gt 基準のため、ハイライトと紫ガイドが一致しないことがある。
     */
    lengthMeasureIsEditPreview?: boolean;
    /** 汎用トップ: `buildTopPlacement` と同じ縦 px/cm（着丈を px にしたときの換算） */
    bodyPxPerCm?: number;
    /** 袖: グレード袖丈の px/cm（表示用。赤線は選択チェーンの実座標） */
    sleeveGeomDebug?: { px: number; cm: number };
    /** 袖丈 canvas スケール補正前（applyGenericSleeveScaleAfterLengthMesh 適用前）の同チェーン縦スパン。補正量が大きいと着丈同様に歪みを示す */
    sleeveGeomBeforeSleeveFixDebug?: { px: number; cm: number };
    /** ミラー袖: 上記と同定義（プライマリ袖と同じパイプラインを通したときの幾何） */
    sleeveGeomDebugRight?: { px: number; cm: number };
    sleeveGeomBeforeSleeveFixDebugRight?: { px: number; cm: number };
  } | null;
}
