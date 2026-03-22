import type { CustomGarmentData, BodyZones } from "../types";
import { buildTopPlacement } from "../garmentBase";
import { scaleModelViewToBodyTemplate } from "../modelRigData";
import { tPath, getPathPoints, pointAtGlobalVertexIndex } from "../pathUtils";
import { BODY_CX, REF_HEIGHT_CM } from "../constants";
import {
  getBodyParams,
  getZonesAnchored,
  getBodyOutlineHalfW,
  warpArmOutline,
  getInterpolatedArmOutline,
} from "../bodyUtils";
import {
  applyGenericMeasureOnlyGrading,
  genericMeasureOnlyGradingActive,
} from "../generic";
import { getScalableSpec, shouldApplyScaleScaling, toTopLandmarks } from "./scalableSpec";

/** 着丈連結 # の |ΔY|（design px）。measure-only は baseline 着丈比の胴スケール後（袖は scaleSleevePathToSpec 後） */
function genericLengthMeasureVerticalSpanPx(
  pathDs: string[],
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): number | null {
  const la = gt.lengthMeasureVertexStart;
  const lb = gt.lengthMeasureVertexEnd;
  if (la == null || lb == null || !Number.isFinite(la) || !Number.isFinite(lb) || la === lb) {
    return null;
  }
  const gLo = Math.min(Math.trunc(la), Math.trunc(lb));
  const gHi = Math.max(Math.trunc(la), Math.trunc(lb));
  const pa = pointAtGlobalVertexIndex(pathDs, gLo);
  const pb = pointAtGlobalVertexIndex(pathDs, gHi);
  if (!pa || !pb) return null;
  const dy = Math.abs(pb[1] - pa[1]);
  return dy > 1 ? dy : null;
}

/** プレースメントのみ: 入力 path の連結頂点を placeFn でボディ座標へ */
function vertexPlotsPlaceOnly(
  pathDs: string[],
  placeFn: (x: number, y: number) => [number, number]
): [number, number][] {
  return pathDs.flatMap((d) => getPathPoints(d).map(([x, y]) => placeFn(x, y)));
}

/** photoDerived: 出力は [襟, ...入力に対応する bodyPaths, 左袖, 右袖]。入力 path i は出力 path i+1 に対応 */
function vertexPlotsPhotoLayout(
  inputPathDs: string[],
  outputPathDs: string[],
  placeFn: (x: number, y: number) => [number, number]
): [number, number][] {
  const plot: [number, number][] = [];
  for (let pi = 0; pi < inputPathDs.length; pi++) {
    const outD = outputPathDs[pi + 1];
    const inPts = getPathPoints(inputPathDs[pi]!);
    if (!outD) continue;
    const outPts = getPathPoints(outD);
    if (outPts.length === inPts.length) plot.push(...outPts);
    else plot.push(...inPts.map(([x, y]) => placeFn(x, y)));
  }
  return plot;
}

function buildSleevePathBody(
  armOutline: [number, number][],
  isLeft: boolean,
  yScale: number,
  xScale: number,
  zones: BodyZones,
  heightCm: number
): string {
  const pts = warpArmOutline(armOutline, isLeft, yScale, xScale, zones, heightCm);
  if (pts.length < 2) return "";
  const [x0, y0] = pts[0];
  let d = `M${x0} ${y0}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0]} ${pts[i][1]}`;
  d += `L${x0} ${y0}Z`;
  return d;
}

/**
 * 襟後ろの短いアーク（ボディ座標）。ネック直下に少しだけ後ろに見えるカーブを足す。
 */
function buildCollarBackPathBody(neckBotY: number): string {
  const w = 28;
  const cy = neckBotY - 35;
  return `M${BODY_CX - w} ${neckBotY} Q${BODY_CX} ${cy} ${BODY_CX + w} ${neckBotY}`;
}

