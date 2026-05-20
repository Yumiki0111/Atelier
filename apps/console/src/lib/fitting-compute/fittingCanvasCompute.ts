import {
  warp,
  warpArmOutline,
  getInterpolatedArmOutline,
  getZonesAnchored,
  getBodyParams,
  getDeltaThetas,
  getSkinnedVertex,
  blendDeformedWithIndentWarpRelief,
  type TemplatePointWarpFn,
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
  buildRigRedLineArmDiagram,
  applyRigArmAngleTiltToWarpedRigPaths,
  rigArmTwistRadFromHeightCm,
  rigPathUsesIndependentLimbWarp,
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
import { GRID_RIG_OVERLAY_OMIT_INDICES } from "@/app/(main)/development/fitting/lib/rig/gridSvgRigData";
import {
  gridTorsoTemplateLateralWeightMaskXY,
  lineArtLinearWarpFromScales,
  lineArtLinearWarpFromScalesWithTorsoWeight,
} from "./fittingCanvasGridLinearWarp";
import { computeFittingCanvasSnapshotViewBox } from "./fittingCanvasComputeViewBox";

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
    bodyModelVariant: bodyVariantParam,
    rigLinePaths: rigLinePathsParam,
    respectRequestedBodyModelVariant = false,
    debugFlatCmGridBodyLiveHeightWarp,
  }: UseFittingCanvasDataParams & { rigLinePaths: string[] | null }
): FittingCanvasSnapshot {
  const flatCmGarmentPreset =
    garment === "custom" && isGarmentFlatCmPresetId(customGarmentData?.presetId);
  /** 呼び出しが `gridSvgBody|Back` のときは、`respectRequestedBodyModelVariant` でも格子リグ模板を使う（開発ツールが true を渡すため `garmentFlatCmUsesGridSvgBody` が誤って false にならないようにする） */
  const requestedBodyVariantIsGridSvg =
    bodyVariantParam === "gridSvgBody" || bodyVariantParam === "gridSvgBodyBack";
  const garmentFlatCmUsesGridSvgBody =
    flatCmGarmentPreset &&
    (!respectRequestedBodyModelVariant || requestedBodyVariantIsGridSvg);
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
  /**
   * 平置き cm: 服は REF 身長ワープのまま、**モデル輪郭・赤リグだけ**現在身長の線形ワープにする。
   * （全身を REF 固定にすると身長スライダーが図形に効かない。服の幾何は `warpRigLineRefBodyGarment` で据え置き。）
   */
  const flatCmGridBodyUsesLiveHeightWarp =
    useLinearBodyWarpForSvgTemplates &&
    (typeof debugFlatCmGridBodyLiveHeightWarp === "boolean"
      ? debugFlatCmGridBodyLiveHeightWarp
      : flatCmGarmentPreset);
  /** 格子: テンプレ Y で脊髄合わせの X を切ると閾値をまたぐ path（袖〜脚の長線）がギザる。身長 150/195 の極端でも一貫させるため、足元 (BZ.foot) まで ref 線形の X を維持（Y のみ脊髄スケール）。 */
  const GRID_SILHOUETTE_PRESERVE_SPINE_ALIGN_REF_X_Y_MAX = BZ.foot;
  const indentWaistIdx = getBodyIndentWaistGlobalIndices(bodyModelVariant);
  const warpOptsBody = {
    heightCm: height,
    applyArmpitBaseRigRelief: true,
  } as const;
  const { yScale, xScale } = getBodyParams(height, weight, rigLinePaths);
  /** model+rig: 腕・鎖骨リグ専用。胴の `warp`（ゾーン）を通さない線形基底 */
  const bodyRigLimbLinearUniform = lineArtLinearWarpFromScales(yScale, xScale);
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
  const tplPivotForRigPath = (pathIdx: number): [number, number] | null => {
    if (rigLinePaths == null || !rigLinePaths[pathIdx]) return null;
    const p0 = getPathPoints(rigLinePaths[pathIdx]!)[0];
    return p0 ? [p0[0], p0[1]] : null;
  };
  const gridPivotArmL = tplPivotForRigPath(RIG_LINE_ARM_L);
  const gridPivotArmR = tplPivotForRigPath(RIG_LINE_ARM_R);
  const gridPivotClavicleL = tplPivotForRigPath(RIG_LINE_CLAVICLE_L);
  const gridPivotClavicleR = tplPivotForRigPath(RIG_LINE_CLAVICLE_R);
  /** piecewise Y を腕・鎖骨の各点に掛けると斜め辺の見かけ角度が崩れる。ピボットの piecewise 位置に、テンプレ差に yScale を掛けた相似で追従させる。 */
  const warpSimilarityFromPivot = (
    pivotTpl: [number, number] | null,
    x: number,
    y: number,
    piecewiseAt: (px: number, py: number) => [number, number],
    lam: number
  ): [number, number] | null => {
    if (pivotTpl == null) return null;
    const [sx, sy] = pivotTpl;
    const Sp = piecewiseAt(sx, sy);
    return [Sp[0] + (x - sx) * lam, Sp[1] + (y - sy) * lam];
  };
  const zones = getZonesAnchored(yScale);
  /** 身長キーで腕外形をモーフさせるとスライダーで腕角度が変わる。基準外形固定でワープのみ体型に追従させる */
  const { left: leftArmOutline, right: rightArmOutline } = getInterpolatedArmOutline(REF_HEIGHT_CM);

  /**
   * 腕・鎖骨: 体重胴横なし（uniform）。
   * 脚プレースホルダ（index 3,4）も **torso 用ラテラル**を掛けると股付近で X が BODY_CX に寄り、両脚が一点に潰れて見えるため uniform とする。
   */
  const gridRigLineUsesTorsoWeightLateral = (rigPathIdx: number): boolean =>
    rigPathIdx !== RIG_LINE_ARM_L &&
    rigPathIdx !== RIG_LINE_ARM_R &&
    rigPathIdx !== RIG_LINE_CLAVICLE_L &&
    rigPathIdx !== RIG_LINE_CLAVICLE_R &&
    !GRID_RIG_OVERLAY_OMIT_INDICES.has(rigPathIdx);

  /** 計算用の現在ワープリグ。格子: 腕・鎖骨は uniform＋ピボット相似／胴は torso。model+rig: 腕・鎖骨は線形＋ピボット相似のみで胴 `warp` と分離 */
  const warpRigLineAtIdx = (pathIdx: number, x: number, y: number): [number, number] =>
    useLinearBodyWarpForSvgTemplates
      ? pathIdx === RIG_LINE_ARM_L
        ? (warpSimilarityFromPivot(gridPivotArmL, x, y, lineArtLinearWarpUniform, yScale) ??
          lineArtLinearWarpUniform(x, y))
        : pathIdx === RIG_LINE_ARM_R
          ? (warpSimilarityFromPivot(gridPivotArmR, x, y, lineArtLinearWarpUniform, yScale) ??
            lineArtLinearWarpUniform(x, y))
          : pathIdx === RIG_LINE_CLAVICLE_L
            ? (warpSimilarityFromPivot(gridPivotClavicleL, x, y, lineArtLinearWarpUniform, yScale) ??
              lineArtLinearWarpUniform(x, y))
            : pathIdx === RIG_LINE_CLAVICLE_R
              ? (warpSimilarityFromPivot(gridPivotClavicleR, x, y, lineArtLinearWarpUniform, yScale) ??
                lineArtLinearWarpUniform(x, y))
              : gridRigLineUsesTorsoWeightLateral(pathIdx)
                ? lineArtLinearWarpTorso(x, y)
                : lineArtLinearWarpUniform(x, y)
      : rigPathUsesIndependentLimbWarp(pathIdx)
        ? (warpSimilarityFromPivot(
            tplPivotForRigPath(pathIdx),
            x,
            y,
            bodyRigLimbLinearUniform,
            yScale
          ) ?? bodyRigLimbLinearUniform(x, y))
        : warp(x, y, yScale, xScale, zones, warpOptsBody);

  // 身長 yScale は脊髄スパン連動済み。後段で格子ダミー path の omit・表示用 tilt のみ適用する。
  const rigLineWarpedPathsRaw = rigLinePaths
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
      ? pathIdx === RIG_LINE_ARM_L
        ? (warpSimilarityFromPivot(gridPivotArmL, x, y, lineArtRefLinearWarpUniform, refRigYs) ??
          lineArtRefLinearWarpUniform(x, y))
        : pathIdx === RIG_LINE_ARM_R
          ? (warpSimilarityFromPivot(gridPivotArmR, x, y, lineArtRefLinearWarpUniform, refRigYs) ??
            lineArtRefLinearWarpUniform(x, y))
          : pathIdx === RIG_LINE_CLAVICLE_L
            ? (warpSimilarityFromPivot(gridPivotClavicleL, x, y, lineArtRefLinearWarpUniform, refRigYs) ??
              lineArtRefLinearWarpUniform(x, y))
            : pathIdx === RIG_LINE_CLAVICLE_R
              ? (warpSimilarityFromPivot(gridPivotClavicleR, x, y, lineArtRefLinearWarpUniform, refRigYs) ??
                lineArtRefLinearWarpUniform(x, y))
              : gridRigLineUsesTorsoWeightLateral(pathIdx)
                ? lineArtRefLinearWarpTorso(x, y)
                : lineArtRefLinearWarpUniform(x, y)
      : rigPathUsesIndependentLimbWarp(pathIdx)
        ? (warpSimilarityFromPivot(
            tplPivotForRigPath(pathIdx),
            x,
            y,
            lineArtRefLinearWarpUniform,
            refRigYs
          ) ?? lineArtRefLinearWarpUniform(x, y))
        : warp(x, y, refRigYs, refRigXs, refRigZones, warpOptsRefBody);
  const rigRefWarpedPaths = rigLinePaths
    ? rigLinePaths.map((d, i) => tPath(d, (x, y) => warpRigLineRefBodyAtIdx(i, x, y)))
    : [];

  /** 基準リグ→現在リグの脊髄合わせ（頭付近は弱スケール）。弦ロック前の現在リグでスケールを決める */
  const rigSpineAlignFnBody = computeRigSpineAlignFn(rigRefWarpedPaths, rigLineWarpedPathsRaw);
  /** 格子: ライブ身長時は `warpRigLineAtIdx`（腕・鎖骨はピボット相似）を表示リグにそのまま渡す。 */
  const rigLineWarpedRigViewPathsBase =
    rigRefWarpedPaths.length > 0 &&
    rigLineWarpedPathsRaw.length > 0 &&
    rigSpineAlignFnBody != null
      ? useLinearBodyWarpForSvgTemplates && rigLinePaths != null
        ? rigLinePaths.map((d, pathIdx) =>
            tPath(d, (tx, ty) =>
              flatCmGridBodyUsesLiveHeightWarp
                ? warpRigLineAtIdx(pathIdx, tx, ty)
                : warpRigLineRefBodyAtIdx(pathIdx, tx, ty)
            )
          )
        : rigRefWarpedPaths.map((d, pathIdx) =>
            rigPathUsesIndependentLimbWarp(pathIdx) && rigLineWarpedPathsRaw[pathIdx]
              ? rigLineWarpedPathsRaw[pathIdx]!
              : tPath(d, rigSpineAlignFnBody)
          )
      : rigRefWarpedPaths;

  /** 服 SVG・服に載せる赤リグ（非格子: 現在身長 y）。格子は後段で基準身長ワープのみに固定し服が身長スライドしないようにする */
  const { yScale: ysGarment, xScale: xsGarment } = getBodyParams(height, REF_WEIGHT_KG, rigLinePaths);
  const zonesGarment = getZonesAnchored(ysGarment);
  const warpOptsGarment = { heightCm: height, applyArmpitBaseRigRelief: false } as const;
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
  /** 格子: ref 線形のみ＝モデル赤リグと同じ基準。非格子: warp(ysGarment) */
  const warpRigLineGarment = useLinearBodyWarpForSvgTemplates
    ? warpRigLineRefBodyGarment
    : (x: number, y: number): [number, number] =>
        warp(x, y, ysGarment, xsGarment, zonesGarment, warpOptsGarment);
  const rigLineWarpedPathsGarment = rigLinePaths ? rigLinePaths.map((d) => tPath(d, warpRigLineGarment)) : [];
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
  /** 服リグテンプレ→画面。格子は ref のみ渡し並進しない（モデルとの非一致縮尺を防ぐ） */
  const rigAlignTemplateToRigViewGarmentForPath =
    (_pathIdx: number) =>
    (x: number, y: number): [number, number] => {
      const refW = warpRigLineRefBodyGarment(x, y);
      if (useLinearBodyWarpForSvgTemplates) return refW;
      if (!rigSpineAlignFnGarment) return refW;
      const aligned = rigSpineAlignFnGarment(refW[0], refW[1]);
      if (y <= GRID_SILHOUETTE_PRESERVE_SPINE_ALIGN_REF_X_Y_MAX) {
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

  /** 平置き cm 用: {@link warpGridSilhouetteRefLinearAtIdx} と同じ path ごとの Torso/Uniform 切替で、**現在身長**の線形ワープを使う。 */
  const warpGridSilhouetteCurrentLinearAtIdx = (
    silhouettePathIdx: number | null,
    x: number,
    y: number
  ): [number, number] => {
    const useUnifiedGridIllustratedLinear =
      silhouettePathIdx !== null &&
      (bodyModelVariant === "gridSvgBody" || bodyModelVariant === "gridSvgBodyBack");
    /**
     * ライブ身長: 胴マスクで頂点ごとの横スケールが変わり、path の辺の見かけ角度が yScale と連動してねじれる。
     * 赤腕リグはこの局面で uniform＋ピボット相似のみなので、シルエットも uniform に揃えてリグ優先の見え方にする。
     * （REF 固定表示は従来どおり torso で体重の胴横を維持）
     */
    if (useUnifiedGridIllustratedLinear && flatCmGridBodyUsesLiveHeightWarp) {
      return lineArtLinearWarpUniform(x, y);
    }
    return useUnifiedGridIllustratedLinear
      ? lineArtLinearWarpTorso(x, y)
      : lineArtLinearWarpUniform(x, y);
  };

  const rigAlignTemplateToRigViewBody = (
    silhouettePathIdx: number | null,
    x: number,
    y: number
  ): [number, number] => {
    const refW = flatCmGridBodyUsesLiveHeightWarp
      ? warpGridSilhouetteCurrentLinearAtIdx(silhouettePathIdx, x, y)
      : warpGridSilhouetteRefLinearAtIdx(silhouettePathIdx, x, y);
    if (useLinearBodyWarpForSvgTemplates) return refW;
    if (!rigSpineAlignFnBody) return refW;
    const aligned = rigSpineAlignFnBody(refW[0], refW[1]);
    if (y <= GRID_SILHOUETTE_PRESERVE_SPINE_ALIGN_REF_X_Y_MAX) {
      return [refW[0], aligned[1]];
    }
    return aligned;
  };

  /** カスタム服の赤リグ線（モデル側の赤リグは `rigLineWarpedRigViewPaths`） */
  const rigTemplateToRigViewForGarmentPath = (pathIdx: number) => rigAlignTemplateToRigViewGarmentForPath(pathIdx);

  /**
   * 格子・ライブ身長: 赤リグ表示は `rigLineWarpedRigViewPathsBase` で `warpRigLineAtIdx` と同一（腕も身長で伸び、輪郭の lineArt 系と整合）。
   * リグ腕の始点は輪郭の外肩ではなく首横ピボットのため、REF 形状の載せ替えだけでは破綻しやすい。
   */
  let rigLineWarpedRigViewPathsBaseResolved = rigLineWarpedRigViewPathsBase;

  const rigLineWarpedRigViewPathsTilted =
    rigLineWarpedRigViewPathsBaseResolved.length > RIG_LINE_ARM_R
      ? applyRigArmAngleTiltToWarpedRigPaths(
          rigLineWarpedRigViewPathsBaseResolved,
          height,
          RIG_LINE_ARM_L,
          RIG_LINE_ARM_R
        )
      : rigLineWarpedRigViewPathsBaseResolved;

  /** 脚プレースホルダ (3,4) は compound 由来のダミー。座標がワープで肩付近に飛ぶことがあるためデータ側でも空にし、描画ズレを防ぐ。 */
  const rigLineWarpedRigViewPathsAfterOmit =
    useLinearBodyWarpForSvgTemplates && rigLineWarpedRigViewPathsTilted.length > RIG_LINE_ARM_R
      ? rigLineWarpedRigViewPathsTilted.map((d, i) =>
          GRID_RIG_OVERLAY_OMIT_INDICES.has(i) ? "" : d
        )
      : rigLineWarpedRigViewPathsTilted;
  const rigLineWarpedRigViewPaths = rigLineWarpedRigViewPathsAfterOmit;

  const rigLineWarpedPathsTiltedCore =
    rigLineWarpedPathsRaw.length > RIG_LINE_ARM_R
      ? applyRigArmAngleTiltToWarpedRigPaths(
          rigLineWarpedPathsRaw,
          height,
          RIG_LINE_ARM_L,
          RIG_LINE_ARM_R
        )
      : rigLineWarpedPathsRaw;
  const rigLineWarpedPaths =
    useLinearBodyWarpForSvgTemplates && rigLineWarpedPathsTiltedCore.length > RIG_LINE_ARM_R
      ? rigLineWarpedPathsTiltedCore.map((d, i) =>
          GRID_RIG_OVERLAY_OMIT_INDICES.has(i) ? "" : d
        )
      : rigLineWarpedPathsTiltedCore;

  const xScaleForArms = useLinearBodyWarpForSvgTemplates ? xScaleGridRigMatchGarment : xScale;
  /** 腕の肩・手首を、胴輪郭の補助点（`silhouettePathIdx === null`）と同じ格子線形写像へ揃え、肩位置を身長可変でも固定 */
  const gridLinearBodyPointWarpForSharedSeam: TemplatePointWarpFn | undefined =
    useLinearBodyWarpForSvgTemplates
      ? (x, y) =>
          flatCmGridBodyUsesLiveHeightWarp
            ? warpGridSilhouetteCurrentLinearAtIdx(null, x, y)
            : warpGridSilhouetteRefLinearAtIdx(null, x, y)
      : undefined;
  const unitDirFromWarpedRigPathString = (d: string): { dirX: number; dirY: number } | undefined => {
    if (!d || d.length === 0) return undefined;
    const pts = getPathPoints(d);
    if (pts.length < 2) return undefined;
    const a = pts[0]!;
    const b = pts[pts.length - 1]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return undefined;
    return { dirX: dx / len, dirY: dy / len };
  };
  /** 格子: 腕アウトラインは **画面上の赤リグ**（`rigLineWarpedRigViewPaths`）の弦方向に一致（表示＝真値） */
  const gridRigArmUnitDirL =
    useLinearBodyWarpForSvgTemplates && rigLineWarpedRigViewPaths.length > RIG_LINE_ARM_L
      ? unitDirFromWarpedRigPathString(rigLineWarpedRigViewPaths[RIG_LINE_ARM_L]!)
      : useLinearBodyWarpForSvgTemplates && rigLineWarpedPaths.length > RIG_LINE_ARM_L
        ? unitDirFromWarpedRigPathString(rigLineWarpedPaths[RIG_LINE_ARM_L]!)
        : undefined;
  const gridRigArmUnitDirR =
    useLinearBodyWarpForSvgTemplates && rigLineWarpedRigViewPaths.length > RIG_LINE_ARM_R
      ? unitDirFromWarpedRigPathString(rigLineWarpedRigViewPaths[RIG_LINE_ARM_R]!)
      : useLinearBodyWarpForSvgTemplates && rigLineWarpedPaths.length > RIG_LINE_ARM_R
        ? unitDirFromWarpedRigPathString(rigLineWarpedPaths[RIG_LINE_ARM_R]!)
        : undefined;
  const leftArmWarped = warpArmOutline(
    leftArmOutline,
    true,
    yScale,
    xScaleForArms,
    zones,
    height,
    gridLinearBodyPointWarpForSharedSeam,
    gridRigArmUnitDirL
  );
  const rightArmWarped = warpArmOutline(
    rightArmOutline,
    false,
    yScale,
    xScaleForArms,
    zones,
    height,
    gridLinearBodyPointWarpForSharedSeam,
    gridRigArmUnitDirR
  );
  const leftShoulder = leftArmWarped[0]!;
  const rightShoulder = rightArmWarped[0]!;
  const deltaThetas = getDeltaThetas(height, weight, REF_HEIGHT_CM, gridLinearBodyPointWarpForSharedSeam, {
    left: gridRigArmUnitDirL,
    right: gridRigArmUnitDirR,
  });
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
   * - カスタム SVG の赤リグ・ファブリック整列: `warpRigLine*Garment`・`rigSpineAlignFnGarment`・`rigTemplateToRigViewForGarmentPath`（非格子）。
   * - 格子ボディ（平置き cm 以外）: モデル赤リグ・シルエットは **REF** 線形ワープのみ、服とも REF で一致。
   * - 格子＋**平置き cm**: シルエット・モデル赤リグは **現在身長** 線形ワープ、服・服赤リグは **REF** のまま（着寸は身長で伸びない）。
   * - 体重横は **`(x,y)` マスクされた胴帯のみ**（リグ腕線は uniform を維持することもあり）。
   * - リグ nudge（服リグなし時）のモデル bbox は `rigLineWarpedPathsGarment`（格子時は REF ワープ＝モデル側と同一基準）。
   * - viewBox 縦: 格子＋平置き **ライブ身長** または格子 custom は REF 縦基準で固定（meet がスライダーに連動しない）。ライブオフの格子のみ maxY で底拡張。
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

  const { viewBoxMinX, viewBoxWidth, viewBoxHeight, yScaleForViewBoxVertical } =
    computeFittingCanvasSnapshotViewBox({
      garment,
      useLinearBodyWarpForSvgTemplates,
      flatCmGridBodyUsesLiveHeightWarp,
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
    });

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
