import type { JacketSize, ShirtSize } from "@/app/(main)/development/fitting/lib/types";

/** 服は塗りなし（透明）。輪郭のみ */
export const GARMENT_FILL = "none";

/** 開発ページのデフォルト体重（`weightKgFromBodyVal(DEFAULT)` ≈ 53kg） */
export const DEFAULT_FIT_BODY_VAL = 9;

export const VIEWBOX_W = 1505;
export const PREVIEW_SHIRT_SIZE: ShirtSize = "48";
export const PREVIEW_JACKET_SIZE: JacketSize = "4";
/** 開発ページよりやや長め（smootherStep 併用で立ち上がりを緩める） */
export const PREVIEW_SIZE_ANIM_MS = 480;
