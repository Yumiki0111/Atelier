import { BZ, BODY_CX } from "@/app/(main)/development/fitting/lib/constants";
import { GARMENT_FLAT_CM_VIEWBOX } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";

/**
 * テンプレ Y（`BZ.head_bot` より下）について、身長スケール yS に対する「増分」の配分比率。
 * 合計 1。成人男女の身長変異では下肢の寄与が座高より大きいことが多く（座高脚長指数で相対的に脚が伸びる）、
 * 等身大 3D アバター・服装人台の文献でも胴より脚側に伸びを寄せるモデルが一般的。
 * 数値はその要約として 8% / 34% / 58% を格子テンプレの首下〜肩・肩〜股・股〜足 の 3 帯へ割り当てたもの。
 */
export const GRID_BODY_HEIGHT_GROWTH_FRACTION_TO_STATURE = [0.08, 0.34, 0.58] as const;

/** `GRID_BODY_HEIGHT_GROWTH_FRACTION_TO_STATURE` の各要素の説明（UI・ラボ用） */
export const GRID_BODY_HEIGHT_GROWTH_SEGMENT_LABELS_JA = [
  "首下〜肩（テンプレ Y）",
  "肩〜股",
  "股〜足先",
] as const;

const GRID_Y_SEGMENT_LEN: readonly [number, number, number] = [
  BZ.shoulder - BZ.head_bot,
  BZ.crotch - BZ.shoulder,
  BZ.foot - BZ.crotch,
];

export type GridBodyYLandmarks = {
  head_bot: number;
  shoulder: number;
  crotch: number;
  foot: number;
};

/**
 * Figma ネイティブ格子ボディ（`GARMENT_FLAT_CM_VIEWBOX`）の身長・体重ワープ用。
 * 肩=パンツ上端（path0 下端〜233）、股=脚付け（264）。腕先 y≈263 は肩〜股帯に収める。
 */
export const NATIVE_GRID_BODY_Y_LANDMARKS: GridBodyYLandmarks = {
  head_bot: 85,
  shoulder: 233,
  crotch: 264,
  foot: 524,
};

const nativeVbParts = GARMENT_FLAT_CM_VIEWBOX.trim().split(/\s+/).map(Number);
/** ネイティブ viewBox 中心 X（`389×525` 系） */
export const NATIVE_GRID_BODY_CX = (nativeVbParts[2] ?? 389) / 2;

export type LineArtLinearWarpOpts = {
  bodyCx?: number;
  yWarpFn?: (y: number, yS: number) => number;
};

function gridBodyTemplateYRawFromLandmarks(y: number, yS: number, lm: GridBodyYLandmarks): number {
  if (y <= lm.head_bot) return y;
  const L0 = lm.shoulder - lm.head_bot;
  const L1 = lm.crotch - lm.shoulder;
  const L2 = lm.foot - lm.crotch;
  const Lsum = L0 + L1 + L2;
  const f = GRID_BODY_HEIGHT_GROWTH_FRACTION_TO_STATURE;
  const deltaTotal = (yS - 1) * Lsum;
  const Lp0 = L0 + f[0]! * deltaTotal;
  const Lp1 = L1 + f[1]! * deltaTotal;
  const Lp2 = L2 + f[2]! * deltaTotal;
  const yKb = lm.head_bot;
  const yK1 = lm.shoulder;
  const yK2 = lm.crotch;
  const yK3 = lm.foot;
  const m0 = yKb;
  const m1 = m0 + Lp0;
  const m2 = m1 + Lp1;
  const m3 = m2 + Lp2;
  if (y >= yK3) {
    const slope = Lp2 / Math.max(L2, 1e-9);
    return m3 + (y - yK3) * slope;
  }
  if (y <= yK1) {
    const t = (y - yKb) / Math.max(yK1 - yKb, 1e-9);
    return m0 + t * (m1 - m0);
  }
  if (y <= yK2) {
    const t = (y - yK1) / Math.max(yK2 - yK1, 1e-9);
    return m1 + t * (m2 - m1);
  }
  const t = (y - yK2) / Math.max(yK3 - yK2, 1e-9);
  return m2 + t * (m3 - m2);
}

