import type { GarmentType } from "@/app/(main)/development/fitting/lib/types";
import { bodyHeight } from "@/app/(main)/development/fitting/lib/bodyUtils";
import { getPathPoints } from "@/app/(main)/development/fitting/lib/pathUtils";
import { GARMENT_FLAT_CM_VIEWBOX } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";

/** ログ検証: 身長変化で rig bbox が body より最大 ~107px 内外側にはみ出す → 余裕を見て両側に確保 */
export const GRID_CUSTOM_VIEWBOX_RIG_MARGIN_X = 128;

function scanPathDsBBox(ds: string[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const d of ds) {
    if (!d || d.length === 0) continue;
    for (const [x, y] of getPathPoints(d)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

export function computeFittingCanvasSnapshotViewBox(opts: {
  garment: GarmentType;
  useLinearBodyWarpForSvgTemplates: boolean;
  flatCmGridBodyUsesLiveHeightWarp: boolean;
  /** 平置き cm: Figma 389×525 座標のまま描画 → viewBox を内容 bbox に合わせる */
  flatCmGridNativeSvgCoords?: boolean;
  /** 現在体型の縦スケール（meet 縦〜足元調整に使用） */
  yScale: number;
  /** REF 線形での縦スケール（平置き REF モード時の viewBox 縦ベースに使用） */
  refRigYs: number;
  bodyPaths: string[];
  rigLineWarpedRigViewPaths: string[];
  rigLineWarpedPaths: string[];
  customPathDs: string[];
  customRigPathDs: string[];
  shirtPathD: string | null;
  jacketFill: string | null;
  jacketDetail: string | null;
}): {
  viewBoxMinX: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  /** `bodyHeight` に渡す縦スケール（ログ・検証用） */
  yScaleForViewBoxVertical: number;
} {
  const {
    garment,
    useLinearBodyWarpForSvgTemplates,
    flatCmGridBodyUsesLiveHeightWarp,
    flatCmGridNativeSvgCoords,
    yScale,
    refRigYs,
    bodyPaths,
    rigLineWarpedRigViewPaths,
    rigLineWarpedPaths,
    customPathDs,
    customRigPathDs,
    shirtPathD,
    jacketFill,
    jacketDetail,
  } = opts;

  if (flatCmGridNativeSvgCoords && garment === "custom") {
    const pad = 16;
    const parts = GARMENT_FLAT_CM_VIEWBOX.trim().split(/\s+/).map(Number);
    const fallbackW = parts[2] ?? 389;
    const fallbackH = parts[3] ?? 525;
    const toScan: string[] = [
      ...bodyPaths,
      ...customPathDs,
      ...customRigPathDs,
      ...(rigLineWarpedRigViewPaths.length > 0
        ? rigLineWarpedRigViewPaths
        : rigLineWarpedPaths),
    ];
    const { minX, maxX, minY, maxY } = scanPathDsBBox(toScan);
    if (
      Number.isFinite(minX) &&
      Number.isFinite(maxX) &&
      Number.isFinite(minY) &&
      Number.isFinite(maxY)
    ) {
      const viewBoxMinX = Math.max(0, Math.floor(minX - pad));
      const viewBoxWidth = Math.ceil(maxX + pad - viewBoxMinX);
      /**
       * ライブ身長: viewBox を常に maxY 追従にすると `meet` で見かけ身長が一定になる。
       * 170cm 基準の fallbackH を床にし、低身長は枠内に余白・高身長は足元まで伸ばす。
       */
      const viewBoxHeight = flatCmGridBodyUsesLiveHeightWarp
        ? Math.max(fallbackH, Math.ceil(maxY + pad))
        : Math.ceil(maxY + pad);
      const yScaleForViewBoxVertical = refRigYs;
      return { viewBoxMinX, viewBoxWidth, viewBoxHeight, yScaleForViewBoxVertical };
    }
    return {
      viewBoxMinX: 0,
      viewBoxWidth: fallbackW,
      viewBoxHeight: fallbackH,
      yScaleForViewBoxVertical: refRigYs,
    };
  }

  /**
   * 格子: **custom** は常に REF 縦基準。さらに **ライブ身長ワープ**（平置き cm・Body Scale Lab の shirt 含む）時は
   * 縦基準を REF に固定し、身長スライダーで meet が連動しないようにする（画面上の腕角のズーム錯視を防ぐ）。
   * ライブ身長オン時は底の maxY 追従もしない（viewBox 寸法をスライダーで固定）。足先はややはみ出しうる。
   * ライブオフの格子では従来どおり `bodyPaths` の maxY で底だけ拡張する。
   */
  const yScaleForViewBoxVertical =
    useLinearBodyWarpForSvgTemplates && (garment === "custom" || flatCmGridBodyUsesLiveHeightWarp)
      ? refRigYs
      : yScale;
  const baseViewBoxH = Math.ceil(bodyHeight(yScaleForViewBoxVertical));
  let viewBoxHeight = baseViewBoxH;
  /** 格子ボディ: ワープ後の足先がテンプレ基準をわずかに超えうる。はみ出しで「縮小表示」に見えないよう底を広げる */
  const expandGridViewBoxBottomFromWarpedBodyPaths =
    useLinearBodyWarpForSvgTemplates && bodyPaths.length > 0 && !flatCmGridBodyUsesLiveHeightWarp;
  if (expandGridViewBoxBottomFromWarpedBodyPaths) {
    let maxY = -Infinity;
    for (const d of bodyPaths) {
      for (const [, y] of getPathPoints(d)) {
        if (y > maxY) maxY = y;
      }
    }
    if (Number.isFinite(maxY)) {
      viewBoxHeight = Math.max(baseViewBoxH, Math.ceil(maxY + 20));
    }
  }
  let viewBoxMinX = 0;
  let viewBoxWidth = 1505;
  /**
   * ワープ後のボディ・服は 0–1505 のカノン幅を左右にはみ出しうる（特に低身長＋格子系）。
   * viewBox を内容の X 範囲に合わせないと `meet` 後もピクセル描画が親の overflow で欠ける。
   *
   * 格子+custom: **モデル赤リグの腕線だけ**が身長で左右に伸び、それを scan に含めると viewBoxMinX/Width がスライダーで動き体が「滑る」。fabric（body+custom path）だけで bbox を取り、リグはみ出しは固定マージンで確保する。
   */
  const expandViewBoxX = garment === "custom" && bodyPaths.length > 0;
  if (expandViewBoxX) {
    const skipLiveRigInViewBoxX =
      useLinearBodyWarpForSvgTemplates && garment === "custom";
    const pad = skipLiveRigInViewBoxX ? 32 + GRID_CUSTOM_VIEWBOX_RIG_MARGIN_X : 32;
    let minX = Infinity;
    let maxX = -Infinity;
    const scanXs = (ds: string[]) => {
      for (const d of ds) {
        if (!d || d.length === 0) continue;
        for (const [x] of getPathPoints(d)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    };
    scanXs(bodyPaths);
    const rigDraw =
      rigLineWarpedRigViewPaths.length > 0 ? rigLineWarpedRigViewPaths : rigLineWarpedPaths;
    if (rigDraw.length > 0 && !skipLiveRigInViewBoxX) scanXs(rigDraw);
    if (garment === "custom") {
      if (customPathDs.length > 0) scanXs(customPathDs);
      if (customRigPathDs.length > 0 && !skipLiveRigInViewBoxX) scanXs(customRigPathDs);
    } else if (garment === "shirt" && shirtPathD) {
      scanXs([shirtPathD]);
    } else if (garment === "jacket" && jacketFill != null) {
      scanXs([jacketFill]);
      if (jacketDetail) scanXs([jacketDetail]);
    }
    if (Number.isFinite(minX) && Number.isFinite(maxX)) {
      viewBoxMinX = Math.min(0, Math.floor(minX - pad));
      viewBoxWidth = Math.max(1505, Math.ceil(maxX + pad - viewBoxMinX));
    }
  }

  return { viewBoxMinX, viewBoxWidth, viewBoxHeight, yScaleForViewBoxVertical };
}
