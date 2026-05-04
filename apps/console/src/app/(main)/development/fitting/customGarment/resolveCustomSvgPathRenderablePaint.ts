/**
 * アップロード SVG の path をキャンバスへ描くときの見た目。
 * 他に stroke が付いた path があるとき、fill のみの path で輪郭を描くと縁が二重になるため、fill のみは **omit**（描かない）。
 * fill のみで他に stroke が無い → 単体輪郭として `stroke=f色`, `fill=none`.
 */
export type CustomSvgPathRenderablePaint =
  | { omit: true }
  | {
      omit: false;
      fill: string;
      stroke: string;
      strokeWidth: number;
    };

function otherPathHasParsedStroke(
  strokes: (string | undefined)[] | undefined,
  excludeIndex: number
): boolean {
  if (!strokes) return false;
  return strokes.some((s, i) => i !== excludeIndex && s != null && String(s).trim() !== "");
}

export function resolveCustomSvgPathRenderablePaint(opts: {
  garmentStrokeFallback: string;
  pathStroke?: string;
  pathFill?: string;
  pathStrokeWidth?: number;
  defaultStrokeWidth: number;
  allPathStrokes?: (string | undefined)[];
  pathIndex?: number;
  /**
   * true のとき、他 path に stroke があっても「fill のみ」の path を塗りとして残す。
   * Grading v4 など、塗り面がシルエットの本体である SVG で omit すると服が透けて見える。
   */
  preserveFillOnlyPaths?: boolean;
  /**
   * Grading v4 の背面レイヤ（back-stroke 系）のみ。
   * ストレージ上 stroke が無く fill のみの列挙になりがちだが geometry は縫線。fill 色で stroke を引く。
   */
  gradingBehindHealFillOnlyAsStroke?: boolean;
  /** 指定時、最終 strokeWidth をこれ未満にしない（export SVG の細い stroke を下回らない） */
  minStrokeWidth?: number;
}): CustomSvgPathRenderablePaint {
  const {
    garmentStrokeFallback,
    pathStroke,
    pathFill,
    pathStrokeWidth,
    defaultStrokeWidth,
    allPathStrokes,
    pathIndex,
    preserveFillOnlyPaths,
    gradingBehindHealFillOnlyAsStroke,
    minStrokeWidth,
  } = opts;
  const wRaw = pathStrokeWidth ?? defaultStrokeWidth;
  let w = Number.isFinite(wRaw) && wRaw > 0 ? wRaw : defaultStrokeWidth;
  if (minStrokeWidth != null && Number.isFinite(minStrokeWidth) && minStrokeWidth > 0) {
    w = Math.max(w, minStrokeWidth);
  }

  const fillTrim = pathFill?.trim() ?? "";
  const hasMeaningfulFill = fillTrim.length > 0 && !/^none$/i.test(fillTrim);
  const hasParsedStrokeAttr = pathStroke != null && pathStroke.trim().length > 0;

  if (gradingBehindHealFillOnlyAsStroke === true && hasMeaningfulFill && !hasParsedStrokeAttr) {
    return { omit: false, fill: "none", stroke: fillTrim, strokeWidth: w };
  }

  const othersHaveStroke =
    pathIndex !== undefined && otherPathHasParsedStroke(allPathStrokes, pathIndex);

  if (hasMeaningfulFill && !hasParsedStrokeAttr) {
    if (othersHaveStroke && !preserveFillOnlyPaths) {
      return { omit: true };
    }
    if (preserveFillOnlyPaths) {
      return { omit: false, fill: fillTrim, stroke: "none", strokeWidth: 0 };
    }
    return { omit: false, fill: "none", stroke: fillTrim, strokeWidth: w };
  }
  if (hasMeaningfulFill && hasParsedStrokeAttr) {
    return {
      omit: false,
      fill: fillTrim,
      stroke: pathStroke!.trim(),
      strokeWidth: w,
    };
  }
  return {
    omit: false,
    fill: "none",
    stroke: pathStroke?.trim() ?? garmentStrokeFallback,
    strokeWidth: w,
  };
}