/** ネイティブ向け: 各帯長を `yS` 倍（脚寄せ 58% 配分だと低身長でパンツ帯だけ潰れる） */
function gridBodyTemplateYRawProportionalFromLandmarks(
  y: number,
  yS: number,
  lm: GridBodyYLandmarks
): number {
  if (y <= lm.head_bot) return y;
  const L0 = (lm.shoulder - lm.head_bot) * yS;
  const L1 = (lm.crotch - lm.shoulder) * yS;
  const L2 = (lm.foot - lm.crotch) * yS;
  const yKb = lm.head_bot;
  const yK1 = lm.shoulder;
  const yK2 = lm.crotch;
  const yK3 = lm.foot;
  const m0 = yKb;
  const m1 = m0 + L0;
  const m2 = m1 + L1;
  const m3 = m2 + L2;
  if (y >= yK3) {
    const slope = L2 / Math.max(lm.foot - lm.crotch, 1e-9);
    return m3 + (y - yK3) * slope;
  }
  if (y <= yK1) {
    const t = (y - yKb) / Math.max(yK1 - yKb, 1e-9);
    return m0 + t * (m1 - m0);
  }
  if (y <= yK2) {
    const t = (y - yK1) / Math.max(yK2 - yK1, 1e-9);
    return m1 + t * (m2 - m1);
  }
  const t = (y - yK2) / Math.max(yK3 - yK2, 1e-9);
  return m2 + t * (m3 - m2);
}

function gridBodyTemplateYWarpFromLandmarks(
  y: number,
  yS: number,
  lm: GridBodyYLandmarks,
  yRaw: (yy: number, ys: number, landmarks: GridBodyYLandmarks) => number = gridBodyTemplateYRawFromLandmarks
): number {
  if (y <= lm.head_bot) return y;
  const g = yRaw(y, yS, lm);
  const yOff = lm.shoulder - yRaw(lm.shoulder, yS, lm);
  const lNeck = Math.max(lm.shoulder - lm.head_bot, 1e-9);
  if (y <= lm.shoulder) {
    const t = (y - lm.head_bot) / lNeck;
    return g + yOff * t;
  }
  return g + yOff;
}

/**
 * テンプレ Y（`BZ.head_bot` より上は固定、以下は折れ線）の身長ワープ。
 *
 * **パーツ境界の一致**: 結び目は {@link BZ} の landmark（`shoulder` / `crotch` / `foot`）のみとし、
 * テンプレ上で同じ Y に乗る頂点（隣接パスの共有点含む）は写像が `y` のみの関数なので常に同一出力 Y へ集まり、帯の境界が開かない。
 * 結び目の値をここと模板 SVG・`bodyZones` でずらさないこと。
 */
export function gridBodyTemplateYRawFromHeightScale(y: number, yS: number): number {
  return gridBodyTemplateYRawFromLandmarks(y, yS, BZ);
}

/**
 * 頭は `head_bot` 以下で未変形。それより下は {@link gridBodyTemplateYRawFromHeightScale} に肩合わせ。
 *
 * **首と頭の C0 一致**: かつての `newYRaw + yOff` 一括適用だと `head_bot` 直下で出力 Y が頭側へ折れて首線が頭とズレた。
 * 首帯（`head_bot`〜`shoulder`）では `yOff` を 0→1 に線形ブレンドし、`head_bot`・`shoulder` で頭・肩ラインと連続にする。
 */
export function gridBodyTemplateYWarpWithNeckShoulderAnchor(y: number, yS: number): number {
  return gridBodyTemplateYWarpFromLandmarks(y, yS, BZ);
}

/** 平置き cm ネイティブ座標（Figma viewBox）向けの身長ワープ */
export function gridNativeBodyTemplateYWarpWithNeckShoulderAnchor(y: number, yS: number): number {
  return gridBodyTemplateYWarpFromLandmarks(
    y,
    yS,
    NATIVE_GRID_BODY_Y_LANDMARKS,
    gridBodyTemplateYRawProportionalFromLandmarks
  );
}

function gridTorsoTemplateYLateralWeightBlendFromLandmarks(y: number, lm: GridBodyYLandmarks): number {
  const yStart = lm.shoulder + 8;
  const yPeak = lm.head_bot + (lm.crotch - lm.head_bot) * 0.42;
  const yEnd = lm.crotch - 6;
  if (y <= yStart || y >= yEnd) return 0;
  if (y <= yPeak) {
    const t = (y - yStart) / Math.max(yPeak - yStart, 1e-6);
    return t * t * (3 - 2 * t);
  }
  const t = (yEnd - y) / Math.max(yEnd - yPeak, 1e-6);
  return t * t * (3 - 2 * t);
}

