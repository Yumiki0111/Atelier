"use client";

import {
  warp,
  warpArmOutline,
  getInterpolatedArmOutline,
  bodyHeight,
  getZonesAnchored,
  getBodyParams,
  getDeltaThetas,
  getSkinnedVertex,
} from "../lib/bodyUtils";
import { tPath, getPathPoints } from "../lib/pathUtils";
import { BPATHS_MODEL } from "../lib/pathData";
import {
  BZ,
  BODY_CX,
  BODY_ARM_OUTLINE_L,
  BODY_ARM_PEAK_INDEX,
  REF_HEIGHT_CM,
  REF_WEIGHT_KG,
} from "../lib/constants";
import { buildRigSkinSegments, deformBodyPointToRig } from "../lib/rigSkin2D";
import { shoulderContourFromPath } from "../lib/fittingContourUtils";
import {
  RIG_LINE_ARM_L,
  RIG_LINE_ARM_R,
  RIG_LINE_CLAVICLE_R,
  RIG_LINE_PATH_COUNT,
  RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM,
  applyRigArmAngleTiltToWarpedRigPaths,
  computeRigSpineAlignFn,
  computeRigSpineTranslateOnlyFn,
  computeRigNeckAnchorTranslateOnlyFn,
  alignRigRefPathsToCurrentSpine,
  extractRigShoulderAnchorGeometry,
  rotatePointAboutPivotPx,
  buildRigRedLineArmDiagram,
} from "./fittingCanvasRigAlign";
import { buildRigArmAngleDebug } from "./fittingCanvasRigArmDebug";
import type {
  FittingCanvasRigLandmarksDebug,
  FittingCanvasSnapshot,
  UseFittingCanvasDataParams,
} from "./fittingCanvasComputeTypes";
import type { MeasureOverlayData, ShoulderDebug } from "../lib/types";
import { computeJacketGarmentBranch } from "./fittingCanvasComputeGarmentJacket";
import { computeShirtGarmentBranch } from "./fittingCanvasComputeGarmentShirt";
import { computeCustomGarmentBranch } from "./fittingCanvasComputeGarmentCustom";

export type {
  UseFittingCanvasDataParams,
  FittingCanvasSnapshot,
  FittingCanvasRigLandmarksDebug,
  FittingCanvasRigArmAngleDebug,
  RigRedLineArmDiagram,
} from "./fittingCanvasComputeTypes";

export { buildRigRedLineArmDiagram } from "./fittingCanvasRigAlign";
export { computeRigArmAngleDebug } from "./fittingCanvasRigArmDebug";