export type CustomGarmentTransformResult = {
  pathDs: string[];
  /** 服プロット用（ボディ座標）。`pathDs` の服パーツ連結頂点と同じ個数・順序（襟・合成袖を除く photo モードは入力 path 連結分） */
  vertexPlotsBodySpace: [number, number][];
};

/** @see `placementLockToModelRig` — リグロック時は `scaleModelViewToBodyTemplate` でボディへ写す */
export type BuildCustomTransformedPathsOptions = {
  placementLockToModelRig?: boolean;
  /** 後方互換のため残すが、服のプレース・袖ワープには使わない */
  rigLinePaths?: string[] | null;
};

/** アップロード品をモデル座標に変換した path の d 配列を返す。shoulderOriginY 指定時はそのYだけボディ肩に合わせる。 */
export function buildCustomTransformedPaths(
  data: CustomGarmentData,
  h: number,
  w: number,
  shoulderOriginY?: number,
  opts?: BuildCustomTransformedPathsOptions
): string[] {
  return buildCustomTransformedPathsWithVertexPlots(data, h, w, shoulderOriginY, opts).pathDs;
}

/** path と服プロット座標をまとめて返す（プロットは zip せず変換パイプラインと同一の頂点対応） */
export function buildCustomTransformedPathsWithVertexPlots(
  data: CustomGarmentData,
  h: number,
  w: number,
  shoulderOriginY?: number,
  opts?: BuildCustomTransformedPathsOptions
): CustomGarmentTransformResult {
  const lmBase = data.landmarks;
  const placementLockToModelRig = opts?.placementLockToModelRig === true;
  const lm = { ...lmBase };
  const scalableSpec = getScalableSpec(data.pathDs, data.presetId);
  const specLengthCm = data.size?.length ?? (scalableSpec?.bodyLengthCm ?? 117.5);

  /** 体の横幅ワープと一致させる（基準体重固定だと体重スライダーで袖シルエットだけズレる） */
  const { yScale, xScale } = getBodyParams(h, w, null);
  const zones = getZonesAnchored(yScale);
  const bodyScaledLandmarks =
    placementLockToModelRig
      ? lm
      : scalableSpec && shouldApplyScaleScaling(data)
        ? (() => {
            const s = specLengthCm / scalableSpec.bodyLengthCm;
            const scaledHemY = scalableSpec.designShoulderY + (scalableSpec.designHemY - scalableSpec.designShoulderY) * s;
            // garmentLengthOverride は design 座標（肩Y〜裾Y）で必須。body の originY を混ぜると着丈スケールが狂う
            const designLength = scaledHemY - scalableSpec.designShoulderY;
            return {
              ...lm,
              shoulderY: scalableSpec.designShoulderY,
              hemY: scaledHemY,
              garmentLengthOverride: designLength,
            };
          })()
        : lm;
  // shoulderOriginY はデザイン座標のどのYが body.shoulder に対応するかを示す。
  // buildTopPlacement に渡すことで originY がデザイン肩Yに固定され、
  // by = zones.shoulder + (gy - shoulderOriginY) * scaleY が成立する。
  const top = toTopLandmarks(bodyScaledLandmarks);
  // scalableSpec 分岐では top.landmarks.shoulderY が scalableSpec.designShoulderY に上書きされるため、
  // originY（肩基準）も合わせないと size(length) 変更時に肩がズレる。
  const shoulderOriginYForPlace =
    placementLockToModelRig
      ? shoulderOriginY
      : scalableSpec && shouldApplyScaleScaling(data)
        ? scalableSpec.designShoulderY
        : shoulderOriginY;
  const place = placementLockToModelRig
    ? scaleModelViewToBodyTemplate
    : buildTopPlacement(h, w, data.size, top, shoulderOriginYForPlace, null, REF_HEIGHT_CM).place;

  /** 首の線分に固定する頂点用の変換。neckPinIndices の頂点はボディの首Y・首幅内に投影する */
  let placeFn: (x: number, y: number) => [number, number];
  if (data.neckPinIndices?.length) {
    // 体型変更しても固定したいので、首ラインは基準体(170/60)の座標に固定する
    const yScaleFixed = 1;
    const zonesFixed = getZonesAnchored(yScaleFixed);
    const neckBotY = zonesFixed.neck_bot;
    const neckLx = getBodyOutlineHalfW(neckBotY, yScaleFixed);
    const neckRx = 2 * BODY_CX - neckLx;
    let globalIndex = 0;
    placeFn = (x: number, y: number) => {
      const out = place(x, y);
      if (data.neckPinIndices!.includes(globalIndex)) {
        globalIndex++;
        return [Math.max(neckLx, Math.min(neckRx, out[0])), neckBotY];
      }
      globalIndex++;
      return out;
    };
  } else {
    placeFn = place;
  }

  const { left: leftArmOutline, right: rightArmOutline } = getInterpolatedArmOutline(REF_HEIGHT_CM);

  const gtForGeneric = data.presetId === "genericSymmetricTop" ? data.genericSymmetricTop : undefined;

  const { bodyPaths, vertexPlotsBodySpace: vertexPlotsFromGarment } = (() => {
    if (data.presetId === "genericSymmetricTop" && genericMeasureOnlyGradingActive(gtForGeneric)) {
      const graded = applyGenericMeasureOnlyGrading(data.pathDs, lm, data.size, gtForGeneric!);
      const purpleDyDesign =
        !placementLockToModelRig
          ? genericLengthMeasureVerticalSpanPx(graded, gtForGeneric!)
          : null;
      const chosenPlace =
        purpleDyDesign != null
          ? buildTopPlacement(
              h,
              w,
              data.size,
              toTopLandmarks({ ...lm, garmentLengthOverride: purpleDyDesign }),
              shoulderOriginYForPlace,
              null,
              REF_HEIGHT_CM
            ).place
          : place;

      const placeFnGraded: (x: number, y: number) => [number, number] = data.neckPinIndices?.length
        ? (() => {
            const yScaleFixed = 1;
            const zonesFixed = getZonesAnchored(yScaleFixed);
            const neckBotY = zonesFixed.neck_bot;
            const neckLx = getBodyOutlineHalfW(neckBotY, yScaleFixed);
            const neckRx = 2 * BODY_CX - neckLx;
            let globalIndex = 0;
            return (x: number, y: number): [number, number] => {
              const out = chosenPlace(x, y);
              if (data.neckPinIndices!.includes(globalIndex)) {
                globalIndex++;
                return [Math.max(neckLx, Math.min(neckRx, out[0])), neckBotY];
              }
              globalIndex++;
              return [out[0], out[1]];
            };
          })()
        : chosenPlace;

      return {
        bodyPaths: graded.map((d) => tPath(d, placeFnGraded)),
        vertexPlotsBodySpace: vertexPlotsPlaceOnly(graded, placeFnGraded),
      };
    }

    return {
      bodyPaths: data.pathDs.map((d) => tPath(d, placeFn)),
      vertexPlotsBodySpace: vertexPlotsPlaceOnly(data.pathDs, placeFn),
    };
  })();

  if (!data.photoDerived) {
    return { pathDs: bodyPaths, vertexPlotsBodySpace: vertexPlotsFromGarment };
  }

  const collarBack = buildCollarBackPathBody(zones.neck_bot);
  const leftSleeve = buildSleevePathBody(leftArmOutline, true, yScale, xScale, zones, h);
  const rightSleeve = buildSleevePathBody(rightArmOutline, false, yScale, xScale, zones, h);

  const pathDs = [collarBack, ...bodyPaths, leftSleeve, rightSleeve];
  return {
    pathDs,
    vertexPlotsBodySpace: vertexPlotsPhotoLayout(data.pathDs, pathDs, placeFn),
  };
}
