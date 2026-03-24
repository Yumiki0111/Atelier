/**
 * sleeveOnly パイプライン: 着丈・袖丈のグレーディング＋プレースメント。
 * 外腕シームは肩ピボット周りにブレンド回転し、ワープ後の腕アウトラインに沿わせる（無いと袖と体の隙間が出やすい）。
 * 袖付け付近は重み 0 で placeFn のままなので、肩のプレース位置は動かさない。
 */

export type { SleeveOnlyTransformParams } from "./sleeveOnlyTransformCtx";
export { shouldScaleSleevePathAsBody } from "./sleeveOnlyTransformCtx";
export {
  applySleeveOnlyGarmentTransform,
  customGarmentVertexPlotsSleeveOnlyBodySpace,
} from "./sleeveOnlyTransformApply";
