import { BODY_CX, BODY_H, BZ } from "./constants";

/**
 * UI は `GridSvgBodyLayer` でパス直描き（`<image href=".svg">` だと巨大 SVG が欠け描画されうる）。
 * 正本は **Group 107** エクスポート等。欠けたら差し替え。
 * **ピクセルストリップ**は `svg:strip-grid-rig-pixels`: リグは **Bresenham ラスタ**（折れ線が通る整数マス）上の暗 fill のみ除去（面の黒＝髪・パンツとは別）。旧「近傍距離」は `--legacy-distance`。頭・腰は Y 帯ガード。
 * 線画オーバーレイの正本は **`public/fitting-models/grid-rig-vector9.svg`（Vector (9).svg と置換）**。`d` を変えたら `npm run sync:grid-rig-d`。
 * 格子本体 SVG から末尾の黒 `stroke` だけ除くのは任意（赤オーバーレイに寄せる場合）。
 * 格子の 1×1 fill が正。マスク減算ではなく、ストリップで `<path>` を消すと白欠けになる。
 */
export const GRID_SVG_BODY_HREF = "/fitting-models/grid-body-group-107.svg";
export const GRID_SVG_SRC_W = 390;
export const GRID_SVG_SRC_H = 521;
/** 胴体ピクセル SVG 上端 y を `BZ.head_top` に合わせる（リグ線画 389×518 とは別） */
export const GRID_SVG_TOP_Y = 3;
export const GRID_SVG_BODY_W = BODY_CX * 2;
export const GRID_SVG_BODY_H = BODY_H;

/** SVG viewBox → ボディテンプレ 1505×2852（画像 `preserveAspectRatio="none"` と同系の軸独立線形） */
export function gridSvgPointToBodyTemplate(sx: number, sy: number): [number, number] {
  const kY = (BODY_H - BZ.head_top) / (GRID_SVG_SRC_H - GRID_SVG_TOP_Y);
  const kX = (BODY_CX * 2) / GRID_SVG_SRC_W;
  return [sx * kX, BZ.head_top + (sy - GRID_SVG_TOP_Y) * kY];
}
