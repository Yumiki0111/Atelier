import type { BodyModelVariant } from "./bodyModelVariant";
import type { FlatCmSizeKey, GarmentFlatCmZone } from "../garmentFlatCmGrading/garmentFlatCmGradingConstants";
import type { GarmentFlatCm } from "../garmentFlatCmGrading/garmentFlatCmGradingMeasurements";
import type { GarmentFlatCmPresetId } from "../garmentFlatCmGrading/garmentFlatCmPreset";

/** 開発キャンバスでモデルより下（背面）にだけ積む path。※前面 `pathDs` と別配列 */
export type BehindBodySvgPaths = {
  pathDs: string[];
  /** 各 path の id（ウィジェットサイズ適用時のグレードゾーン決定）。未保存の legacy は無し */
  pathIds?: string[];
  /** `pathDs` と同じ長さ。グループ id 契約の S 基準ゾーン（path id に依存しない） */
  pathZones?: GarmentFlatCmZone[];
  pathStrokeDasharrays?: (string | undefined)[];
  pathStrokeWidths?: (number | undefined)[];
  pathStrokes?: (string | undefined)[];
  pathFills?: (string | undefined)[];
};

export type GarmentType = "shirt" | "jacket" | "custom";

/** 組み込みジャケットのサイズ（JACKET_SIZES のキー） */
export type JacketSize = "3" | "4" | "5";

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

/**
 * 背面ビュー用の平置きガーメント片（親スペックの `size` / `presetId` と組み合わせる）。
 */
export type GarmentRearViewSpec = {
  pathDs: string[];
  pathStrokeDasharrays?: (string | undefined)[];
  pathStrokeWidths?: (number | undefined)[];
  pathStrokes?: (string | undefined)[];
  pathFills?: (string | undefined)[];
  landmarks: CustomLandmarks;
  debugRigPathDs?: string[];
  behindBody?: BehindBodySvgPaths;
  flatCmOutlinePathIds?: string[];
  /** `flatCmBasePathDs.length` と同じ。`sleeve_L` / `sleeve_R` / `body`（祖先 g id または legacy path id） */
  flatCmOutlinePathZones?: GarmentFlatCmZone[];
  flatCmBasePathDs?: string[];
  flatCmBaseBehindBody?: BehindBodySvgPaths;
};

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
  /** `<path>` に明示した fill。継承は未解析 */
  pathFills?: (string | undefined)[];
  /** 元SVG座標系での肩・裾などの参照点（path 推定またはリグ推定） */
  landmarks: CustomLandmarks;
  /** この1サイズの採寸（cm） */
  size: SizeMeasure;
  /** 写真由来の輪郭のとき true。袖はモデル腕に沿わせ、襟後ろのヒントを足す */
  photoDerived?: boolean;
  /** 平置き cm グレード（開発登録・ライブラリ保存） */
  presetId?: GarmentFlatCmPresetId;
  /**
   * プレビュー／ウィジェットのサイズチップ列（資産の `size` が無い場合のフォールバック）。
   * 開発登録時に保存プリセットから自動付与する。
   */
  /** 登録サイズチップ表示名（XS…XXL または SIZE 1 等の任意ラベル） */
  flatCmOfferedSizeLabels?: readonly string[];
  /**
   * 登録時に保存したサイズ別平置き cm（キーは `flatCmOfferedSizeLabels` と同一文字列）。
   */
  flatCmOfferedSizeCm?: Record<string, GarmentFlatCm>;

  /**
   * 試着キャンバスの 2D ボディ。未指定は格子ボディテンプレ（前面）。
   * 旧データにだけ `lineArtVerification` が残りうる（読み取り時は格子に正規化）。
   */
  bodyModelVariant?: BodyModelVariant;
  /**
   * デバッグ用: アップロードSVG内に含まれていた「リグっぽい」path を、
   * フィット計算から除外した上で別途表示するための raw path d 配列。
   */
  debugRigPathDs?: string[];
  /**
   * `garmentBackSvg` 由来（back-stroke 系）。試着ではモデルより手前に描く前面パスは従来どおり `pathDs`。
   * 無い既存データは背面なし（再保存で付与）。
   */
  behindBody?: BehindBodySvgPaths;
  /**
   * アセット SVG の S 形状（グレード前）の outline path d と id。
   * ウィジェット・API でサイズ変更するとき、`pathDs` をここから `rewriteFlatCmGarmentPath` で再計算する。
   */
  flatCmOutlinePathIds?: string[];
  flatCmOutlinePathZones?: GarmentFlatCmZone[];
  flatCmBasePathDs?: string[];
  /** back-stroke 系の S 形状（behindBody.pathIds と並行） */
  flatCmBaseBehindBody?: BehindBodySvgPaths;
  /**
   * 任意: 後ろ向き試着用の平置きガーメント（前面とは別 SVG）。
   * 無い場合は背面でも前面アートを流用し、ボディのみ `gridSvgBodyBack`。
   */
  rearViewGarment?: GarmentRearViewSpec;
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

/** 服の肩ライン／輪郭と開発キャンバス表示向けヘルパ（`computeFittingCanvasSnapshot` と共有）。 */
export interface ShoulderDebug {
  bodyShoulderContour: [number, number][];
  garmentShoulderContour: [number, number][];
  garmentShoulderPoints: [number, number][];
  garmentType: GarmentType;
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
    /** 袖実寸(cm)。赤線チェーン弧長 px の換算（sleeveGeomDebug と整合） */
    sleeveMeasuredCm?: number;
    /** 袖丈ガイド用の折れ線。実寸は弧長 */
    sleevePathPoints?: [number, number][];
    /** ミラー袖（反対側）の赤線用。指定時は右側にも同様の採寸ガイドを描く */
    sleevePathPointsRight?: [number, number][];
    sleeveStartRight?: [number, number];
    sleeveEndRight?: [number, number];
    /** 実測着丈(cm)。着丈ガイド区間の頂点縦差換算（lengthGeomDebug と整合） */
    lengthMeasuredCm?: number;
    /** 着丈連結区間ありのときの上端（canvas）。縦寸ガイドの起点。無いときは肩平均 Y を使う */
    lengthMeasureTop?: [number, number];
    /** 着丈ガイド下端（カスタム服はメッシュ裾と一致） */
    lengthGuideHem?: [number, number];
    /** 着丈: 紫区間の縦スパン px÷bodyPxPerCm（Y 再スケール後のメッシュ座標） */
    lengthGeomDebug?: { px: number; cm: number };
    /** `buildTopPlacement` と同じ縦 px/cm（着丈を px にしたときの換算） */
    bodyPxPerCm?: number;
    /** プライマリ袖: チェーンの弧長（三平方の辺の和）÷ 袖 px/cm。草案もパイプラインも同一定義。 */
    sleeveGeomMeasureKind?: "arc";
    /** 袖: グレード袖丈の px/cm（表示用。赤線は選択チェーンの実座標） */
    sleeveGeomDebug?: { px: number; cm: number };
    /** 袖丈の canvas スケール補正前の同チェーン縦スパン。補正量が大きいと着丈同様に歪みを示す */
    sleeveGeomBeforeSleeveFixDebug?: { px: number; cm: number };
    /** ミラー袖: 上記と同定義（プライマリ袖と同じパイプラインを通したときの幾何） */
    sleeveGeomDebugRight?: { px: number; cm: number };
    sleeveGeomBeforeSleeveFixDebugRight?: { px: number; cm: number };
  } | null;
}
