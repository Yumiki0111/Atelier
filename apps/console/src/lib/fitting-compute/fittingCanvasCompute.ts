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
  getAnchorYOffset,
} from "@/app/(main)/development/fitting/lib/bodyUtils";
import { tPath, getPathPoints, pointAtGlobalVertexIndex } from "@/app/(main)/development/fitting/lib/pathUtils";
import {
  getBodyIndentWaistDebugVertexIndices,
  getBodyIndentWaistGlobalIndices,
  getBodyTemplatePaths,
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
import { buildRigSkinSegments, deformBodyPointToRig } from "@/app/(main)/development/fitting/lib/rig/rigSkin2D";
import { shoulderContourFromPath } from "@/app/(main)/development/fitting/lib/fittingContourUtils";
import {
  RIG_LINE_ARM_L,
  RIG_LINE_ARM_R,
  RIG_LINE_CLAVICLE_L,
  RIG_LINE_CLAVICLE_R,
  RIG_LINE_PATH_COUNT,
  computeRigSpineAlignFn,
  computeRigSpineTranslateOnlyFn,
  computeRigNeckAnchorTranslateOnlyFn,
  alignRigRefPathsToCurrentSpine,
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
import { isGarmentFlatCmPresetId } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";

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

/** 格子ボディ: 頭〜腕山より下〜脚より上の胴（テンプレ Y）。体重横スケールはマスク込みでここ＋中央寄り X のみへブレンド */
function gridTorsoTemplateYLateralWeightBlend(y: number): number {
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
const GRID_TORSO_LATERAL_MASK_X_HALF_CORE_FRAC_OF_CX = 0.3;
const GRID_TORSO_LATERAL_MASK_X_FADE_FRAC_OF_CX = 0.12;

function gridTorsoTemplateLateralWeightMaskXY(x: number, y: number): number {
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
function lineArtLinearWarpFromScalesWithTorsoWeight(
  yS: number,
  xSBase: number,
  lateralRatio: number,
  torsoMaskXY: (templateX: number, templateY: number) => number
) {
  return (x: number, y: number): [number, number] => {
    const yOff = getAnchorYOffset(yS);
    const newYRaw = y <= BZ.head_bot ? y : BZ.head_bot + (y - BZ.head_bot) * yS;
    const newY = newYRaw <= BZ.head_bot ? newYRaw : newYRaw + yOff;
    const b = torsoMaskXY(x, y);
    const xS =
      b <= 0 || Math.abs(lateralRatio - 1) < 1e-9
        ? xSBase
        : xSBase * (1 + (lateralRatio - 1) * b);
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
    respectRequestedBodyModelVariant = false,
  }: UseFittingCanvasDataParams & { rigLinePaths: string[] | null }
): FittingCanvasSnapshot {
  const garmentFlatCmUsesGridSvgBody =
    garment === "custom" &&
    isGarmentFlatCmPresetId(customGarmentData?.presetId) &&
    !respectRequestedBodyModelVariant;
  const bodyModelVariant = garmentFlatCmUsesGridSvgBody
    ? bodyVariantParam === "gridSvgBodyBack"
      ? "gridSvgBodyBack"
      : "gridSvgBody"
    : bodyVariantParam;
  const rigLinePaths = garmentFlatCmUsesGridSvgBody
    ? getBodyRigLinePathsTemplate(bodyModelVariant)
    : rigLinePathsParam;
  const bodyPathsTemplate = getBodyTemplatePaths(bodyModelVariant);
  /**
   * 格子前面／背面（391×518 系 SVG テンプレ）は model+rig 向け warp()+リグスキンと相性が悪いため線形スケール系へ寄せる。
   */
  const useLinearBodyWarpForSvgTemplates =
    bodyModelVariant === "gridSvgBody" || bodyModelVariant === "gridSvgBodyBack";
  /** 格子: テンプレ Y で脊髄合わせの X を切ると閾値をまたぐ path（袖〜脚の長線）がギザる。身長 150/195 の極端でも一貫させるため、足元 (BZ.foot) まで ref 線形の X を維持（Y のみ脊髄スケール）。 */
  const GRID_SILHOUETTE_PRESERVE_SPINE_ALIGN_REF_X_Y_MAX = BZ.foot;
  const indentWaistIdx = getBodyIndentWaistGlobalIndices(bodyModelVariant);
  const warpOptsBody = {
    heightCm: height,
    applyArmpitBaseRigRelief: true,
  } as const;
  const { yScale, xScale } = getBodyParams(height, weight, rigLinePaths);
  /**
   * 格子 SVG: 服・モデル赤リグは横を REF 体重固定。全域で体重 xScale を掛けると服と破綻するので、
   * 線形ワープの基底横は REF に揃え、胴テンプレ Y 帯だけ `sqrt(w/REF)` 比率を横スケールへ混ぜる。
   */
  const xScaleGridRigMatchGarment = useLinearBodyWarpForSvgTemplates
    ? getBodyParams(height, REF_WEIGHT_KG, rigLinePaths).xScale
    : xScale;
  const gridTorsoLateralRatio =
    useLinearBodyWarpForSvgTemplates
      ? xScale / Math.max(xScaleGridRigMatchGarment, 1e-9)
      : 1;
  const lineArtLinearWarpUniform = lineArtLinearWarpFromScales(yScale, xScaleGridRigMatchGarment);
  const lineArtLinearWarpTorso = useLinearBodyWarpForSvgTemplates
    ? lineArtLinearWarpFromScalesWithTorsoWeight(
        yScale,
        xScaleGridRigMatchGarment,
        gridTorsoLateralRatio,
        gridTorsoTemplateLateralWeightMaskXY
      )
    : lineArtLinearWarpUniform;
  const zones = getZonesAnchored(yScale);
  const { left: leftArmOutline, right: rightArmOutline } = getInterpolatedArmOutline(height);

  const gridRigLineUsesTorsoWeightLateral = (rigPathIdx: number): boolean =>
    rigPathIdx !== RIG_LINE_ARM_L &&
    rigPathIdx !== RIG_LINE_ARM_R &&
    rigPathIdx !== RIG_LINE_CLAVICLE_L &&
    rigPathIdx !== RIG_LINE_CLAVICLE_R;

  /** 計算用の現在ワープリグは `rigLineWarpedPaths`。391×518 系ボディ時は線形スケール、それ以外は `warp`。腕・鎖骨リグは体重胴横を掛けない。 */
  const warpRigLineAtIdx = (pathIdx: number, x: number, y: number): [number, number] =>
    useLinearBodyWarpForSvgTemplates
      ? gridRigLineUsesTorsoWeightLateral(pathIdx)
        ? lineArtLinearWarpTorso(x, y)
        : lineArtLinearWarpUniform(x, y)
      : warp(x, y, yScale, xScale, zones, warpOptsBody);

  // 身長 yScale は脊髄スパン連動済み。表示リグ（基準リグ＋脊髄合わせ・頭はスケール弱）と体輪郭追従を同じワープ後パスに揃える。
  const rigLineWarpedPaths = rigLinePaths
    ? rigLinePaths.map((d, i) => tPath(d, (x, y) => warpRigLineAtIdx(i, x, y)))
    : [];
  // 基準身長 170。格子は横を REF 体重に固定（服パイプラインと一致）。それ以外は従来どおり体重で横スケール。
  const { yScale: refRigYs, xScale: refRigXs } = getBodyParams(
    REF_HEIGHT_CM,
    useLinearBodyWarpForSvgTemplates ? REF_WEIGHT_KG : weight,
    rigLinePaths
  );
  const lineArtRefLinearWarpUniform = lineArtLinearWarpFromScales(refRigYs, refRigXs);
  const lineArtRefLinearWarpTorso = useLinearBodyWarpForSvgTemplates
    ? lineArtLinearWarpFromScalesWithTorsoWeight(
        refRigYs,
        refRigXs,
        gridTorsoLateralRatio,
        gridTorsoTemplateLateralWeightMaskXY
      )
    : lineArtRefLinearWarpUniform;
  const refRigZones = getZonesAnchored(refRigYs);
  const warpOptsRefBody = { heightCm: REF_HEIGHT_CM, applyArmpitBaseRigRelief: true } as const;
  const warpRigLineRefBodyAtIdx = (pathIdx: number, x: number, y: number): [number, number] =>
    useLinearBodyWarpForSvgTemplates
      ? gridRigLineUsesTorsoWeightLateral(pathIdx)
        ? lineArtRefLinearWarpTorso(x, y)
        : lineArtRefLinearWarpUniform(x, y)
      : warp(x, y, refRigYs, refRigXs, refRigZones, warpOptsRefBody);
  const rigRefWarpedPaths = rigLinePaths
    ? rigLinePaths.map((d, i) => tPath(d, (x, y) => warpRigLineRefBodyAtIdx(i, x, y)))
    : [];

  /** 基準リグ→現在リグの脊髄合わせ（頭付近は弱スケール）。391×518 格子ボディは輪郭もこれを通すと赤リグ・服リグと Y 伸縮が一致する */
  const rigSpineAlignFnBody = computeRigSpineAlignFn(rigRefWarpedPaths, rigLineWarpedPaths);
  const rigLineWarpedRigViewPathsBase =
    rigRefWarpedPaths.length > 0 &&
    rigLineWarpedPaths.length > 0 &&
    rigSpineAlignFnBody != null
      ? useLinearBodyWarpForSvgTemplates && rigLinePaths != null
        ? rigLinePaths.map((d, pathIdx) =>
            tPath(d, (tx, ty) => {
              const refW = warpRigLineRefBodyAtIdx(pathIdx, tx, ty);
              const aligned = rigSpineAlignFnBody(refW[0], refW[1]);
              if (ty <= GRID_SILHOUETTE_PRESERVE_SPINE_ALIGN_REF_X_Y_MAX) {
                return [refW[0], aligned[1]] as const;
              }
              return aligned;
            })
          )
        : rigRefWarpedPaths.map((d) => tPath(d, rigSpineAlignFnBody))
      : rigRefWarpedPaths;

  /** 服 SVG・服に載せる赤リグ: 横 xScale を体重で変えない（身長＋リグ y のみ体に追う） */
  const { yScale: ysGarment, xScale: xsGarment } = getBodyParams(height, REF_WEIGHT_KG, rigLinePaths);
  const zonesGarment = getZonesAnchored(ysGarment);
  const warpOptsGarment = { heightCm: height, applyArmpitBaseRigRelief: false } as const;
  const lineArtGarmentLinearWarp = lineArtLinearWarpFromScales(ysGarment, xsGarment);
  const warpRigLineGarment = (x: number, y: number): [number, number] =>
    useLinearBodyWarpForSvgTemplates
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
    useLinearBodyWarpForSvgTemplates
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
    if (!rigSpineAlignFnGarment) return refW;
    const aligned = rigSpineAlignFnGarment(refW[0], refW[1]);
    if (useLinearBodyWarpForSvgTemplates && y <= GRID_SILHOUETTE_PRESERVE_SPINE_ALIGN_REF_X_Y_MAX) {
      return [refW[0], aligned[1]];
    }
    return aligned;
  };

  /**
   * テンプレート座標を、画面上のモデル赤リグ（`rigLineWarpedRigViewPaths`）と同じパイプラインへ写す。
   * 服リグは `bodyFollowFn`（肌用ブレンド）だと赤線とずれるためこちらを使う。
   * `silhouettePathIdx`: `null` は輪郭外の補助点（腕山など）→ 体重胴横は掛けない。
   */
  const warpGridSilhouetteRefLinearAtIdx = (
    silhouettePathIdx: number | null,
    x: number,
    y: number
  ): [number, number] => {
    const useUnifiedGridIllustratedLinear =
      silhouettePathIdx !== null &&
      (bodyModelVariant === "gridSvgBody" || bodyModelVariant === "gridSvgBodyBack");
    /**
     * 格子イラストは部位ごとに path 分割され、縁は同一座標の二重線。
     * path インデックスで Torso／Uniform を切り替えると、異なる (x,y)→座標変換になり身長ワープで継ぎ目がずれる。
     * `lineArtRefLinearWarpTorso` は Y の `torsoBlend` で横スケールを変えるだけなので、腕・頭付近（blend≈0）では均一横と実質一致する。
     */
    return useUnifiedGridIllustratedLinear
      ? lineArtRefLinearWarpTorso(x, y)
      : lineArtRefLinearWarpUniform(x, y);
  };

  const rigAlignTemplateToRigViewBody = (
    silhouettePathIdx: number | null,
    x: number,
    y: number
  ): [number, number] => {
    const refW = warpGridSilhouetteRefLinearAtIdx(silhouettePathIdx, x, y);
    if (!rigSpineAlignFnBody) return refW;
    const aligned = rigSpineAlignFnBody(refW[0], refW[1]);
    if (y <= GRID_SILHOUETTE_PRESERVE_SPINE_ALIGN_REF_X_Y_MAX) {
      return [refW[0], aligned[1]];
    }
    return aligned;
  };

  /** カスタム服の赤リグ線（モデル側の赤リグは `rigLineWarpedRigViewPaths`） */
  const rigTemplateToRigViewForGarmentPath =
    (_pathIdx: number) =>
    (x: number, y: number): [number, number] =>
      rigAlignTemplateToRigViewGarment(x, y);

  const rigLineWarpedRigViewPaths = rigLineWarpedRigViewPathsBase;

  const xScaleForArms = useLinearBodyWarpForSvgTemplates ? xScaleGridRigMatchGarment : xScale;
  const leftArmWarped = warpArmOutline(leftArmOutline, true, yScale, xScaleForArms, zones, height);
  const rightArmWarped = warpArmOutline(rightArmOutline, false, yScale, xScaleForArms, zones, height);
  const leftShoulder = leftArmWarped[0]!;
  const rightShoulder = rightArmWarped[0]!;
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

  const rigSkinWarpedForBody =
    rigLinePaths != null && rigLineWarpedRigViewPaths.length === rigLinePaths.length
      ? rigLineWarpedRigViewPaths
      : rigLineWarpedPaths;
  /** 391×518 系ボディは前面テンプレの休止リグ相対とは一致しない。リグスキンは横に細く見えやすいためオフ */
  const rigSkinSegments =
    useLinearBodyWarpForSvgTemplates
      ? null
      : rigLinePaths && rigSkinWarpedForBody.length === rigLinePaths.length
        ? buildRigSkinSegments(rigLinePaths, rigSkinWarpedForBody)
        : null;
  const warpPlain = (x: number, y: number): [number, number] =>
    useLinearBodyWarpForSvgTemplates ? lineArtLinearWarpUniform(x, y) : warp(x, y, yScale, xScale, zones, warpOptsBody);

  const armPeakIdxL = Math.min(BODY_ARM_PEAK_INDEX, Math.max(0, leftArmOutline.length - 1));
  const armPeakIdxR = Math.min(BODY_ARM_PEAK_INDEX, Math.max(0, rightArmOutline.length - 1));

  const bodyFollowFnNonGrid = (x: number, y: number): [number, number] => {
    if (rigSkinSegments == null) return warpFn(x, y);
    const warpedOnly = warpPlain(x, y);
    const deformed = deformBodyPointToRig(x, y, rigSkinSegments, warpPlain);
    return blendDeformedWithIndentWarpRelief(x, y, warpedOnly, deformed, true);
  };

  /** `silhouettePathIdx === null`: 輪郭パスに属さない点（腕山・肩ばんで復元した点など）→ 体重胴横なし */
  const bodyFollowFnForSilhouettePath =
    (silhouettePathIdx: number | null) =>
    (x: number, y: number): [number, number] =>
      useLinearBodyWarpForSvgTemplates
        ? rigAlignTemplateToRigViewBody(silhouettePathIdx, x, y)
        : bodyFollowFnNonGrid(x, y);

  const bodyFollowFn = (x: number, y: number): [number, number] =>
    bodyFollowFnForSilhouettePath(null)(x, y);

  /** 腕山: 輪郭パスと別系統のため体重胴横は掛けない（null） */
  const armPeakLeft = bodyFollowFnForSilhouettePath(null)(
    leftArmOutline[armPeakIdxL]![0],
    leftArmOutline[armPeakIdxL]![1]
  );
  const armPeakRight = bodyFollowFnForSilhouettePath(null)(
    rightArmOutline[armPeakIdxR]![0],
    rightArmOutline[armPeakIdxR]![1]
  );

  const bodyPaths = bodyPathsTemplate.map((d, idx) =>
    tPath(d, bodyFollowFnForSilhouettePath(idx))
  );
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
        return [
          bodyFollowFnForSilhouettePath(null)(lx, ly),
          bodyFollowFnForSilhouettePath(null)(rx, ly),
        ];
      }
      return bodyRaw.map(([x, y]) => bodyFollowFnForSilhouettePath(null)(x, y));
    }
    const [lx, ly] = BODY_ARM_OUTLINE_L[0];
    const rx = BODY_CX * 2 - lx;
    return [bodyFollowFnForSilhouettePath(null)(lx, ly), bodyFollowFnForSilhouettePath(null)(rx, ly)];
  })();

  const bodyHeightTop = bodyFollowFnForSilhouettePath(null)(BODY_CX, BZ.head_top);
  const bodyHeightBottom = bodyFollowFnForSilhouettePath(null)(BODY_CX, BZ.foot);

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
  let behindBodyPathCount = 0;
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
   * - カスタム SVG の赤リグ・ファブリック整列: `warpRigLine*Garment`・`rigSpineAlignFnGarment`・`rigTemplateToRigViewForGarmentPath`。
   * - 格子ボディ: 線形ワープの基底横は REF（服と一致）。体重横は **`(x,y)` マスクされた胴帯のみ**（リグの腕線はインデックスで Uniform を維持することもあり）。
   * - リグ nudge（服リグなし時）のモデル bbox は `rigLineWarpedPathsGarment`（体重で横に広がらないワープ後リグ）。
   * 身長 h を動かすと服プレースの yScale は変わる。
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
    behindBodyPathCount = cu.behindBodyPathCount;
    shoulderDebug = cu.shoulderDebug;
    garmentOverlay = cu.garmentOverlay;
    rigLandmarksDebug = cu.rigLandmarksDebug;
  }

  const baseViewBoxH = Math.ceil(bodyHeight(yScale));
  let viewBoxHeight = baseViewBoxH;
  /** 格子ボディ: ワープ後の足先がテンプレ基準をわずかに超えうる。はみ出しで「縮小表示」に見えないよう底を広げる */
  if (useLinearBodyWarpForSvgTemplates && bodyPaths.length > 0) {
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
  /** ログ検証: 身長変化で rig bbox が body より最大 ~107px 内外側にはみ出す → 余裕を見て両側に確保 */
  const GRID_CUSTOM_VIEWBOX_RIG_MARGIN_X = 128;
  if (expandViewBoxX) {
    const skipLiveRigInViewBoxX =
      useLinearBodyWarpForSvgTemplates && garment === "custom";
    let pad = skipLiveRigInViewBoxX ? 32 + GRID_CUSTOM_VIEWBOX_RIG_MARGIN_X : 32;
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
    behindBodyPathCount,
    shoulderDebug,
    bodyPlotPoints,
    bodyOutlinePoints,
    measureOverlay: {
      bodyHeight: { top: bodyHeightTop, bottom: bodyHeightBottom },
      garment: garmentOverlay,
    },
    rigArmAngleDebug,
    bodyVertexDebugEntries,
    bodyModelVariant,
    ...(rigLandmarksDebug !== undefined ? { rigLandmarksDebug } : {}),
  };
}
