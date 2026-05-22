import type { BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import { BODY_CX, REF_HEIGHT_CM } from "@/app/(main)/development/fitting/lib/constants";
import { gridRigVectorPointToBodyTemplate } from "@/app/(main)/development/fitting/lib/rig/gridModelRigExtract";
import { inferLandmarksFromRigPaths } from "@/app/(main)/development/fitting/lib/garment/customLandmarkResolve";
import { buildCustomTransformedPathsWithVertexPlots } from "@/app/(main)/development/fitting/lib/customGarmentUtils";
import type {
  FittingCanvasRigLandmarksDebug,
  FittingShoulderFollowOptions,
} from "./fittingCanvasComputeTypes";
import { assembleCustomGarmentOverlayAndShoulderDebug } from "./fittingCanvasComputeGarmentCustomOverlay";
import { smootherStep } from "./fittingCanvasRigArmDebug";
import { rigidMapFromShoulderSegmentPair, RIG_LINE_SPINE } from "./fittingCanvasRigAlign";
import { getShoulderSeamYForData } from "@/app/(main)/development/fitting/lib/fittingContourUtils";
import { buildTopPlacement } from "@/app/(main)/development/fitting/lib/garment/garmentBase";
import { pathDsContentEqual } from "@/app/(main)/development/fitting/lib/fittingStateUtils";
import type {
  CustomGarmentData,
  MeasureOverlayData,
  ShoulderDebug,
} from "@/app/(main)/development/fitting/lib/types";
import { getAllPathPoints } from "@/app/(main)/development/fitting/lib/fittingContourUtils";
import { getPathPoints, interpolatePath, tPath } from "@/app/(main)/development/fitting/lib/pathUtils";
import { bboxCenterXFromPathDs, bboxCenterXFromPoints } from "./fittingCanvasComputeGarmentCustomBbox";
import { garmentDebugRigMatchesLoadedRig } from "@/app/(main)/development/fitting/customGarment/rigMatching";
import { isGarmentFlatCmPresetId } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";
import {
  GARMENT_FLAT_CM_PATH_ZONES,
  GARMENT_FLAT_CM_BACK_LAYER_IDS,
  type GarmentFlatCmZone,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import {
  type GarmentFlatCmDeformOptions,
  GARMENT_FLAT_CM_DEFAULT_DEFORM_OPTIONS,
  rewriteFlatCmGarmentPath,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingPathDeform";

/**
 * 体型差→服 px 局所 delta の写像。元は `./bodySizeToGarmentLocalDeltas` を import していたが、
 * 同モジュールはユーザー判断で削除済み。後段の `noOpDelta` 早期 return が常に成立する no-op に置き換え、
 * P4 (`bodyDiffViaGarmentLocalDeltas`) を実質無効化したまま import エラーだけを解消する。
 */
const bodySizeToGarmentLocalDeltas = (
  _heightCm: number,
  _weightKg: number
): { dSh: number; dBw: number; dBl: number; dSleeveLengthPx: number } => ({
  dSh: 0,
  dBw: 0,
  dBl: 0,
  dSleeveLengthPx: 0,
});

function mergeBehindBodyPathLayersForCompute(data: CustomGarmentData): {
  merged: CustomGarmentData;
  behindBodyPathCount: number;
} {
  const bb = data.behindBody;
  const nb = bb?.pathDs.length ?? 0;
  if (nb === 0 || bb == null) {
    return { merged: data, behindBodyPathCount: 0 };
  }
  const nf = data.pathDs.length;
  const take = <T>(arr: (T | undefined)[] | undefined, len: number): (T | undefined)[] =>
    Array.from({ length: len }, (_, i) => arr?.[i]);
  return {
    behindBodyPathCount: nb,
    merged: {
      ...data,
      pathDs: [...bb.pathDs, ...data.pathDs],
      pathStrokeDasharrays: [...take(bb.pathStrokeDasharrays, nb), ...take(data.pathStrokeDasharrays, nf)],
      pathStrokeWidths: [...take(bb.pathStrokeWidths, nb), ...take(data.pathStrokeWidths, nf)],
      pathStrokes: [...take(bb.pathStrokes, nb), ...take(data.pathStrokes, nf)],
      pathFills: [...take(bb.pathFills, nb), ...take(data.pathFills, nf)],
    },
  };
}

export type CustomGarmentBranchContext = {
  height: number;
  weight: number;
  customGarmentData: CustomGarmentData;
  rigLinePaths: string[] | null;
  warpRigLineRefBodyGarment: (x: number, y: number) => [number, number];
  rigSpineAlignFnGarment: ((x: number, y: number) => [number, number]) | null;
  rigSpineTranslateOnlyFnGarment: ((x: number, y: number) => [number, number]) | null;
  rigNeckAnchorTranslateOnlyFnGarment: ((x: number, y: number) => [number, number]) | null;
  rigTemplateToRigViewForGarmentPath: (pathIdx: number) => (x: number, y: number) => [number, number];
  fromCustomGarmentData: CustomGarmentData | null;
  toCustomGarmentData: CustomGarmentData | null;
  animProgress: number;
  bodyShoulderContour: [number, number][];
  /** `gridSvgBody` 系: アップロード SVG は格子 viewBox。リグロック写像は model+rig 系とは別 */
  bodyModelVariant?: BodyModelVariant;
  /** 平置き cm + 格子: Figma の 389×viewBox 座標のまま着せる（body テンプレ cover 写像なし） */
  flatCmGridNativeSvgCoords?: boolean;
  /**
   * 段階導入フラグ群（フェーズ1〜4）。未指定なら従来挙動。
   * `body-scale-lab` で確認するためのスイッチ。
   */
  shoulderFollowOptions?: FittingShoulderFollowOptions;
  /**
   * 体型由来の腕角度差分（`getDeltaThetas` 由来、ラジアン）。
   * 服側で肩2点ターゲットの回転にも使えるよう情報として伝達するが、フェーズ3 既定では人体側で 0 化されるだけで rigid マップは脊髄 align 由来の q0/q1 をそのまま使う。
   */
  bodyShoulderRigDeltaThetas?: { left: number; right: number } | null;
};

export function computeCustomGarmentBranch(
  ctx: CustomGarmentBranchContext
): {
  customPathDs: string[];
  /** `customPathDs` と同じ長さ。元 SVG の破線・線幅・stroke 色 */
  customPathStrokeDasharrays: (string | undefined)[];
  customPathStrokeWidths: (number | undefined)[];
  customPathStrokes: (string | undefined)[];
  customPathFills: (string | undefined)[];
  customRigPathDs: string[];
  shoulderDebug: ShoulderDebug;
  garmentOverlay: MeasureOverlayData["garment"];
  rigLandmarksDebug: FittingCanvasRigLandmarksDebug;
  /** 平置き cm: 背面 path 本数（`customPathDs` の先頭からこの数） */
  behindBodyPathCount: number;
} {
  const {
    height,
    weight,
    customGarmentData: customGarmentDataInput,
    rigLinePaths,
    warpRigLineRefBodyGarment,
    rigSpineAlignFnGarment,
    rigSpineTranslateOnlyFnGarment,
    rigNeckAnchorTranslateOnlyFnGarment,
    rigTemplateToRigViewForGarmentPath,
    fromCustomGarmentData,
    toCustomGarmentData,
    animProgress,
    bodyShoulderContour,
    bodyModelVariant,
    flatCmGridNativeSvgCoords,
    shoulderFollowOptions,
    bodyShoulderRigDeltaThetas,
  } = ctx;

  /**
   * フェーズ4: 体型差を服の局所伸縮へ加算する。
   * `customGarmentDataInput.pathDs` は既にサイズ選択分の delta が乗った状態（`applyWidgetSizeToCustomGarmentData` 後）。
   * 平置き cm 変形は zone ごとに線形なので、**現在 pathDs に対して body 由来 delta を更に加算的に rewrite** する。
   * フラグ off では `customGarmentDataInput` をそのまま使い後方互換。
   */
  const customGarmentData: CustomGarmentData = (() => {
    const slopeOpt: GarmentFlatCmDeformOptions | undefined = (() => {
      if (
        shoulderFollowOptions?.useShoulderSlopeDistribution === false &&
        shoulderFollowOptions?.useShoulderAnchorDrop === false
      ) {
        return undefined;
      }
      return {
        useShoulderSlopeDistribution:
          shoulderFollowOptions?.useShoulderSlopeDistribution !== false,
        useShoulderAnchorDrop:
          shoulderFollowOptions?.useShoulderAnchorDrop !== false,
      };
    })();
    if (!shoulderFollowOptions?.bodyDiffViaGarmentLocalDeltas) {
      return customGarmentDataInput;
    }
    if (!isGarmentFlatCmPresetId(customGarmentDataInput.presetId)) {
      return customGarmentDataInput;
    }
    const bodyDeltas = bodySizeToGarmentLocalDeltas(height, weight);
    const noOpDelta =
      Math.abs(bodyDeltas.dSh) < 1e-9 &&
      Math.abs(bodyDeltas.dBw) < 1e-9 &&
      Math.abs(bodyDeltas.dBl) < 1e-9 &&
      Math.abs(bodyDeltas.dSleeveLengthPx) < 1e-9;
    if (noOpDelta) return customGarmentDataInput;

    const outlineIds = customGarmentDataInput.flatCmOutlinePathIds;
    if (outlineIds == null || outlineIds.length !== customGarmentDataInput.pathDs.length) {
      return customGarmentDataInput;
    }
    const resolveZone = (i: number, pathId: string): GarmentFlatCmZone | undefined =>
      customGarmentDataInput.flatCmOutlinePathZones?.[i] ?? GARMENT_FLAT_CM_PATH_ZONES[pathId];

    const newPathDs = customGarmentDataInput.pathDs.map((curD, i) => {
      const pathId = outlineIds[i];
      if (pathId == null) return curD;
      const zone = resolveZone(i, pathId);
      if (!zone || curD == null || curD.length === 0) return curD ?? "";
      return rewriteFlatCmGarmentPath(
        curD,
        zone,
        bodyDeltas.dSh,
        bodyDeltas.dBw,
        bodyDeltas.dBl,
        bodyDeltas.dSleeveLengthPx,
        slopeOpt
      );
    });

    let newBehindBody = customGarmentDataInput.behindBody;
    const behind = customGarmentDataInput.behindBody;
    if (behind?.pathDs?.length) {
      const behindNew = behind.pathDs.map((curD, i) => {
        const pathId = behind.pathIds?.[i] ?? "";
        const canonId = GARMENT_FLAT_CM_BACK_LAYER_IDS[i];
        const zone =
          (pathId ? GARMENT_FLAT_CM_PATH_ZONES[pathId] : undefined) ??
          (canonId ? GARMENT_FLAT_CM_PATH_ZONES[canonId] : undefined);
        if (!zone || curD == null || curD.length === 0) return curD ?? "";
        return rewriteFlatCmGarmentPath(
          curD,
          zone,
          bodyDeltas.dSh,
          bodyDeltas.dBw,
          bodyDeltas.dBl,
          bodyDeltas.dSleeveLengthPx,
          slopeOpt
        );
      });
      newBehindBody = { ...behind, pathDs: behindNew };
    }

    return {
      ...customGarmentDataInput,
      pathDs: newPathDs,
      ...(newBehindBody ? { behindBody: newBehindBody } : {}),
    };
  })();

  const placeDesignToTemplate: (x: number, y: number) => [number, number] = flatCmGridNativeSvgCoords
    ? (x, y) => [x, y]
    : gridRigVectorPointToBodyTemplate;

  const rigLockTransformOpts = {
    placementLockToModelRig: true as const,
    placeDesignToBodyWhenRigLocked: placeDesignToTemplate,
  };

  const c = customGarmentData.landmarks;
  const rigN = customGarmentData.debugRigPathDs?.length ?? 0;
  const rigGeometryLockedToModel =
    rigLinePaths != null && rigLinePaths.length > 0 && rigN === rigLinePaths.length && rigN > 0;

  if (!rigGeometryLockedToModel) {
    const w: string[] =
      rigN === 0
        ? ["服SVGにリグ線がありません。モデルと同じリグ付きのSVGをアップロードしてください。"]
        : [`服のリグ本数（${rigN}）がモデル（${rigLinePaths!.length}）と一致しません。`];
    return {
      customPathDs: [],
      customPathStrokeDasharrays: [],
      customPathStrokeWidths: [],
      customPathStrokes: [],
      customPathFills: [],
      customRigPathDs: [],
      behindBodyPathCount: 0,
      shoulderDebug: {
        bodyShoulderContour,
        garmentShoulderContour: [],
        garmentShoulderPoints: [],
        garmentType: "custom",
      },
      garmentOverlay: null,
      rigLandmarksDebug: {
        inferredFromRig: false,
        rigShoulderY: null,
        rigHemY: null,
        usedShoulderY: c.shoulderY ?? null,
        usedHemY: c.hemY ?? null,
        useRigLandmarksForPlacement: false,
        rigRequirementWarnings: w,
      },
    };
  }

  const rigDs = customGarmentData.debugRigPathDs!;
  /** アップロード 9 本がモデル `rigLinePaths` と幾何一致するときだけモデル赤リグを表示用に流用する */
  const rigGeometryMatchesModel = garmentDebugRigMatchesLoadedRig(rigDs, rigLinePaths);
  const rigLm = inferLandmarksFromRigPaths(rigDs);
  const useRigLandmarksForPlacement = rigLm != null;

  const rigLandmarksDebug: FittingCanvasRigLandmarksDebug = {
    inferredFromRig: rigLm != null,
    rigShoulderY: rigLm?.shoulderY ?? null,
    rigHemY: rigLm?.hemY ?? null,
    usedShoulderY: c.shoulderY ?? null,
    usedHemY: c.hemY ?? null,
    useRigLandmarksForPlacement,
  };

  const { merged: cgPaths, behindBodyPathCount } = mergeBehindBodyPathLayersForCompute(customGarmentData);
  const customAllOutline = getAllPathPoints(cgPaths.pathDs);
  const shoulderSeamY = rigLm != null ? rigLm.shoulderY : getShoulderSeamYForData(customGarmentData);

  const topLandmarks = (() => {
    const base =
      rigLm != null
        ? {
            shoulderY: rigLm.shoulderY,
            shoulderLx: rigLm.shoulderLx,
            shoulderRx: rigLm.shoulderRx,
            pitY: rigLm.shoulderY,
            pitLx: rigLm.shoulderLx,
            pitRx: rigLm.shoulderRx,
            hemY: rigLm.hemY,
            hemCx: rigLm.hemCx,
          }
        : {
            shoulderY: shoulderSeamY,
            shoulderLx: c.shoulderLx,
            shoulderRx: c.shoulderRx,
            pitY: shoulderSeamY,
            pitLx: c.shoulderLx,
            pitRx: c.shoulderRx,
            hemY: c.hemY,
            hemCx: c.hemCx,
          };
    return {
      ...base,
      ...(c.bodyShoulderOffsetY != null ? { bodyShoulderOffsetY: c.bodyShoulderOffsetY } : {}),
      ...(c.totalWidth != null ? { totalWidth: c.totalWidth } : {}),
      ...(c.maxWidthRatio != null ? { maxWidthRatio: c.maxWidthRatio } : {}),
    };
  })();
  /**
   * 着丈→px/cm は REF 固定（身長スライダーに着丈メッシュを載せない）。
   * 検証ボディで `height` を渡すと紫着丈メッシュが身長で振れて服が大きく上下するため、ここも REF に統一する。
   */
  const placement = buildTopPlacement(
    height,
    weight,
    customGarmentData.size,
    topLandmarks,
    shoulderSeamY,
    null,
    REF_HEIGHT_CM
  );
  const placementLockToModelRigFor = (cg: { debugRigPathDs?: string[] | null } | null | undefined) =>
    !!cg &&
    rigLinePaths != null &&
    rigLinePaths.length > 0 &&
    (cg.debugRigPathDs?.length ?? 0) === rigLinePaths.length;
  const transformHeightCmForCustomPaths = REF_HEIGHT_CM;

  let customRigPathDs = rigGeometryMatchesModel ? rigLinePaths.slice() : rigDs.slice();

  const fabricShoulderLx = rigLm ? rigLm.shoulderLx : c.shoulderLx;
  const fabricShoulderRx = rigLm ? rigLm.shoulderRx : c.shoulderRx;

  let customPathDs: string[];
  let customPoints: [number, number][];
  let customPathStrokeDasharrays: (string | undefined)[] = [];
  let customPathStrokeWidths: (number | undefined)[] = [];
  let customPathStrokes: (string | undefined)[] = [];
  let customPathFills: (string | undefined)[] = [];

  if (
    fromCustomGarmentData &&
    toCustomGarmentData &&
    (() => {
      const a = mergeBehindBodyPathLayersForCompute(fromCustomGarmentData);
      const b = mergeBehindBodyPathLayersForCompute(toCustomGarmentData);
      if (a.behindBodyPathCount !== b.behindBodyPathCount) return false;
      if (a.merged.pathDs.length !== b.merged.pathDs.length) return false;
      if (
        isGarmentFlatCmPresetId(fromCustomGarmentData.presetId) &&
        isGarmentFlatCmPresetId(toCustomGarmentData.presetId)
      ) {
        return true;
      }
      return pathDsContentEqual(a.merged.pathDs, b.merged.pathDs);
    })() &&
    animProgress < 1 &&
    placementLockToModelRigFor(fromCustomGarmentData) &&
    placementLockToModelRigFor(toCustomGarmentData)
  ) {
    const fromLayers = mergeBehindBodyPathLayersForCompute(fromCustomGarmentData);
    const toLayers = mergeBehindBodyPathLayersForCompute(toCustomGarmentData);
    const fromC = fromCustomGarmentData.landmarks;
    const toC = toCustomGarmentData.landmarks;
    const fromRlm = inferLandmarksFromRigPaths(fromCustomGarmentData.debugRigPathDs!)!;
    const toRlm = inferLandmarksFromRigPaths(toCustomGarmentData.debugRigPathDs!)!;
    const shoulderYFrom = fromRlm.shoulderY;
    const shoulderYTo = toRlm.shoulderY;
    const fromMerged = {
      ...fromLayers.merged,
      landmarks: { ...fromC, ...fromRlm, shoulderY: fromRlm.shoulderY, hemY: fromRlm.hemY },
    };
    const toMerged = {
      ...toLayers.merged,
      landmarks: { ...toC, ...toRlm, shoulderY: toRlm.shoulderY, hemY: toRlm.hemY },
    };
    const fromOut = buildCustomTransformedPathsWithVertexPlots(
      fromMerged,
      REF_HEIGHT_CM,
      weight,
      shoulderYFrom,
      rigLockTransformOpts
    );
    const toOut = buildCustomTransformedPathsWithVertexPlots(toMerged, REF_HEIGHT_CM, weight, shoulderYTo, rigLockTransformOpts);
    const t = smootherStep(animProgress);
    customPathDs = fromOut.pathDs.map((d, i) =>
      interpolatePath(d, toOut.pathDs[i] ?? d, t)
    );
    customPathStrokeDasharrays = fromOut.pathDs.map((_, i) =>
      t < 0.5 ? fromOut.pathStrokeDasharrays[i] : toOut.pathStrokeDasharrays[i]
    );
    customPathStrokeWidths = fromOut.pathDs.map((_, i) =>
      t < 0.5 ? fromOut.pathStrokeWidths[i] : toOut.pathStrokeWidths[i]
    );
    customPathStrokes = fromOut.pathDs.map((_, i) =>
      t < 0.5 ? fromOut.pathStrokes[i] : toOut.pathStrokes[i]
    );
    customPathFills = fromOut.pathDs.map((_, i) =>
      t < 0.5 ? fromOut.pathFills[i] : toOut.pathFills[i]
    );
    const n = Math.min(fromOut.vertexPlotsBodySpace.length, toOut.vertexPlotsBodySpace.length);
    customPoints = Array.from({ length: n }, (unused, i) => {
      const a = fromOut.vertexPlotsBodySpace[i]!;
      const b = toOut.vertexPlotsBodySpace[i]!;
      return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] as [number, number];
    });
  } else {
    // 肩ライン合わせのため shoulderSeamY を渡す（リグロック時はリグ推定肩・裾で服と同一 place）
    const mergedLandmarks =
      useRigLandmarksForPlacement && rigLm
        ? { ...c, ...rigLm, shoulderY: rigLm.shoulderY, hemY: rigLm.hemY }
        : { ...c, shoulderY: shoulderSeamY, hemY: c.hemY };
    const transformed = buildCustomTransformedPathsWithVertexPlots(
      { ...cgPaths, landmarks: mergedLandmarks },
      transformHeightCmForCustomPaths,
      weight,
      shoulderSeamY,
      rigLockTransformOpts
    );
    customPathDs = transformed.pathDs;
    customPoints = transformed.vertexPlotsBodySpace;
    customPathStrokeDasharrays = transformed.pathStrokeDasharrays;
    customPathStrokeWidths = transformed.pathStrokeWidths;
    customPathStrokes = transformed.pathStrokes;
    customPathFills = transformed.pathFills;
  }

  /**
   * リグロック時: ワープ前にテンプレ X をシフトして体の中心に寄せる。
   * 頂点「平均」X は片側に点が密だと寄り、右（左）に寄せ過ぎるため、服は bbox 中心、脊髄は path0 の bbox 中心。
   * 脊髄が取れないときは BODY_CX をターゲットにする。
   * シフト量の garment 側は `debugRigPathDs` を place した bbox 中心（無ければ服 path）に固定し、右左への寄せ過ぎを防ぐ。
   */
  let templateShiftXLocked = 0;
  if (rigLinePaths.length > RIG_LINE_SPINE) {
    const spineD = rigLinePaths[RIG_LINE_SPINE];
    const garmentCx = (() => {
      const rigDs = customGarmentData.debugRigPathDs;
      if (rigDs != null && rigDs.length > 0) {
        const placedRig = rigDs.map((d) => tPath(d, placeDesignToTemplate));
        const cx = bboxCenterXFromPathDs(placedRig);
        if (cx != null && Number.isFinite(cx)) return cx;
      }
      return bboxCenterXFromPathDs(customPathDs);
    })();
    const spinePts = spineD ? getPathPoints(spineD) : [];
    const rigSpineCx = spinePts.length
      ? bboxCenterXFromPoints(spinePts)
      : null;
    const targetCx = rigSpineCx ?? BODY_CX;
    if (garmentCx != null) {
      templateShiftXLocked = targetCx - garmentCx;
    }
  }
  if (Math.abs(templateShiftXLocked) > 0.01) {
    const sh = templateShiftXLocked;
    customPathDs = customPathDs.map((d) => tPath(d, (x, y) => [x + sh, y]));
    customPoints = customPoints.map(([x, y]) => [x + sh, y] as [number, number]);
  }

  /**
   * フェーズ1: 格子ボディでも肩2点剛体追従を有効化する。
   * 既存挙動は「格子は平行移動のみ（袖口の向きが身長でズレる懸念）」だったが、
   * `useShoulderRigidFollowAllModes` で剛体追従に切替可能（フェーズ2 の肩スロープ分配と組み合わせて
   * 肩浮き・腕下回り込みを抑える）。
   */
  const gridGarmentBypassRigidFabric =
    !shoulderFollowOptions?.useShoulderRigidFollowAllModes &&
    (bodyModelVariant === "gridSvgBody" || bodyModelVariant === "gridSvgBodyBack");

  const customGarmentFabricRigViewWarp: (x: number, y: number) => [number, number] = (() => {
    const translateOnly = (x: number, y: number): [number, number] => {
      const refW = warpRigLineRefBodyGarment(x, y);
      const [rx, ry] = refW;
      if (gridGarmentBypassRigidFabric) {
        return refW;
      }
      if (rigNeckAnchorTranslateOnlyFnGarment != null) {
        return rigNeckAnchorTranslateOnlyFnGarment(rx, ry);
      }
      if (rigSpineTranslateOnlyFnGarment != null) {
        return rigSpineTranslateOnlyFnGarment(rx, ry);
      }
      return refW;
    };
    /** 既定ボディも検証ボディも同一: ref ワープ → 肩2点の脊髄合わせ後位置で剛体マップ（浮き制御はここで行う） */
    if (!rigSpineAlignFnGarment) return translateOnly;
    if (gridGarmentBypassRigidFabric) {
      return translateOnly;
    }
    /**
     * 肩アンカー＋オチは path 変形で済む。剛体回転まで掛けると袖の下り角度が潰れて見えるため平行移動のみ。
     */
    if (shoulderFollowOptions?.useShoulderAnchorDrop === true) {
      return translateOnly;
    }
    const [rslx, rsly] = placeDesignToTemplate(fabricShoulderLx, shoulderSeamY);
    const [rsrx, rsry] = placeDesignToTemplate(fabricShoulderRx, shoulderSeamY);
    const alx = rslx;
    const aly = rsly;
    const arx = rsrx;
    const ary = rsry;
    const sx = templateShiftXLocked;
    const p0 = warpRigLineRefBodyGarment(alx + sx, aly) as [number, number];
    const p1 = warpRigLineRefBodyGarment(arx + sx, ary) as [number, number];
    let q0 = rigSpineAlignFnGarment(p0[0], p0[1]);
    let q1 = rigSpineAlignFnGarment(p1[0], p1[1]);
    /**
     * フェーズ3: 人体側で Δθ を 0 化したぶんを服側で吸収する。
     * 肩2点目標 (q0_L, q1_R) を肩中点まわりで Δθ_L / -Δθ_R 回転し、
     * 肩線がΔθの分だけ「ねじれる」ように rigid マップへ投入する。
     * `bodyRigFreezeArmAngle` が立っていない（=人体スキニングが従来どおり腕角を反映）ときは、
     * 二重適用を避けるためここはスキップ。
     */
    if (
      shoulderFollowOptions?.bodyRigFreezeArmAngle === true &&
      bodyShoulderRigDeltaThetas != null &&
      (Math.abs(bodyShoulderRigDeltaThetas.left) > 1e-9 ||
        Math.abs(bodyShoulderRigDeltaThetas.right) > 1e-9)
    ) {
      const cqx = (q0[0] + q1[0]) / 2;
      const cqy = (q0[1] + q1[1]) / 2;
      const rotateAround = (p: [number, number], theta: number): [number, number] => {
        const dx = p[0] - cqx;
        const dy = p[1] - cqy;
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        return [cqx + dx * c - dy * s, cqy + dx * s + dy * c];
      };
      q0 = rotateAround(q0, bodyShoulderRigDeltaThetas.left);
      q1 = rotateAround(q1, -bodyShoulderRigDeltaThetas.right);
    }
    const rigidMap = rigidMapFromShoulderSegmentPair(p0, p1, q0, q1);
    if (rigidMap == null) return translateOnly;
    return (x: number, y: number) => rigidMap(warpRigLineRefBodyGarment(x, y) as [number, number]);
  })();

  /** デザイン座標 → canvas。place → テンプレ X シフト → fabric ワープ */
  const designToGarmentCanvas = (gx: number, gy: number): [number, number] => {
    const [px, py] = placeDesignToTemplate(gx, gy);
    return customGarmentFabricRigViewWarp(px + templateShiftXLocked, py);
  };

  customPathDs = customPathDs.map((d) => tPath(d, customGarmentFabricRigViewWarp));
  if (rigGeometryMatchesModel) {
    customRigPathDs = customRigPathDs.map((d, idx) => tPath(d, rigTemplateToRigViewForGarmentPath(idx)));
  } else {
    customRigPathDs = customRigPathDs.map((d) =>
      tPath(d, (x, y) => {
        const [px, py] = placeDesignToTemplate(x, y);
        return customGarmentFabricRigViewWarp(px + templateShiftXLocked, py);
      })
    );
  }
  customPoints = customPoints.map(([x, y]) => customGarmentFabricRigViewWarp(x, y));

  /**
   * 同一 path のサイズのみ補間するとき true（オーバーレイデバッグ用）。
   */
  const animatingCustomSizeBlend =
    fromCustomGarmentData != null &&
    toCustomGarmentData != null &&
    pathDsContentEqual(fromCustomGarmentData.pathDs, toCustomGarmentData.pathDs) &&
    animProgress < 1;

  const { garmentOverlay, shoulderDebug } = assembleCustomGarmentOverlayAndShoulderDebug({
    customGarmentData,
    customPoints,
    customAllOutline,
    bodyShoulderContour,
    c,
    rigLm,
    useRigLandmarksForPlacement,
    hasGarmentRig: true,
    shoulderSeamY,
    placeDesignToTemplate,
    designToGarmentCanvas,
    customGarmentFabricRigViewWarp,
    bodyPxPerCm: placement.bodyPxPerCm,
    animatingCustomSizeBlend,
  });

  return {
    customPathDs,
    customPathStrokeDasharrays,
    customPathStrokeWidths,
    customPathStrokes,
    customPathFills,
    customRigPathDs,
    behindBodyPathCount,
    shoulderDebug,
    garmentOverlay,
    rigLandmarksDebug,
  };
}
