import {
  warp,
  warpArmOutline,
  getInterpolatedArmOutline,
  bodyHeight,
  getZonesAnchored,
  getBodyParams,
  getDeltaThetas,
  getSkinnedVertex,
  blendDeformedWithIndentWarpRelief,
  buildIndentWaistPolylines,
  getAnchorYOffset,
} from "@/app/(main)/development/fitting/lib/bodyUtils";
import { tPath, getPathPoints, pointAtGlobalVertexIndex } from "@/app/(main)/development/fitting/lib/pathUtils";
import {
  getBodyIndentWaistDebugVertexIndices,
  getBodyIndentWaistGlobalIndices,
  getBodyTemplatePaths,
  getRigArmTiltHeightCm,
  getBodyRigLinePathsTemplate,
} from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import {
  BZ,
  BODY_CX,
  BODY_ARM_OUTLINE_L,
  BODY_ARM_PEAK_INDEX,
  REF_HEIGHT_CM,
  REF_WEIGHT_KG,
} from "@/app/(main)/development/fitting/lib/constants";
import { buildRigSkinSegments, deformBodyPointToRig } from "@/app/(main)/development/fitting/lib/rigSkin2D";
import { shoulderContourFromPath } from "@/app/(main)/development/fitting/lib/fittingContourUtils";
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
  rotatePointAboutPivotPx,
  buildRigRedLineArmDiagram,
} from "./fittingCanvasRigAlign";
import { buildRigArmAngleDebug } from "./fittingCanvasRigArmDebug";
import type {
  FittingCanvasRigLandmarksDebug,
  FittingCanvasSnapshot,
  UseFittingCanvasDataParams,
} from "./fittingCanvasComputeTypes";
import type { MeasureOverlayData, ShoulderDebug } from "@/app/(main)/development/fitting/lib/types";
import { computeJacketGarmentBranch } from "./fittingCanvasComputeGarmentJacket";
import { computeShirtGarmentBranch } from "./fittingCanvasComputeGarmentShirt";
import { computeCustomGarmentBranch } from "./fittingCanvasComputeGarmentCustom";
import { isDebugFittingBodyVerticesEnabled } from "./fittingCanvasDebugFlags";

export type {
  UseFittingCanvasDataParams,
  FittingCanvasSnapshot,
  FittingCanvasRigLandmarksDebug,
  FittingCanvasRigArmAngleDebug,
  RigRedLineArmDiagram,
} from "./fittingCanvasComputeTypes";

export { buildRigRedLineArmDiagram } from "./fittingCanvasRigAlign";
export { computeRigArmAngleDebug } from "./fittingCanvasRigArmDebug";

