import {
  indexOfClosest,
  onePointOnGarmentOutline,
  outerCollarPoints,
  shoulderContourFromPath,
  shoulderPointOnLine,
} from "@/app/(main)/development/fitting/lib/fittingContourUtils";
import { resolveGenericScalableSpec } from "@/app/(main)/development/fitting/generic";
import { applyYScaleToCanvasPoints } from "./fittingCanvasCustomGarmentGradeLength";
import { isDebugFittingMeasureEnabled } from "./fittingCanvasDebugFlags";
import {
  computeLengthOverlayFromPurpleOrHighlight,
  computePrimarySleeveOverlayDraft,
  resolveMirrorSleeveCanvasPoints,
} from "./fittingCanvasGarmentOverlayMeasureBlocks";
import type {
  CustomGarmentData,
  CustomLandmarks,
  GarmentLengthGeomBeforeLengthMeshDebug,
  GenericVertexPlotHighlight,
  MeasureOverlayData,
  ScalableGarmentSpec,
  ShoulderDebug,
} from "@/app/(main)/development/fitting/lib/types";

function scalableSpecForCustomGarment(data: CustomGarmentData): ScalableGarmentSpec | null {
  return resolveGenericScalableSpec(data);
}

export type CustomGarmentOverlayAssemblyInput = {
  customGarmentData: CustomGarmentData;
  customPoints: [number, number][];
  customAllOutline: [number, number][];
  bodyShoulderContour: [number, number][];
  c: CustomGarmentData["landmarks"];
  rigLm: CustomLandmarks | null;
  useRigLandmarksForPlacement: boolean;
  hasGarmentRig: boolean;
  shoulderSeamY: number;
  placeDesignToTemplate: (gx: number, gy: number) => [number, number];
  designToGarmentCanvas: (gx: number, gy: number) => [number, number];
  customGarmentFabricRigViewWarp: (x: number, y: number) => [number, number];
  genericVertexPlotHighlight: GenericVertexPlotHighlight | null;
  /**
   * 服リグの fabric ワープ直前の頂点（place＋テンプレ X シフト済み）。
   * 幾何の px はここから取る（ファブリックワープ後は非線形でズレる）。服リグなしでは customPoints と同じ。
   */
  customPointsBeforeFabricWarp?: [number, number][] | null;
  /** `buildTopPlacement` と同一の縦 px/cm（胴・着丈の cm 換算） */
  bodyPxPerCm: number;
  /**
   * 汎用トップの袖丈: `scaleSleevePathToSpec` と同じ分母（紫着丈の縦 px ÷ 入力着丈 cm 等）。
   * 未指定時は bodyPxPerCm（プレース）で換算し、入力袖丈と幾何がずれることがある。
   */
  sleevePxPerCmForMeasure?: number;
  /**
   * 汎用トップ: 袖スケール後の pathDs から算出した袖丈（gt 定義）。オーバーレイの幾何 cm は編集中ハイライト列よりここを優先する。
   */
  sleevePipelineGeom?: { px: number; cm: number } | null;
  /** ミラー袖: 上記と同定義（プライマリと同じパイプライン後の path から算出） */
  sleevePipelineGeomMirror?: { px: number; cm: number } | null;
  /** 袖丈 canvas スケール補正前（applyGenericSleeveScaleAfterLengthMesh 適用前）の同チェーン縦スパン */
  sleeveGeomBeforeSleeveFixDebug?: { px: number; cm: number };
  sleeveGeomBeforeSleeveFixDebugRight?: { px: number; cm: number };
  /** 服リグ: ファブリックワープ後に縦スケールをかけたときのパラメータ（肩コンターと同じ Y 変換を適用） */
  canvasYGradeScale?: { lengthTopY: number; scale: number } | null;
  /** 着丈 Y メッシュ前の紫区間（実測 px / スライダー換算 cm / 目標縦 px / Δ）。入力 cm を幾何として偽装しないこと。 */
  lengthGeomBeforeLengthMeshDebug?: GarmentLengthGeomBeforeLengthMeshDebug;
  /** デバッグ: 紫着丈＋baseline 適格でも縦メッシュをかけなかった理由 */
  lengthMeshSkipReason?: string;
  animatingCustomSizeBlend?: boolean;
};

/**
 * カスタム服: path/rig 変換後の頂点列から採寸オーバーレイ・`shoulderDebug` を組み立てる（表示専用、Canon §13）。
 */