/** 格子ボディ: 頭〜腕山より下〜脚より上の胴（テンプレ Y）。体重横スケールはマスク込みでここ＋中央寄り X のみへブレンド */
export function gridTorsoTemplateYLateralWeightBlend(y: number): number {
  return gridTorsoTemplateYLateralWeightBlendFromLandmarks(y, BZ);
}

function gridTorsoTemplateLateralWeightMaskXYWithCx(
  x: number,
  y: number,
  bodyCx: number,
  yBlend: (yy: number) => number
): number {
  const by = yBlend(y);
  if (by <= 0) return 0;
  const adx = Math.abs(x - bodyCx);
  const inner = bodyCx * GRID_TORSO_LATERAL_MASK_X_HALF_CORE_FRAC_OF_CX;
  const fade = bodyCx * GRID_TORSO_LATERAL_MASK_X_FADE_FRAC_OF_CX;
  if (adx <= inner) return by;
  if (adx >= inner + fade) return 0;
  const t = (adx - inner) / fade;
  const smooth = t * t * (3 - 2 * t);
  return by * (1 - smooth);
}

/**
 * ベクトルモデルで部位分割しても、`(x,y)` の関数ひとつに揃えると二重線の共有座標が反るのを防ぐ。
 * 袖口・指先級（`|x−BODY_CX|` がキャンバスの半分以上）では体重横をフェードで切る。
 * 固定 px より `BODY_CX` 比率にするとボディ模板の解像度変化にも追従する。
 * inner+fade を広げすぎると標準腕アウトライン（|x−BODY_CX|≈330〜430）までマスクが残り体重が袖に乗る（ログ H1-H2）。
 */
export const GRID_TORSO_LATERAL_MASK_X_HALF_CORE_FRAC_OF_CX = 0.3;
export const GRID_TORSO_LATERAL_MASK_X_FADE_FRAC_OF_CX = 0.12;

export function gridTorsoTemplateLateralWeightMaskXY(x: number, y: number): number {
  return gridTorsoTemplateLateralWeightMaskXYWithCx(x, y, BODY_CX, gridTorsoTemplateYLateralWeightBlend);
}

export function gridNativeTorsoTemplateLateralWeightMaskXY(x: number, y: number): number {
  return gridTorsoTemplateLateralWeightMaskXYWithCx(x, y, NATIVE_GRID_BODY_CX, (yy) =>
    gridTorsoTemplateYLateralWeightBlendFromLandmarks(yy, NATIVE_GRID_BODY_Y_LANDMARKS)
  );
}

/** 線画検証: `warp` の腕帯・胴ラテラルはベクタの細曲線（裾の指先級）を頂点ごとにねじるので、胴中心基点の線形スケールのみ */
export function lineArtLinearWarpFromScales(yS: number, xS: number, opts?: LineArtLinearWarpOpts) {
  const bodyCx = opts?.bodyCx ?? BODY_CX;
  const yWarpFn = opts?.yWarpFn ?? gridBodyTemplateYWarpWithNeckShoulderAnchor;
  return (x: number, y: number): [number, number] => {
    const newY = yWarpFn(y, yS);
    return [bodyCx + (x - bodyCx) * xS, newY];
  };
}

/** 胴帯だけ `lateralRatio`（実体重 / REF）を横スケールへ混ぜる線形ワープ。輪郭後処理ではなくテンプレ変換で一体化する */
export function lineArtLinearWarpFromScalesWithTorsoWeight(
  yS: number,
  xSBase: number,
  lateralRatio: number,
  torsoMaskXY: (templateX: number, templateY: number) => number,
  opts?: LineArtLinearWarpOpts
) {
  const bodyCx = opts?.bodyCx ?? BODY_CX;
  const yWarpFn = opts?.yWarpFn ?? gridBodyTemplateYWarpWithNeckShoulderAnchor;
  return (x: number, y: number): [number, number] => {
    const newY = yWarpFn(y, yS);
    const b = torsoMaskXY(x, y);
    const xS =
      b <= 0 || Math.abs(lateralRatio - 1) < 1e-9
        ? xSBase
        : xSBase * (1 + (lateralRatio - 1) * b);
    return [bodyCx + (x - bodyCx) * xS, newY];
  };
}
