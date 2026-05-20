import { BZ, BODY_CX } from "@/app/(main)/development/fitting/lib/constants";

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

/**
 * テンプレ Y（`BZ.head_bot` より上は固定、以下は折れ線）の身長ワープ。
 *
 * **パーツ境界の一致**: 結び目は {@link BZ} の landmark（`shoulder` / `crotch` / `foot`）のみとし、
 * テンプレ上で同じ Y に乗る頂点（隣接パスの共有点含む）は写像が `y` のみの関数なので常に同一出力 Y へ集まり、帯の境界が開かない。
 * 結び目の値をここと模板 SVG・`bodyZones` でずらさないこと。
 */
export function gridBodyTemplateYRawFromHeightScale(y: number, yS: number): number {
  if (y <= BZ.head_bot) return y;
  const [L0, L1, L2] = GRID_Y_SEGMENT_LEN;
  const Lsum = L0 + L1 + L2;
  const f = GRID_BODY_HEIGHT_GROWTH_FRACTION_TO_STATURE;
  const deltaTotal = (yS - 1) * Lsum;
  const Lp0 = L0 + f[0]! * deltaTotal;
  const Lp1 = L1 + f[1]! * deltaTotal;
  const Lp2 = L2 + f[2]! * deltaTotal;
  const yKb = BZ.head_bot;
  const yK1 = BZ.shoulder;
  const yK2 = BZ.crotch;
  const yK3 = BZ.foot;
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

/**
 * 頭は `head_bot` 以下で未変形。それより下は {@link gridBodyTemplateYRawFromHeightScale} に肩合わせ。
 *
 * **首と頭の C0 一致**: かつての `newYRaw + yOff` 一括適用だと `head_bot` 直下で出力 Y が頭側へ折れて首線が頭とズレた。
 * 首帯（`head_bot`〜`shoulder`）では `yOff` を 0→1 に線形ブレンドし、`head_bot`・`shoulder` で頭・肩ラインと連続にする。
 */
export function gridBodyTemplateYWarpWithNeckShoulderAnchor(y: number, yS: number): number {
  if (y <= BZ.head_bot) return y;
  const g = gridBodyTemplateYRawFromHeightScale(y, yS);
  const yOff = BZ.shoulder - gridBodyTemplateYRawFromHeightScale(BZ.shoulder, yS);
  const lNeck = Math.max(BZ.shoulder - BZ.head_bot, 1e-9);
  if (y <= BZ.shoulder) {
    const t = (y - BZ.head_bot) / lNeck;
    return g + yOff * t;
  }
  return g + yOff;
}

/** 線画検証: `warp` の腕帯・胴ラテラルはベクタの細曲線（裾の指先級）を頂点ごとにねじるので、胴中心基点の線形スケールのみ */
export function lineArtLinearWarpFromScales(yS: number, xS: number) {
  return (x: number, y: number): [number, number] => {
    const newY = gridBodyTemplateYWarpWithNeckShoulderAnchor(y, yS);
    return [BODY_CX + (x - BODY_CX) * xS, newY];
  };
}

/** 格子ボディ: 頭〜腕山より下〜脚より上の胴（テンプレ Y）。体重横スケールはマスク込みでここ＋中央寄り X のみへブレンド */
export function gridTorsoTemplateYLateralWeightBlend(y: number): number {
  const yStart = BZ.shoulder + 50;
  const yPeak = BZ.belly;
  const yEnd = BZ.hip;
  if (y <= yStart || y >= yEnd) return 0;
  if (y <= yPeak) {
    const t = (y - yStart) / Math.max(yPeak - yStart, 1e-6);
    return t * t * (3 - 2 * t);
  }
  const t = (yEnd - y) / Math.max(yEnd - yPeak, 1e-6);
  return t * t * (3 - 2 * t);
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
  const by = gridTorsoTemplateYLateralWeightBlend(y);
  if (by <= 0) return 0;
  const adx = Math.abs(x - BODY_CX);
  const inner = BODY_CX * GRID_TORSO_LATERAL_MASK_X_HALF_CORE_FRAC_OF_CX;
  const fade = BODY_CX * GRID_TORSO_LATERAL_MASK_X_FADE_FRAC_OF_CX;
  if (adx <= inner) return by;
  if (adx >= inner + fade) return 0;
  const t = (adx - inner) / fade;
  const smooth = t * t * (3 - 2 * t);
  return by * (1 - smooth);
}

/** 胴帯だけ `lateralRatio`（実体重 / REF）を横スケールへ混ぜる線形ワープ。輪郭後処理ではなくテンプレ変換で一体化する */
export function lineArtLinearWarpFromScalesWithTorsoWeight(
  yS: number,
  xSBase: number,
  lateralRatio: number,
  torsoMaskXY: (templateX: number, templateY: number) => number
) {
  return (x: number, y: number): [number, number] => {
    const newY = gridBodyTemplateYWarpWithNeckShoulderAnchor(y, yS);
    const b = torsoMaskXY(x, y);
    const xS =
      b <= 0 || Math.abs(lateralRatio - 1) < 1e-9
        ? xSBase
        : xSBase * (1 + (lateralRatio - 1) * b);
    return [BODY_CX + (x - BODY_CX) * xS, newY];
  };
}
