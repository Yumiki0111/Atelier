import type { CustomGarmentData, BodyZones } from "../lib/types";
import {
  buildTopPlacement,
  customLandmarksToTopLandmarks,
} from "../lib/garment/garmentBase";
import { scaleModelViewToBodyTemplate } from "../lib/rig/modelRigData";
import { tPath, getPathPoints } from "../lib/pathUtils";
import { BODY_CX, REF_HEIGHT_CM } from "../lib/constants";
import {
  getBodyParams,
  getZonesAnchored,
  warpArmOutline,
  getInterpolatedArmOutline,
} from "../lib/bodyUtils";
import { vertexPlotsPlaceOnly } from "./buildCustomTransformedPathsPlaceUtils";

/** 変形後の path 本数に合わせ、線の見た目配列を並べる（photo モードは襟・袖を実線・デフォルト） */
function presentationAlignedToPathOutput(
  data: CustomGarmentData,
  bodyPaths: string[],
  photoDerived: boolean
): {
  dash: (string | undefined)[];
  width: (number | undefined)[];
  stroke: (string | undefined)[];
  fill: (string | undefined)[];
} {
  const srcDash = data.pathStrokeDasharrays;
  const srcW = data.pathStrokeWidths;
  const srcS = data.pathStrokes;
  const srcFill = data.pathFills;
  if (!photoDerived) {
    return {
      dash: bodyPaths.map((_, i) => srcDash?.[i]),
      width: bodyPaths.map((_, i) => srcW?.[i]),
      stroke: bodyPaths.map((_, i) => srcS?.[i]),
      fill: bodyPaths.map((_, i) => srcFill?.[i]),
    };
  }
  const dash: (string | undefined)[] = [undefined];
  const width: (number | undefined)[] = [undefined];
  const stroke: (string | undefined)[] = [undefined];
  const fillArr: (string | undefined)[] = [undefined];
  for (let i = 0; i < bodyPaths.length; i++) {
    dash.push(srcDash?.[i]);
    width.push(srcW?.[i]);
    stroke.push(srcS?.[i]);
    fillArr.push(srcFill?.[i]);
  }
  dash.push(undefined, undefined);
  width.push(undefined, undefined);
  stroke.push(undefined, undefined);
  fillArr.push(undefined, undefined);
  return { dash, width, stroke, fill: fillArr };
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
  /** `pathDs` と同じ長さ。破線のない index は undefined */
  pathStrokeDasharrays: (string | undefined)[];
  pathStrokeWidths: (number | undefined)[];
  pathStrokes: (string | undefined)[];
  pathFills: (string | undefined)[];
};

/** @see `placementLockToModelRig` — リグロック時は `scaleModelViewToBodyTemplate` でボディへ写す */
export type BuildCustomTransformedPathsOptions = {
  placementLockToModelRig?: boolean;
  /**
   * リグロック時のデザイン→ボディ写像。省略時は `scaleModelViewToBodyTemplate`（model+rig 3391×6431）。
   * 格子リグ（389×518）アップロードではここに `gridRigSvgPointToBodyTemplatePreserveAspect` / `gridRigVectorPointToBodyTemplate` 相当を渡す。
   */
  placeDesignToBodyWhenRigLocked?: (x: number, y: number) => [number, number];
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
  const placementLockToModelRig = opts?.placementLockToModelRig === true;
  const top = customLandmarksToTopLandmarks(data.landmarks);
  const placeDesignLocked =
    opts?.placeDesignToBodyWhenRigLocked ?? scaleModelViewToBodyTemplate;
  const place = placementLockToModelRig
    ? placeDesignLocked
    : buildTopPlacement(h, w, data.size, top, shoulderOriginY, null, REF_HEIGHT_CM).place;

  const { yScale, xScale } = getBodyParams(h, w, null);
  const zones = getZonesAnchored(yScale);

  const { left: leftArmOutline, right: rightArmOutline } = getInterpolatedArmOutline(REF_HEIGHT_CM);

  const bodyPaths = data.pathDs.map((d) => tPath(d, place));
  const vertexPlotsFromGarment = vertexPlotsPlaceOnly(data.pathDs, place);

  if (!data.photoDerived) {
    const pres = presentationAlignedToPathOutput(data, bodyPaths, false);
    return {
      pathDs: bodyPaths,
      vertexPlotsBodySpace: vertexPlotsFromGarment,
      pathStrokeDasharrays: pres.dash,
      pathStrokeWidths: pres.width,
      pathStrokes: pres.stroke,
      pathFills: pres.fill,
    };
  }

  const collarBack = buildCollarBackPathBody(zones.neck_bot);
  const leftSleeve = buildSleevePathBody(leftArmOutline, true, yScale, xScale, zones, h);
  const rightSleeve = buildSleevePathBody(rightArmOutline, false, yScale, xScale, zones, h);

  const pathDs = [collarBack, ...bodyPaths, leftSleeve, rightSleeve];
  const pres = presentationAlignedToPathOutput(data, bodyPaths, true);
  return {
    pathDs,
    vertexPlotsBodySpace: vertexPlotsPhotoLayout(data.pathDs, pathDs, place),
    pathStrokeDasharrays: pres.dash,
    pathStrokeWidths: pres.width,
    pathStrokes: pres.stroke,
    pathFills: pres.fill,
  };
}