/** 線画検証: `warp` の腕帯・胴ラテラルはベクタの細曲線（裾の指先級）を頂点ごとにねじるので、胴中心基点の線形スケールのみ */
function lineArtLinearWarpFromScales(yS: number, xS: number) {
  return (x: number, y: number): [number, number] => {
    const yOff = getAnchorYOffset(yS);
    const newYRaw = y <= BZ.head_bot ? y : BZ.head_bot + (y - BZ.head_bot) * yS;
    const newY = newYRaw <= BZ.head_bot ? newYRaw : newYRaw + yOff;
    return [BODY_CX + (x - BODY_CX) * xS, newY];
  };
}

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
    bodyModelVariant: bodyVariantParam,
    rigLinePaths: rigLinePathsParam,
  }: UseFittingCanvasDataParams & { rigLinePaths: string[] | null }
): FittingCanvasSnapshot {
  const gradingV4UsesGridSvgBody =
    garment === "custom" && customGarmentData?.presetId === "gradingV4";
  const bodyModelVariant = gradingV4UsesGridSvgBody ? "gridSvgBody" : bodyVariantParam;
  const rigLinePaths = gradingV4UsesGridSvgBody
    ? getBodyRigLinePathsTemplate("gridSvgBody")
    : rigLinePathsParam;
  const bodyPathsTemplate = getBodyTemplatePaths(bodyModelVariant);
  /** 線画検証・格子 Grading ボディ: `mv_model` 系リグスキンと相性が悪いので線形スケールワープに寄せる */
  const useLineArtLikeWarp =
    bodyModelVariant === "lineArtVerification" || bodyModelVariant === "gridSvgBody";
  const indentWaistIdx = getBodyIndentWaistGlobalIndices(bodyModelVariant);
  const verificationIndentPolylines =
    bodyModelVariant === "lineArtVerification"
      ? buildIndentWaistPolylines(bodyPathsTemplate, indentWaistIdx.left, indentWaistIdx.right)
      : undefined;
  const warpOptsBody = {
    heightCm: height,
    applyArmpitBaseRigRelief: true,
    ...(verificationIndentPolylines ? { indentWaistPolylines: verificationIndentPolylines } : {}),
  } as const;
  const heightForRigArmTilt = getRigArmTiltHeightCm(bodyModelVariant, height);

  const { yScale, xScale } = getBodyParams(height, weight, rigLinePaths);
  const lineArtLinearWarp = lineArtLinearWarpFromScales(yScale, xScale);
  const zones = getZonesAnchored(yScale);
  const { left: leftArmOutline, right: rightArmOutline } = getInterpolatedArmOutline(height);
  const leftArmWarped = warpArmOutline(leftArmOutline, true, yScale, xScale, zones, height);
  const rightArmWarped = warpArmOutline(rightArmOutline, false, yScale, xScale, zones, height);
  const leftShoulder = leftArmWarped[0];
  const rightShoulder = rightArmWarped[0];
  const deltaThetas = getDeltaThetas(height, weight);
  const SKIN_MAX_DIST = 150;
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

  /** 計算用の現在ワープリグは `rigLineWarpedPaths`。体輪郭は線画検証・格子 Grading 時は線形スケール、それ以外は `warp`。 */
  const warpRigLine = (x: number, y: number): [number, number] =>
    useLineArtLikeWarp ? lineArtLinearWarp(x, y) : warp(x, y, yScale, xScale, zones, warpOptsBody);

  // 身長 yScale は脊髄スパン連動済み。表示リグ（基準リグ＋脊髄合わせ・頭はスケール弱）と体輪郭追従を同じワープ後パスに揃える。
  const rigLineWarpedPaths = rigLinePaths ? rigLinePaths.map((d) => tPath(d, warpRigLine)) : [];
  // 基準身長 170 のまま、横幅だけ現在体重に合わせる。脊髄合わせで身長差を解消（体・画面上のモデル赤リグ用）。
  const { yScale: refRigYs, xScale: refRigXs } = getBodyParams(
    REF_HEIGHT_CM,
    weight,
    rigLinePaths
  );
  const lineArtRefLinearWarp = lineArtLinearWarpFromScales(refRigYs, refRigXs);
  const refRigZones = getZonesAnchored(refRigYs);
  const warpOptsRefBody = { heightCm: REF_HEIGHT_CM, applyArmpitBaseRigRelief: true } as const;
  const warpRigLineRefBody = (x: number, y: number): [number, number] =>
    useLineArtLikeWarp ? lineArtRefLinearWarp(x, y) : warp(x, y, refRigYs, refRigXs, refRigZones, warpOptsRefBody);
  const rigRefWarpedPaths = rigLinePaths
    ? rigLinePaths.map((d) => tPath(d, warpRigLineRefBody))
    : [];

  /** 服 SVG・服に載せる赤リグ: 横 xScale を体重で変えない（身長＋リグ y のみ体に追う） */
  const { yScale: ysGarment, xScale: xsGarment } = getBodyParams(height, REF_WEIGHT_KG, rigLinePaths);
  const zonesGarment = getZonesAnchored(ysGarment);
  const warpOptsGarment = { heightCm: height, applyArmpitBaseRigRelief: false } as const;
  const lineArtGarmentLinearWarp = lineArtLinearWarpFromScales(ysGarment, xsGarment);
  const warpRigLineGarment = (x: number, y: number): [number, number] =>
    useLineArtLikeWarp
      ? lineArtGarmentLinearWarp(x, y)
      : warp(x, y, ysGarment, xsGarment, zonesGarment, warpOptsGarment);
  const rigLineWarpedPathsGarment = rigLinePaths ? rigLinePaths.map((d) => tPath(d, warpRigLineGarment)) : [];
  const { yScale: refRigYsG, xScale: refRigXsG } = getBodyParams(
    REF_HEIGHT_CM,
    REF_WEIGHT_KG,
    rigLinePaths
  );
  const lineArtRefGarmentLinearWarp = lineArtLinearWarpFromScales(refRigYsG, refRigXsG);
  const refRigZonesG = getZonesAnchored(refRigYsG);
  const warpOptsRefGarment = { heightCm: REF_HEIGHT_CM, applyArmpitBaseRigRelief: false } as const;
  const warpRigLineRefBodyGarment = (x: number, y: number): [number, number] =>
    useLineArtLikeWarp
      ? lineArtRefGarmentLinearWarp(x, y)
      : warp(x, y, refRigYsG, refRigXsG, refRigZonesG, warpOptsRefGarment);
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

  const rigArmTiltTwistL =
    (-(heightForRigArmTilt - REF_HEIGHT_CM) * (RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM * Math.PI)) / 180;
  const rigArmTiltTwistR =
    ((heightForRigArmTilt - REF_HEIGHT_CM) * (RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM * Math.PI)) / 180;

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
          heightForRigArmTilt,
          RIG_LINE_ARM_L,
          RIG_LINE_ARM_R
        )
      : rigLineWarpedRigViewPathsBase;

  const rigSkinWarpedForBody =
    rigLinePaths != null && rigLineWarpedRigViewPaths.length === rigLinePaths.length
      ? rigLineWarpedRigViewPaths
      : rigLineWarpedPaths;
  /** 線画系は `mv_model` と同じ休止リグ相対にならない。リグスキンは横に細く見えやすいためオフ */
  const rigSkinSegments =
    useLineArtLikeWarp
      ? null
      : rigLinePaths && rigSkinWarpedForBody.length === rigLinePaths.length
        ? buildRigSkinSegments(rigLinePaths, rigSkinWarpedForBody)
        : null;
  const warpPlain = (x: number, y: number): [number, number] =>
    useLineArtLikeWarp ? lineArtLinearWarp(x, y) : warp(x, y, yScale, xScale, zones, warpOptsBody);

  const armPeakIdxL = Math.min(BODY_ARM_PEAK_INDEX, Math.max(0, leftArmOutline.length - 1));
  const armPeakIdxR = Math.min(BODY_ARM_PEAK_INDEX, Math.max(0, rightArmOutline.length - 1));

  const bodyFollowFn = (x: number, y: number): [number, number] => {
    if (useLineArtLikeWarp) {
      return lineArtLinearWarp(x, y);
    }
    if (rigSkinSegments == null) return warpFn(x, y);
    const warpedOnly = warpPlain(x, y);
    const deformed = deformBodyPointToRig(x, y, rigSkinSegments, warpPlain);
    return blendDeformedWithIndentWarpRelief(x, y, warpedOnly, deformed, true, verificationIndentPolylines);
  };

  /** 腕山: 体輪郭と同じ `bodyFollowFn`（`warpArmOutline` だけだとリグスキン後のシルエットとズレる） */
  const armPeakLeft = bodyFollowFn(leftArmOutline[armPeakIdxL]![0], leftArmOutline[armPeakIdxL]![1]);
  const armPeakRight = bodyFollowFn(rightArmOutline[armPeakIdxR]![0], rightArmOutline[armPeakIdxR]![1]);

  const bodyPaths = bodyPathsTemplate.map((d) => tPath(d, bodyFollowFn));
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
    bodyPathsTemplate,
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
  let customPathStrokeDasharrays: (string | undefined)[] = [];
  let customPathStrokeWidths: (number | undefined)[] = [];
  let customPathStrokes: (string | undefined)[] = [];
  let customPathFills: (string | undefined)[] = [];
  let customRigPathDs: string[] = [];
  let gradingV4BehindBodyPathCount = 0;
  let shoulderDebug: ShoulderDebug | null = null;
  let garmentOverlay: MeasureOverlayData["garment"] = null;
  let rigLandmarksDebug: FittingCanvasRigLandmarksDebug | undefined = undefined;

  const bodyPlotPoints: { label: string; point: [number, number] }[] = [
    { label: "腕山L", point: armPeakLeft },
    { label: "腕山R", point: armPeakRight },
  ];

  /**
   * 体重が服に効かないようにした経路（要約）:
   * - `buildTopPlacement` の place X は体重を掛けない（胴・脇・腰の横幅はボディ `warp` のみ）。
   * - `buildCustomTransformedPaths` / カスタム服の腕ワープ: `getBodyParams(h, w)`（袖は体の腕に合わせる）。
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
  } else if (
    garment === "custom" &&
    customGarmentData &&
    rigLinePaths != null &&
    rigLinePaths.length > 0
  ) {
    const cu = computeCustomGarmentBranch({
      height,
      weight,
      customGarmentData,
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
    });
    customPathDs = cu.customPathDs;
    customPathStrokeDasharrays = cu.customPathStrokeDasharrays;
    customPathStrokeWidths = cu.customPathStrokeWidths;
    customPathStrokes = cu.customPathStrokes;
    customPathFills = cu.customPathFills;
    customRigPathDs = cu.customRigPathDs;
    gradingV4BehindBodyPathCount = cu.gradingV4BehindBodyPathCount;
    shoulderDebug = cu.shoulderDebug;
    garmentOverlay = cu.garmentOverlay;
    rigLandmarksDebug = cu.rigLandmarksDebug;
  }

  const baseViewBoxH = Math.ceil(bodyHeight(yScale));
  let viewBoxHeight = baseViewBoxH;
  /** 線画系はワープ後の足先がテンプレ基準をわずかに超えうる。はみ出しで「縮小表示」に見えないよう底を広げる */
  if (useLineArtLikeWarp && bodyPaths.length > 0) {
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
   */
  const expandViewBoxX =
    bodyModelVariant === "lineArtVerification" ||
    (garment === "custom" && bodyPaths.length > 0);
  if (expandViewBoxX) {
    const pad = 32;
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
    if (rigDraw.length > 0) scanXs(rigDraw);
    if (garment === "custom") {
      if (customPathDs.length > 0) scanXs(customPathDs);
      if (customRigPathDs.length > 0) scanXs(customRigPathDs);
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

  const bodyVertexDebugEntries: FittingCanvasSnapshot["bodyVertexDebugEntries"] =
    isDebugFittingBodyVerticesEnabled()
      ? (() => {
          const out: { globalIndex: number; template: [number, number] }[] = [];
          for (const gi of getBodyIndentWaistDebugVertexIndices(bodyModelVariant)) {
            const tpl = pointAtGlobalVertexIndex(bodyPathsTemplate, gi);
            const warped = pointAtGlobalVertexIndex(bodyPaths, gi);
            if (tpl == null || warped == null) continue;
            out.push({ globalIndex: gi, template: tpl });
            console.log("[DEBUG_FITTING_BODY_VERTICES]", {
              globalIndex: gi,
              template: tpl,
              warped,
              deltaWarp: [warped[0] - tpl[0], warped[1] - tpl[1]],
            });
          }
          return out.length > 0 ? out : null;
        })()
      : null;

  return {
    bodyPaths,
    rigLineWarpedPaths,
    rigLineWarpedRigViewPaths,
    rigRedLineArmDiagram,
    indentWaistReferenceChordGlobalIndices: indentWaistIdx.referenceChord,
    viewBoxMinX,
    viewBoxWidth,
    viewBoxHeight,
    shirtPathD,
    jacketFill,
    jacketDetail,
    customPathDs,
    customPathStrokeDasharrays,
    customPathStrokeWidths,
    customPathStrokes,
    customPathFills,
    customRigPathDs,
    gradingV4BehindBodyPathCount,
    shoulderDebug,
    bodyPlotPoints,
    bodyOutlinePoints,
    measureOverlay: {
      bodyHeight: { top: bodyHeightTop, bottom: bodyHeightBottom },
      garment: garmentOverlay,
    },
    rigArmAngleDebug,
    bodyVertexDebugEntries,
    ...(rigLandmarksDebug !== undefined ? { rigLandmarksDebug } : {}),
  };
}