export function assembleCustomGarmentOverlayAndShoulderDebug(
  input: CustomGarmentOverlayAssemblyInput
): { garmentOverlay: MeasureOverlayData["garment"]; shoulderDebug: ShoulderDebug } {
  const {
    customGarmentData,
    customPoints,
    customAllOutline,
    bodyShoulderContour,
    c,
    rigLm,
    useRigLandmarksForPlacement,
    hasGarmentRig,
    shoulderSeamY,
    placeDesignToTemplate,
    designToGarmentCanvas,
    customGarmentFabricRigViewWarp,
    genericVertexPlotHighlight,
    customPointsBeforeFabricWarp,
    bodyPxPerCm,
    sleevePxPerCmForMeasure,
    sleevePipelineGeom,
    sleevePipelineGeomMirror,
    sleeveGeomBeforeSleeveFixDebug,
    sleeveGeomBeforeSleeveFixDebugRight,
    canvasYGradeScale,
    lengthGeomBeforeLengthMeshDebug: lengthGeomBeforeLengthMeshDebugInput,
    lengthMeshSkipReason,
    animatingCustomSizeBlend,
  } = input;

  const sleevePxPerCmForOverlay = sleevePxPerCmForMeasure ?? bodyPxPerCm;

  /** 幾何数値用。ワープ前＝線形ボディ座標（ファブリックワープ前を優先）。ワープなしは customPoints と同一。 */
  const ptsForGeometry = customPointsBeforeFabricWarp ?? customPoints;
  /**
   * 紫着丈の縦スパン算出用。リグロック時はプレースが scaleModelViewToBodyTemplate のため、
   * 縦 px を bodyPxPerCm で割った cm（スライダー換算）は入力着丈 cm と一致しないことがある。
   * 着丈 Y メッシュ後は最終頂点。
   */
  const ptsForPurpleLength =
    hasGarmentRig && canvasYGradeScale == null && customPointsBeforeFabricWarp != null
      ? customPointsBeforeFabricWarp
      : customPoints;

  const refShoulderLx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderLx : c.shoulderLx;
  const refShoulderRx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderRx : c.shoulderRx;
  const refHemY = useRigLandmarksForPlacement && rigLm ? rigLm.hemY : c.hemY;
  const refHemCx = useRigLandmarksForPlacement && rigLm ? rigLm.hemCx : c.hemCx;
  const customContourBase = [
    placeDesignToTemplate(refShoulderLx, shoulderSeamY),
    placeDesignToTemplate(refShoulderRx, shoulderSeamY),
  ];
  let customContour: [number, number][] = hasGarmentRig
    ? (customContourBase.map(([x, y]) => customGarmentFabricRigViewWarp(x, y)) as [number, number][])
    : customContourBase;
  if (canvasYGradeScale) {
    const { lengthTopY, scale } = canvasYGradeScale;
    customContour = applyYScaleToCanvasPoints(customContour, lengthTopY, scale);
  }
  const customShoulderIdx = (() => {
    const band = 15;
    const customRaw = shoulderContourFromPath(
      customGarmentData.pathDs,
      shoulderSeamY - band,
      shoulderSeamY + band,
      false
    );
    const customOuter = outerCollarPoints(customRaw, refShoulderLx, refShoulderRx);
    const pt =
      shoulderPointOnLine(
        customAllOutline,
        shoulderSeamY,
        (refShoulderLx + refShoulderRx) / 2
      ) ??
      onePointOnGarmentOutline(customOuter, customRaw, refShoulderLx, refShoulderRx);
    return indexOfClosest(customAllOutline, pt);
  })();
  const centerXGarment = (refShoulderLx + refShoulderRx) / 2;
  const shoulderBandY0 = shoulderSeamY;
  const shoulderBandY1 = shoulderSeamY + 28;
  const shoulderBand = customAllOutline.filter((p) => p[1] >= shoulderBandY0 && p[1] <= shoulderBandY1);
  const visualShoulderLx = shoulderBand.length > 0 ? Math.min(...shoulderBand.map((p) => p[0])) : refShoulderLx;
  const visualShoulderRx = shoulderBand.length > 0 ? Math.max(...shoulderBand.map((p) => p[0])) : refShoulderRx;
  const bandY0 = shoulderSeamY + (refHemY - shoulderSeamY) * 0.35;
  const bandY1 = shoulderSeamY + (refHemY - shoulderSeamY) * 0.65;
  const torsoBand = customAllOutline.filter((p) => p[1] >= bandY0 && p[1] <= bandY1);
  const chestMinX = torsoBand.length > 0 ? Math.min(...torsoBand.map((p) => p[0])) : refShoulderLx;
  const chestMaxX = torsoBand.length > 0 ? Math.max(...torsoBand.map((p) => p[0])) : refShoulderRx;
  const chestMidY = (bandY0 + bandY1) / 2;
  const leftHalfAtShoulder = shoulderBand.filter((p) => p[0] < centerXGarment);
  const sleeveSeamL = leftHalfAtShoulder.length > 0 ? leftHalfAtShoulder.reduce((a, b) => (a[0] > b[0] ? a : b)) : [visualShoulderLx, shoulderSeamY] as [number, number];
  const leftSleeveStrict = customAllOutline.filter(
    (p) => p[0] < visualShoulderLx && p[1] > shoulderSeamY
  );
  const leftSleeve = leftSleeveStrict.length > 0 ? leftSleeveStrict : customAllOutline.filter((p) => p[0] < centerXGarment && p[1] > shoulderSeamY);
  const sleeveEndPt = leftSleeve.length > 0 ? leftSleeve.reduce((a, b) => (a[1] > b[1] ? a : b)) : null;
  /** キャンバス側 `buildTopPlacement` と同一の縦 px/cm。袖丈はチェーンの縦 |Δy| を sleevePxPerCmForOverlay で cm 化。 */
  const scalableSpec = scalableSpecForCustomGarment(customGarmentData);
  const gtSym = customGarmentData.genericSymmetricTop;
  const primarySleeve = computePrimarySleeveOverlayDraft({
    customPoints,
    customGarmentData,
    sleevePxPerCmForOverlay,
    genericVertexPlotHighlight,
    scalableSpecSleeveIndices: scalableSpec?.sleeveMeasureIndices ?? null,
    designToGarmentCanvas,
    sleeveSeamL,
    sleeveEndPt,
  });
  let sleeveStart = primarySleeve.sleeveStart;
  let sleeveEnd = primarySleeve.sleeveEnd;
  let sleevePathPoints = primarySleeve.sleevePathPoints;
  let sleevePathLengthDebug = primarySleeve.sleevePathLengthDebug;
  const sleeveIndicesForOverlay = primarySleeve.sleeveIndicesForOverlay;
  const sleeveVertexChainVisual = primarySleeve.sleeveVertexChainVisual;

  /** 確定 gt＋最終 path の袖丈（ハイライト用チェーンの一時列と数値が食い違わないようにする） */
  if (sleevePipelineGeom != null && customGarmentData.presetId === "genericSymmetricTop") {
    sleevePathLengthDebug = {
      px: Math.round(sleevePipelineGeom.px),
      cm: sleevePipelineGeom.cm,
    };
  }

  let sleeveMeasuredCm: number | undefined;

  const gtLen = customGarmentData.genericSymmetricTop;
  const purpleLen = computeLengthOverlayFromPurpleOrHighlight({
    ptsForPurpleLength,
    bodyPxPerCm,
    designToGarmentCanvas,
    visualShoulderLx,
    shoulderSeamY,
    refHemCx,
    refHemY,
    gtLen,
    hlLen: genericVertexPlotHighlight?.lengthMeasure,
  });
  let hemCenter = purpleLen.hemCenter;
  let lengthMeasuredCm = purpleLen.lengthMeasuredCm;
  const lengthMeasurePlotRange = purpleLen.lengthMeasurePlotRange;
  let lengthPathLengthDebug = purpleLen.lengthPathLengthDebug;
  const lengthMeasureTop = purpleLen.lengthMeasureTop;
  const shoulderYForLength = purpleLen.shoulderYForLength;

  /**
   * 着丈の幾何数値: 紫区間ありは `ptsForPurpleLength` の実測縦スパン（メッシュ・裾スナップ後の頂点）。
   * cm は表示 px÷bodyPxPerCm のみ（入力着丈で上書きしない）。
   */
  let lengthGeomDebug: { px: number; cm: number };
  if (lengthPathLengthDebug != null) {
    const pxR = lengthPathLengthDebug.px;
    lengthGeomDebug = {
      px: pxR,
      cm: pxR / bodyPxPerCm,
    };
    lengthMeasuredCm = lengthGeomDebug.cm;
  } else {
    const lengthPxVert = Math.abs(hemCenter[1] - shoulderYForLength);
    lengthGeomDebug = {
      px: Math.round(lengthPxVert),
      cm: lengthPxVert / bodyPxPerCm,
    };
    lengthMeasuredCm = lengthGeomDebug.cm;
  }

  if (lengthPathLengthDebug != null) {
    lengthPathLengthDebug = { px: lengthGeomDebug.px, cm: lengthGeomDebug.cm };
  }

  const shoulderLeft = designToGarmentCanvas(visualShoulderLx, shoulderSeamY);
  const shoulderRight = designToGarmentCanvas(visualShoulderRx, shoulderSeamY);
  const lengthGuideHem: [number, number] = [hemCenter[0], hemCenter[1]];

  let sleeveGeomDebug: { px: number; cm: number } | undefined;
  if (sleeveStart && sleeveEnd) {
    /** チェーンがあるときは縦 |Δy| ÷ sleevePxPerCmForOverlay（入力と同じ数値に上書きしない） */
    if (sleevePathLengthDebug != null) {
      sleeveMeasuredCm = sleevePathLengthDebug.cm;
      sleeveGeomDebug = {
        px: sleevePathLengthDebug.px,
        cm: sleevePathLengthDebug.cm,
      };
    } else {
      const sleevePx = customGarmentData.size.sleeve * sleevePxPerCmForOverlay;
      sleeveMeasuredCm = customGarmentData.size.sleeve;
      sleeveGeomDebug = { px: Math.round(sleevePx), cm: customGarmentData.size.sleeve };
    }
  }

  /** ミラー袖（反対側）: 採寸オーバーレイの赤線・メジャー用。`lockedTopology` 不要で gt の連結をそのまま使う */
  let sleevePathPointsRight: [number, number][] | undefined;
  let sleeveStartRight: [number, number] | undefined;
  let sleeveEndRight: [number, number] | undefined;
  const gtMirrorChain = gtSym?.sleeveMirrorMeasureVertexChain;
  const mirrorVertexPairOk =
    gtSym?.sleeveMirrorMeasureVertexStart != null &&
    gtSym?.sleeveMirrorMeasureVertexEnd != null &&
    Number.isFinite(gtSym.sleeveMirrorMeasureVertexStart) &&
    Number.isFinite(gtSym.sleeveMirrorMeasureVertexEnd) &&
    gtSym.sleeveMirrorMeasureVertexStart !== gtSym.sleeveMirrorMeasureVertexEnd;

  if (gtSym != null) {
    const mirrorPts = resolveMirrorSleeveCanvasPoints(customPoints, gtSym);
    sleevePathPointsRight = mirrorPts.sleevePathPointsRight;
    sleeveStartRight = mirrorPts.sleeveStartRight;
    sleeveEndRight = mirrorPts.sleeveEndRight;
  }

  /** ミラー袖の幾何 cm はプライマリと同じ path 由来（`measureGenericTopSleeveCmFromPath` のミラー頂点指定）を優先 */
  let sleeveGeomDebugRight: { px: number; cm: number } | undefined;
  if (
    sleevePipelineGeomMirror != null &&
    customGarmentData.presetId === "genericSymmetricTop" &&
    sleevePathPointsRight != null &&
    sleevePathPointsRight.length >= 2
  ) {
    sleeveGeomDebugRight = {
      px: Math.round(sleevePipelineGeomMirror.px),
      cm: sleevePipelineGeomMirror.cm,
    };
  }

  let garmentOverlay: MeasureOverlayData["garment"] = {
    shoulderLeft,
    shoulderRight,
    hemCenter,
    size: customGarmentData.size,
    lengthMeasuredCm,
    lengthGuideHem,
    lengthGeomDebug,
    bodyPxPerCm,
    ...(lengthGeomBeforeLengthMeshDebugInput != null
      ? { lengthGeomBeforeLengthMeshDebug: lengthGeomBeforeLengthMeshDebugInput }
      : {}),
    ...(lengthMeasureTop ? { lengthMeasureTop } : {}),
    sizeLabel: customGarmentData.presetId === "genericSymmetricTop" ? "汎用トップ" : "カスタム服",
    chestLeft: designToGarmentCanvas(chestMinX, chestMidY),
    chestRight: designToGarmentCanvas(chestMaxX, chestMidY),
    sleeveStart,
    sleeveEnd,
    sleeveMeasuredCm,
    sleevePathPoints,
    ...(sleevePathPointsRight != null && sleeveStartRight != null && sleeveEndRight != null
      ? {
          sleevePathPointsRight,
          sleeveStartRight,
          sleeveEndRight,
        }
      : {}),
    ...(sleeveGeomDebug ? { sleeveGeomDebug } : {}),
    ...(sleeveGeomBeforeSleeveFixDebug != null ? { sleeveGeomBeforeSleeveFixDebug } : {}),
    ...(sleeveGeomDebugRight ? { sleeveGeomDebugRight } : {}),
    ...(sleeveGeomBeforeSleeveFixDebugRight != null
      ? { sleeveGeomBeforeSleeveFixDebugRight }
      : {}),
    ...(primarySleeve.sleeveMeasureRedLineIsEditPreview ? { sleeveMeasureRedLineIsEditPreview: true } : {}),
    ...(purpleLen.lengthMeasureIsEditPreview ? { lengthMeasureIsEditPreview: true } : {}),
  };

  const debugFittingMeasure = isDebugFittingMeasureEnabled();
  if (debugFittingMeasure && animatingCustomSizeBlend !== true) {
    const lenIn = customGarmentData.size.length;
    const slIn = customGarmentData.size.sleeve;
    /** 着丈・袖とも未入力のときは幾何だけあるため入力との差分ログはノイズになる */
    const sizeMeaningful = lenIn > 0.5 || slIn > 0.5;
    const lenDiff = lengthMeasuredCm != null ? Math.abs(lengthMeasuredCm - lenIn) : 0;
    const slDiff = sleeveMeasuredCm != null ? Math.abs(sleeveMeasuredCm - slIn) : 0;
    if (sizeMeaningful && (lenDiff > 0.2 || slDiff > 0.2)) {
      const lengthMeshApplied = canvasYGradeScale != null;
      const lengthMismatchWithoutMesh =
        customGarmentData.presetId === "genericSymmetricTop" && !lengthMeshApplied && lenDiff > 0.2;
      console.info("[FITTING_MEASURE] 入力値と幾何数値がずれています（採寸オーバーレイの定義差の確認用）", {
        着丈cm: { 入力値: lenIn, 幾何数値: lengthMeasuredCm ?? "—" },
        袖丈cm: { 入力値: slIn, 幾何数値: sleeveMeasuredCm ?? "—" },
        bodyPxPerCm,
        lengthMeshApplied,
        lengthMeshSkipReason,
        animatingCustomSizeBlend,
        ...(lengthMismatchWithoutMesh
          ? {
              着丈の注意:
                "リグロック時は紫区間の縦 px÷bodyPxPerCm（スライダー換算）が入力着丈と一致しないことがある。着丈 Y メッシュ未適用時は画面上の着丈も目標からずれやすい",
            }
          : {}),
      });
    }
  }

  const sleevePlotRangeForDebug: [number, number] | null =
    sleeveVertexChainVisual != null && sleeveVertexChainVisual.length >= 2
      ? [
          Math.min(sleeveVertexChainVisual[0]!, sleeveVertexChainVisual[sleeveVertexChainVisual.length - 1]!),
          Math.max(sleeveVertexChainVisual[0]!, sleeveVertexChainVisual[sleeveVertexChainVisual.length - 1]!),
        ]
      : sleeveIndicesForOverlay;

  const sleevePlotRangeRightForDebug: [number, number] | null =
    gtMirrorChain != null && gtMirrorChain.length >= 2
      ? [Math.min(...gtMirrorChain), Math.max(...gtMirrorChain)]
      : mirrorVertexPairOk
        ? (() => {
            const a = Math.trunc(gtSym!.sleeveMirrorMeasureVertexStart!);
            const b = Math.trunc(gtSym!.sleeveMirrorMeasureVertexEnd!);
            return [Math.min(a, b), Math.max(a, b)] as [number, number];
          })()
        : null;

  const shoulderDebug: ShoulderDebug = {
    bodyShoulderContour,
    garmentShoulderContour: customContour,
    garmentShoulderPoints: customPoints,
    shoulderPointIndex: customShoulderIdx,
    garmentType: "custom",
    ...(sleevePlotRangeForDebug ? { sleeveMeasurePlotRange: sleevePlotRangeForDebug } : {}),
    ...(sleevePlotRangeRightForDebug ? { sleeveMeasurePlotRangeRight: sleevePlotRangeRightForDebug } : {}),
    ...(sleevePathLengthDebug && { sleevePathLengthDebug }),
    ...(lengthMeasurePlotRange && { lengthMeasurePlotRange }),
    ...(lengthPathLengthDebug && { lengthPathLengthDebug }),
  };

  return { garmentOverlay, shoulderDebug };
}