export function computeFittingCanvasSnapshot(
  {
    height,
    weight,
    garment,
    shirtSize,
    customGarmentData,
    jacketSize = "4",
    animProgress,
    fromSize,
    toSize,
    fromCustomGarmentData = null,
    toCustomGarmentData = null,
    genericVertexPlotHighlight = null,
    rigLinePaths,
  }: UseFittingCanvasDataParams & { rigLinePaths: string[] | null }
): FittingCanvasSnapshot {
  const { yScale, xScale } = getBodyParams(height, weight, rigLinePaths);
  const zones = getZonesAnchored(yScale);
  const { left: leftArmOutline, right: rightArmOutline } = getInterpolatedArmOutline(height);
  const leftArmWarped = warpArmOutline(leftArmOutline, true, yScale, xScale, zones, height);
  const rightArmWarped = warpArmOutline(rightArmOutline, false, yScale, xScale, zones, height);
  const leftShoulder = leftArmWarped[0];
  const rightShoulder = rightArmWarped[0];
  const deltaThetas = getDeltaThetas(height, weight);
  const SKIN_MAX_DIST = 150;
  const warpOptsBody = { heightCm: height } as const;
  const warpFn = (x: number, y: number): [number, number] => {
    const w = warp(x, y, yScale, xScale, zones, warpOptsBody);
    const dL = Math.hypot(w[0] - leftShoulder[0], w[1] - leftShoulder[1]);
    const dR = Math.hypot(w[0] - rightShoulder[0], w[1] - rightShoulder[1]);
    if (dL <= dR && dL < SKIN_MAX_DIST)
      return getSkinnedVertex(w, leftShoulder, deltaThetas.left, SKIN_MAX_DIST);
    if (dR < SKIN_MAX_DIST)
      return getSkinnedVertex(w, rightShoulder, deltaThetas.right, SKIN_MAX_DIST);
    return w;
  };

  /** 計算用の現在ワープリグは `rigLineWarpedPaths`。体輪郭は `rigLineWarpedRigViewPaths` 基準でリグ追従（未ロード時は `warpFn`）。 */
  const warpRigLine = (x: number, y: number): [number, number] =>
    warp(x, y, yScale, xScale, zones, warpOptsBody);

  // 身長 yScale は脊髄スパン連動済み。表示リグ（基準リグ＋脊髄合わせ・頭はスケール弱）と体輪郭追従を同じワープ後パスに揃える。
  const rigLineWarpedPaths = rigLinePaths ? rigLinePaths.map((d) => tPath(d, warpRigLine)) : [];
  // 基準身長 170 のまま、横幅だけ現在体重に合わせる。脊髄合わせで身長差を解消（体・画面上のモデル赤リグ用）。
  const { yScale: refRigYs, xScale: refRigXs } = getBodyParams(
    REF_HEIGHT_CM,
    weight,
    rigLinePaths
  );
  const refRigZones = getZonesAnchored(refRigYs);
  const warpOptsRefBody = { heightCm: REF_HEIGHT_CM } as const;
  const warpRigLineRefBody = (x: number, y: number): [number, number] =>
    warp(x, y, refRigYs, refRigXs, refRigZones, warpOptsRefBody);
  const rigRefWarpedPaths = rigLinePaths
    ? rigLinePaths.map((d) => tPath(d, warpRigLineRefBody))
    : [];

  /** 服 SVG・服に載せる赤リグ: 横 xScale を体重で変えない（身長＋リグ y のみ体に追う） */
  const { yScale: ysGarment, xScale: xsGarment } = getBodyParams(height, REF_WEIGHT_KG, rigLinePaths);
  const zonesGarment = getZonesAnchored(ysGarment);
  const warpRigLineGarment = (x: number, y: number): [number, number] =>
    warp(x, y, ysGarment, xsGarment, zonesGarment, warpOptsBody);
  const rigLineWarpedPathsGarment = rigLinePaths ? rigLinePaths.map((d) => tPath(d, warpRigLineGarment)) : [];
  const { yScale: refRigYsG, xScale: refRigXsG } = getBodyParams(
    REF_HEIGHT_CM,
    REF_WEIGHT_KG,
    rigLinePaths
  );
  const refRigZonesG = getZonesAnchored(refRigYsG);
  const warpRigLineRefBodyGarment = (x: number, y: number): [number, number] =>
    warp(x, y, refRigYsG, refRigXsG, refRigZonesG, warpOptsRefBody);
  const rigRefWarpedPathsGarment = rigLinePaths
    ? rigLinePaths.map((d) => tPath(d, warpRigLineRefBodyGarment))
    : [];
  const rigSpineAlignFnGarment =
    rigRefWarpedPathsGarment.length > 0 && rigLineWarpedPathsGarment.length > 0
      ? computeRigSpineAlignFn(rigRefWarpedPathsGarment, rigLineWarpedPathsGarment)
      : null;
  const rigSpineTranslateOnlyFnGarment =
    rigRefWarpedPathsGarment.length >= RIG_LINE_PATH_COUNT &&
    rigLineWarpedPathsGarment.length >= RIG_LINE_PATH_COUNT
      ? computeRigSpineTranslateOnlyFn(rigRefWarpedPathsGarment, rigLineWarpedPathsGarment)
      : null;
  const rigNeckAnchorTranslateOnlyFnGarment =
    rigRefWarpedPathsGarment.length > RIG_LINE_CLAVICLE_R &&
    rigLineWarpedPathsGarment.length > RIG_LINE_CLAVICLE_R
      ? computeRigNeckAnchorTranslateOnlyFn(rigRefWarpedPathsGarment, rigLineWarpedPathsGarment)
      : null;
  const rigLineWarpedRigViewPathsBaseGarment =
    rigRefWarpedPathsGarment.length > 0 && rigLineWarpedPathsGarment.length > 0
      ? alignRigRefPathsToCurrentSpine(rigRefWarpedPathsGarment, rigLineWarpedPathsGarment)
      : rigRefWarpedPathsGarment;
  const rigAlignTemplateToRigViewGarment = (x: number, y: number): [number, number] => {
    const refW = warpRigLineRefBodyGarment(x, y);
    return rigSpineAlignFnGarment ? rigSpineAlignFnGarment(refW[0], refW[1]) : refW;
  };

  /**
   * テンプレート座標を、画面上のモデル赤リグ（`rigLineWarpedRigViewPaths`）と同じパイプラインへ写す。
   * 服リグは `bodyFollowFn`（肌用ブレンド）だと赤線とずれるためこちらを使う。
   */
  const rigLineWarpedRigViewPathsBase =
    rigRefWarpedPaths.length > 0 && rigLineWarpedPaths.length > 0
      ? alignRigRefPathsToCurrentSpine(rigRefWarpedPaths, rigLineWarpedPaths)
      : rigRefWarpedPaths;

  const rigArmTiltTwistL = (-(height - REF_HEIGHT_CM) * (RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM * Math.PI)) / 180;
  const rigArmTiltTwistR = ((height - REF_HEIGHT_CM) * (RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM * Math.PI)) / 180;

  const rigArmPivotLGarment: [number, number] | null =
    rigLineWarpedRigViewPathsBaseGarment.length > RIG_LINE_ARM_L
      ? (getPathPoints(rigLineWarpedRigViewPathsBaseGarment[RIG_LINE_ARM_L]!)[0] ?? null)
      : null;
  const rigArmPivotRGarment: [number, number] | null =
    rigLineWarpedRigViewPathsBaseGarment.length > RIG_LINE_ARM_R
      ? (getPathPoints(rigLineWarpedRigViewPathsBaseGarment[RIG_LINE_ARM_R]!)[0] ?? null)
      : null;

  /** カスタム服の赤リグ線（モデル側の赤リグは `rigLineWarpedRigViewPaths`） */
  const rigTemplateToRigViewForGarmentPath =
    (pathIdx: number) =>
    (x: number, y: number): [number, number] => {
      const aligned = rigAlignTemplateToRigViewGarment(x, y);
      if (pathIdx === RIG_LINE_ARM_L && rigArmPivotLGarment) {
        return rotatePointAboutPivotPx(
          aligned[0],
          aligned[1],
          rigArmPivotLGarment[0],
          rigArmPivotLGarment[1],
          rigArmTiltTwistL
        );
      }
      if (pathIdx === RIG_LINE_ARM_R && rigArmPivotRGarment) {
        return rotatePointAboutPivotPx(
          aligned[0],
          aligned[1],
          rigArmPivotRGarment[0],
          rigArmPivotRGarment[1],
          rigArmTiltTwistR
        );
      }
      return aligned;
    };

  const rigLineWarpedRigViewPaths =
    rigLineWarpedRigViewPathsBase.length > RIG_LINE_CLAVICLE_R
      ? applyRigArmAngleTiltToWarpedRigPaths(
          rigLineWarpedRigViewPathsBase,
          height,
          RIG_LINE_ARM_L,
          RIG_LINE_ARM_R
        )
      : rigLineWarpedRigViewPathsBase;

  const rigSkinWarpedForBody =
    rigLinePaths != null && rigLineWarpedRigViewPaths.length === rigLinePaths.length
      ? rigLineWarpedRigViewPaths
      : rigLineWarpedPaths;
  const rigSkinSegments =
    rigLinePaths && rigSkinWarpedForBody.length === rigLinePaths.length
      ? buildRigSkinSegments(rigLinePaths, rigSkinWarpedForBody)
      : null;
  const warpPlain = (x: number, y: number): [number, number] =>
    warp(x, y, yScale, xScale, zones, warpOptsBody);

  const armPeakIdxL = Math.min(BODY_ARM_PEAK_INDEX, Math.max(0, leftArmOutline.length - 1));
  const armPeakIdxR = Math.min(BODY_ARM_PEAK_INDEX, Math.max(0, rightArmOutline.length - 1));

  const bodyFollowFn = (x: number, y: number): [number, number] => {
    if (rigSkinSegments == null) return warpFn(x, y);
    return deformBodyPointToRig(x, y, rigSkinSegments, warpPlain);
  };

  /** 腕山: 体輪郭と同じ `bodyFollowFn`（`warpArmOutline` だけだとリグスキン後のシルエットとズレる） */
  const armPeakLeft = bodyFollowFn(leftArmOutline[armPeakIdxL]![0], leftArmOutline[armPeakIdxL]![1]);
  const armPeakRight = bodyFollowFn(rightArmOutline[armPeakIdxR]![0], rightArmOutline[armPeakIdxR]![1]);

  const bodyPaths = BPATHS_MODEL.map((d) => tPath(d, bodyFollowFn));
  const rigRedLineArmDiagram =
    rigLineWarpedRigViewPaths.length >= RIG_LINE_PATH_COUNT
      ? buildRigRedLineArmDiagram(rigLineWarpedRigViewPaths)
      : rigLineWarpedPaths.length >= RIG_LINE_PATH_COUNT
        ? buildRigRedLineArmDiagram(rigLineWarpedPaths)
        : null;
  const bodyOutlinePoints = bodyPaths.flatMap((d) => getPathPoints(d));

  const bodyShoulderBandYMin = BZ.shoulder - 5;
  const bodyShoulderBandYMax = BZ.shoulder + 15;
  const bodyRaw = shoulderContourFromPath(
    BPATHS_MODEL,
    bodyShoulderBandYMin,
    bodyShoulderBandYMax
  );
  const bodyShoulderContour: [number, number][] = (() => {
    if (bodyRaw.length >= 2) {
      const ys = bodyRaw.map((p) => p[1]);
      const yRange = Math.max(...ys) - Math.min(...ys);
      if (yRange < 3) {
        const [lx, ly] = BODY_ARM_OUTLINE_L[0];
        const rx = BODY_CX * 2 - lx;
        return [bodyFollowFn(lx, ly), bodyFollowFn(rx, ly)];
      }
      return bodyRaw.map(([x, y]) => bodyFollowFn(x, y));
    }
    const [lx, ly] = BODY_ARM_OUTLINE_L[0];
    const rx = BODY_CX * 2 - lx;
    return [bodyFollowFn(lx, ly), bodyFollowFn(rx, ly)];
  })();

  const bodyHeightTop = bodyFollowFn(BODY_CX, BZ.head_top);
  const bodyHeightBottom = bodyFollowFn(BODY_CX, BZ.foot);

  const rigArmAngleDebug = buildRigArmAngleDebug({
    height,
    weight,
    leftArmOutline,
    rightArmOutline,
    leftArmWarped,
    rightArmWarped,
  });
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("DEBUG_RIG_ARM") === "1") {
    console.log("[DEBUG_RIG_ARM]", rigArmAngleDebug);
  }

  let shirtPathD: string | null = null;
  let jacketFill: string | null = null;
  let jacketDetail: string | null = null;
  let customPathDs: string[] = [];
  let customRigPathDs: string[] = [];
  let shoulderDebug: ShoulderDebug | null = null;
  let garmentOverlay: MeasureOverlayData["garment"] = null;
  let rigLandmarksDebug: FittingCanvasRigLandmarksDebug | undefined = undefined;

  const bodyPlotPoints: { label: string; point: [number, number] }[] = [
    { label: "腕山L", point: armPeakLeft },
    { label: "腕山R", point: armPeakRight },
    ...(bodyShoulderContour.length >= 2
      ? [
          { label: "肩L", point: bodyShoulderContour[0] },
          { label: "肩R", point: bodyShoulderContour[bodyShoulderContour.length - 1] },
        ]
      : []),
  ];

  /**
   * 体重が服に効かないようにした経路（要約）:
   * - `garmentBase.buildTopPlacement` / `buildCustomTransformedPaths` / 汎用 `runGenericTopFit` の腕ワープ: `getBodyParams(..., REF_WEIGHT_KG)`。
   * - カスタム SVG の赤リグ・ファブリック整列: `warpRigLine*Garment`・`rigSpineAlignFnGarment`・`rigTemplateToRigViewForGarmentPath`（体側は従来どおり `weight` の `warpRigLine`）。
   * - リグ nudge（服リグなし時）のモデル bbox は `rigLineWarpedPathsGarment`（体重で横に広がらないワープ後リグ）。
   * 身長 h を動かすと服プレースの yScale は変わる。体だけ `bodyFollowFn` で太るため重なりはズレうる。
   */
  if (garment === "jacket") {
    const j = computeJacketGarmentBranch({
      height,
      weight,
      jacketSize,
      bodyShoulderContour,
    });
    jacketFill = j.jacketFill;
    jacketDetail = j.jacketDetail;
    shoulderDebug = j.shoulderDebug;
    garmentOverlay = j.garmentOverlay;
  } else if (garment === "shirt") {
    const s = computeShirtGarmentBranch({
      height,
      weight,
      shirtSize,
      fromSize,
      toSize,
      animProgress,
      bodyShoulderContour,
    });
    shirtPathD = s.shirtPathD;
    shoulderDebug = s.shoulderDebug;
    garmentOverlay = s.garmentOverlay;
  } else if (garment === "custom" && customGarmentData) {
    const cu = computeCustomGarmentBranch({
      height,
      weight,
      customGarmentData,
      rigLinePaths,
      rigLineWarpedPathsGarment,
      warpRigLineRefBodyGarment,
      rigSpineAlignFnGarment,
      rigSpineTranslateOnlyFnGarment,
      rigNeckAnchorTranslateOnlyFnGarment,
      rigAlignTemplateToRigViewGarment,
      rigTemplateToRigViewForGarmentPath,
      fromCustomGarmentData,
      toCustomGarmentData,
      animProgress,
      genericVertexPlotHighlight,
      bodyShoulderContour,
    });
    customPathDs = cu.customPathDs;
    customRigPathDs = cu.customRigPathDs;
    shoulderDebug = cu.shoulderDebug;
    garmentOverlay = cu.garmentOverlay;
    rigLandmarksDebug = cu.rigLandmarksDebug;
  }

  const viewBoxHeight = Math.ceil(bodyHeight(yScale));

  const rigIntersectionPlotPoints: FittingCanvasSnapshot["rigIntersectionPlotPoints"] = [];
  const pushRigAxisClaviclePlots = (
    paths: string[],
    plotKind: "warp" | "rigView",
    prefix: string
  ) => {
    if (paths.length <= RIG_LINE_CLAVICLE_R) return;
    const g = extractRigShoulderAnchorGeometry(paths);
    if (!g) return;
    rigIntersectionPlotPoints.push(
      { label: `${prefix} 軸×左鎖`, point: g.spineClavicleL, plotKind },
      { label: `${prefix} 軸×右鎖`, point: g.spineClavicleR, plotKind },
      { label: `${prefix} 首平均`, point: g.neckAvg, plotKind }
    );
  };
  pushRigAxisClaviclePlots(rigLineWarpedPaths, "warp", "現体型ワープ");
  pushRigAxisClaviclePlots(rigLineWarpedRigViewPaths, "rigView", "赤リグ表示");
  if (rigLinePaths != null && rigLinePaths.length > RIG_LINE_CLAVICLE_R) {
    const gRest = extractRigShoulderAnchorGeometry(rigLinePaths);
    if (gRest) {
      rigIntersectionPlotPoints.push(
        {
          label: "体追従 軸×左鎖",
          point: bodyFollowFn(gRest.spineClavicleL[0], gRest.spineClavicleL[1]),
          plotKind: "bodyFollow",
        },
        {
          label: "体追従 軸×右鎖",
          point: bodyFollowFn(gRest.spineClavicleR[0], gRest.spineClavicleR[1]),
          plotKind: "bodyFollow",
        },
        {
          label: "体追従 首平均",
          point: bodyFollowFn(gRest.neckAvg[0], gRest.neckAvg[1]),
          plotKind: "bodyFollow",
        }
      );
    }
  }

  return {
    bodyPaths,
    rigLineWarpedPaths,
    rigLineWarpedRigViewPaths,
    rigRedLineArmDiagram,
    viewBoxHeight,
    shirtPathD,
    jacketFill,
    jacketDetail,
    customPathDs,
    customRigPathDs,
    shoulderDebug,
    bodyPlotPoints,
    bodyOutlinePoints,
    measureOverlay: {
      bodyHeight: { top: bodyHeightTop, bottom: bodyHeightBottom },
      garment: garmentOverlay,
    },
    rigArmAngleDebug,
    rigIntersectionPlotPoints,
    ...(rigLandmarksDebug !== undefined ? { rigLandmarksDebug } : {}),
  };
}
