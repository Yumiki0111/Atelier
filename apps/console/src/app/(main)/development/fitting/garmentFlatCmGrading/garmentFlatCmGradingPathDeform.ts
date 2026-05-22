import { tokenize, round10 as fmt } from "../svgPath/tokenize";
import {
  BDY_L_X,
  BDY_R_X,
  BODY_BOT,
  BODY_TOP,
  CX,
  GARMENT_FLAT_CM_SHOULDER_ANCHOR_INNER_FRAC,
  GARMENT_FLAT_CM_BODY_WIDTH_SPAN_K,
  GARMENT_FLAT_CM_SHOULDER_DROP_K,
  GARMENT_FLAT_CM_SHOULDER_SPAN_K,
  MEASURE_BODY_LENGTH_Y1,
  MEASURE_BODY_LENGTH_Y2,
  MEASURE_SLEEVE_L_PATH_D,
  MEASURE_SLEEVE_L_VERTS,
  MEASURE_SLEEVE_R_PATH_D,
  MEASURE_SLEEVE_R_VERTS,
  GARMENT_FLAT_CM_SLEEVE_BODY_DY_BLEND,
  type GarmentFlatCmZone,
  SH_L_X,
  SH_R_X,
  SH_Y,
} from "./garmentFlatCmGradingConstants";
import {
  GARMENT_FLAT_CM_BODY_WIDTH_SLOPE_UNIT_L,
  GARMENT_FLAT_CM_BODY_WIDTH_SLOPE_UNIT_R,
  GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_L,
  GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_R,
} from "./garmentFlatCmShoulderSlope";

/**
 * 平置き cm の局所変形オプション。
 * - useShoulderSlopeDistribution: 肩幅 dSh・身幅 dBw をスロープ方向へ分配
 * - useShoulderAnchorDrop: 肩付け内側を SVG 基準で固定し、dSh は外側頂点のオチ(dy)中心・水平は弱く
 */
export interface GarmentFlatCmDeformOptions {
  useShoulderSlopeDistribution?: boolean;
  useShoulderAnchorDrop?: boolean;
}

/** サイズグレード・ウィジェット・プレビューで共通に使う既定 */
export const GARMENT_FLAT_CM_DEFAULT_DEFORM_OPTIONS: GarmentFlatCmDeformOptions = {
  useShoulderSlopeDistribution: true,
  useShoulderAnchorDrop: true,
};

/** 首寄り固定帯の外側ほど 1（肩山・袖付け）。内側アンカー付近は 0 */
function shoulderOuterInfluenceX(x: number, sideLeft: boolean): number {
  const frac = GARMENT_FLAT_CM_SHOULDER_ANCHOR_INNER_FRAC;
  if (sideLeft) {
    const innerX = CX - (CX - SH_L_X) * frac;
    const span = innerX - SH_L_X;
    if (span <= 1e-6) return 0;
    const u = Math.max(0, Math.min(1, (innerX - x) / span));
    return u * u;
  }
  const innerX = CX + (SH_R_X - CX) * frac;
  const span = SH_R_X - innerX;
  if (span <= 1e-6) return 0;
  const u = Math.max(0, Math.min(1, (x - innerX) / span));
  return u * u;
}

function shoulderSlopeUnit(sideLeft: boolean) {
  return sideLeft ? GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_L : GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_R;
}

function bodyWidthSlopeUnit(sideLeft: boolean) {
  return sideLeft ? GARMENT_FLAT_CM_BODY_WIDTH_SLOPE_UNIT_L : GARMENT_FLAT_CM_BODY_WIDTH_SLOPE_UNIT_R;
}

/** オチ(dy)は肩線付近だけ。下袖まで落とすと袖の見かけ角度が上がる */
function shoulderDropAlongYFade(y: number): number {
  const span = BODY_TOP - SH_Y;
  if (span <= 1e-6 || y <= SH_Y) return 1;
  const u = Math.max(0, Math.min(1, (y - SH_Y) / span));
  const v = 1 - u;
  return v * v;
}

/** 剛体追従の肩2点: 外側ではなく内側アンカー（オチで肩線が傾きすぎない） */
export function garmentFlatCmInnerShoulderAnchorX(
  shoulderLx: number,
  shoulderRx: number
): { lx: number; rx: number } {
  const f = GARMENT_FLAT_CM_SHOULDER_ANCHOR_INNER_FRAC;
  return {
    lx: shoulderLx + (CX - shoulderLx) * f,
    rx: shoulderRx - (shoulderRx - CX) * f,
  };
}

/** 肩幅片側 dSh → 局所 (dx, dy)。アンカー時は内側固定・外側オチ */
function shoulderWidthDelta(
  dSh: number,
  x: number,
  sideLeft: boolean,
  useSlope: boolean,
  useAnchorDrop: boolean,
  y?: number
): [number, number] {
  const tOut = useAnchorDrop ? shoulderOuterInfluenceX(x, sideLeft) : 1;
  if (Math.abs(dSh) < 1e-12 || tOut < 1e-12) return [0, 0];

  const spanK = useAnchorDrop ? GARMENT_FLAT_CM_SHOULDER_SPAN_K : 1;
  const dropK = useAnchorDrop ? GARMENT_FLAT_CM_SHOULDER_DROP_K : 1;
  const dropYFade = y != null && useAnchorDrop ? shoulderDropAlongYFade(y) : 1;

  if (!useSlope) {
    const dx = (sideLeft ? -1 : 1) * dSh * tOut * spanK;
    return [dx, 0];
  }

  const u = shoulderSlopeUnit(sideLeft);
  const mag = dSh * tOut;
  return [mag * u.ux * spanK, mag * u.uy * dropK * dropYFade];
}

/** 肩〜脇（body ゾーン）の変位。袖 path との脇頂点で不連続にならないよう袖側からも参照する */
function bodyZoneDelta(
  x: number,
  y: number,
  dSh: number,
  dBw: number,
  dBl: number,
  options: GarmentFlatCmDeformOptions | undefined
): [number, number] {
  const useSlope = options?.useShoulderSlopeDistribution === true;
  const useAnchorDrop = options?.useShoulderAnchorDrop === true;

  const BLEND_TOP = SH_Y;
  const BLEND_BOT = BODY_TOP;
  const tyBlend = Math.max(0, Math.min(1, (y - BLEND_TOP) / (BLEND_BOT - BLEND_TOP)));

  const half = x <= CX ? CX - BDY_L_X : BDY_R_X - CX;
  const distFromCX = x - CX;
  const t = half > 0 ? Math.min(1, Math.abs(distFromCX) / half) : 0;
  const sideLeft = distFromCX < 0;
  const sign = sideLeft ? -1 : 1;
  const tSh = useAnchorDrop ? shoulderOuterInfluenceX(x, sideLeft) : 1;
  const bodySpanK = useAnchorDrop ? GARMENT_FLAT_CM_BODY_WIDTH_SPAN_K : 1;

  let dx = 0;
  let dy = 0;

  if (useSlope) {
    const uSh = shoulderSlopeUnit(sideLeft);
    const uBw = bodyWidthSlopeUnit(sideLeft);
    const shoulderInfluence = (1 - tyBlend) * tSh;
    const bodyWidthInfluence = tyBlend;

    if (y >= BODY_TOP) {
      dx = sign * dBw * Math.abs(uBw.ux) * t * bodySpanK;
      dy = dBw * uBw.uy * t * bodySpanK;
    } else {
      const spanK = useAnchorDrop ? GARMENT_FLAT_CM_SHOULDER_SPAN_K : 1;
      const dropK = useAnchorDrop ? GARMENT_FLAT_CM_SHOULDER_DROP_K : 1;
      const slopeDx =
        dSh * Math.abs(uSh.ux) * t * shoulderInfluence * spanK +
        dBw * Math.abs(uBw.ux) * t * bodyWidthInfluence * bodySpanK;
      dx = sign * slopeDx;
      dy =
        dSh * uSh.uy * shoulderInfluence * dropK * shoulderDropAlongYFade(y) +
        dBw * uBw.uy * bodyWidthInfluence * bodySpanK;
    }
  } else {
    const shMag = useAnchorDrop ? dSh * tSh * GARMENT_FLAT_CM_SHOULDER_SPAN_K : dSh * (1 - tyBlend);
    const bwMag = dBw * tyBlend * bodySpanK;
    const mag = shMag + bwMag;
    dx = distFromCX >= 0 ? mag * t : -mag * t;
    dy = 0;
    if (useAnchorDrop && tyBlend < 1) {
      dy =
        dSh *
        tSh *
        GARMENT_FLAT_CM_SHOULDER_DROP_K *
        shoulderSlopeUnit(sideLeft).uy *
        shoulderDropAlongYFade(y);
    }
  }

  if (y >= BODY_TOP) {
    const ty = BODY_BOT - BODY_TOP > 0 ? Math.min(1, (y - BODY_TOP) / (BODY_BOT - BODY_TOP)) : 0;
    dy += dBl * ty;
  }

  return [dx, dy];
}

/** 袖 path 上の点の、肩付けからの折れ線沿い長さ（S 基準 verts） */
function sleeveArcLengthFromShoulder(
  x: number,
  y: number,
  verts: ReadonlyArray<readonly [number, number]>
): number {
  if (verts.length < 2) return 0;
  let best = 0;
  let bestDist2 = Infinity;
  let cum = 0;
  for (let i = 0; i < verts.length - 1; i += 1) {
    const [x0, y0] = verts[i]!;
    const [x1, y1] = verts[i + 1]!;
    const segLen = Math.hypot(x1 - x0, y1 - y0);
    const vx = x1 - x0;
    const vy = y1 - y0;
    const segLen2 = vx * vx + vy * vy || 1e-12;
    let t = ((x - x0) * vx + (y - y0) * vy) / segLen2;
    t = Math.max(0, Math.min(1, t));
    const px = x0 + t * vx;
    const py = y0 + t * vy;
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      best = cum + t * segLen;
    }
    cum += segLen;
  }
  return best;
}

function sleevePolylineTotalLength(verts: ReadonlyArray<readonly [number, number]>): number {
  let len = 0;
  for (let i = 0; i < verts.length - 1; i += 1) {
    const [x0, y0] = verts[i]!;
    const [x1, y1] = verts[i + 1]!;
    len += Math.hypot(x1 - x0, y1 - y0);
  }
  return len;
}

/** 袖丈 dSleeveLengthPx を肩→袖口の折れ線方向へ（従来未適用だった） */
function sleeveLengthDeltaAlongAxis(
  x: number,
  y: number,
  sideLeft: boolean,
  dSleeveLengthPx: number
): [number, number] {
  if (Math.abs(dSleeveLengthPx) < 1e-12) return [0, 0];
  const verts = sideLeft ? MEASURE_SLEEVE_L_VERTS : MEASURE_SLEEVE_R_VERTS;
  const total = sleevePolylineTotalLength(verts);
  if (total < 1e-6) return [0, 0];
  const along = sleeveArcLengthFromShoulder(x, y, verts);
  const t = Math.max(0, Math.min(1, along / total));
  const [sx, sy] = verts[0]!;
  const [ex, ey] = verts[verts.length - 1]!;
  const ux = (ex - sx) / total;
  const uy = (ey - sy) / total;
  const mag = dSleeveLengthPx * t;
  return [ux * mag, uy * mag];
}

/**
 * 下袖〜脇: 袖ゾーンは dSh のみ・胴は dBw 主体で変形が割れるため角が立つ。
 * 肩線高さから身幅計測高さへ、袖 path の変位を胴ゾーンへブレンドする。
 */
function sleeveZoneDelta(
  x: number,
  y: number,
  sideLeft: boolean,
  dSh: number,
  dBw: number,
  dBl: number,
  dSleeveLengthPx: number,
  options: GarmentFlatCmDeformOptions | undefined
): [number, number] {
  const useSlope = options?.useShoulderSlopeDistribution === true;
  const useAnchorDrop = options?.useShoulderAnchorDrop === true;

  /** 袖 path は肩付けのオチを維持（y フェードは胴側のみ） */
  const [dxSh, dySh] = shoulderWidthDelta(dSh, x, sideLeft, useSlope, useAnchorDrop, SH_Y);
  const [dxSl, dySl] = sleeveLengthDeltaAlongAxis(x, y, sideLeft, dSleeveLengthPx);

  let dx = dxSh + dxSl;
  let dy = dySh + dySl;

  const span = BODY_TOP - SH_Y;
  if (span <= 1e-6 || y <= SH_Y) return [dx, dy];

  const u = Math.max(0, Math.min(1, (y - SH_Y) / span));
  const w = u * u;
  if (w < 1e-6) return [dx, dy];

  const [dxBd, dyBd] = bodyZoneDelta(x, y, dSh, dBw, dBl, options);
  const dyBlend = GARMENT_FLAT_CM_SLEEVE_BODY_DY_BLEND;
  dx += w * (dxBd - dxSh);
  dy += w * dyBlend * (dyBd - dySh);
  return [dx, dy];
}

function getDelta(
  x: number,
  y: number,
  zone: GarmentFlatCmZone,
  dSh: number,
  dBw: number,
  dBl: number,
  dSleeveLengthPx: number,
  options?: GarmentFlatCmDeformOptions
): [number, number] {
  let dx = 0;
  let dy = 0;
  const useSlope = options?.useShoulderSlopeDistribution === true;

  if (zone === "sleeve_L") {
    if (x > SH_L_X) {
      return bodyZoneDelta(x, y, dSh, dBw, dBl, options);
    }
    [dx, dy] = sleeveZoneDelta(x, y, true, dSh, dBw, dBl, dSleeveLengthPx, options);
  } else if (zone === "sleeve_R") {
    if (x < SH_R_X) {
      return bodyZoneDelta(x, y, dSh, dBw, dBl, options);
    }
    [dx, dy] = sleeveZoneDelta(x, y, false, dSh, dBw, dBl, dSleeveLengthPx, options);
  } else if (zone === "body") {
    [dx, dy] = bodyZoneDelta(x, y, dSh, dBw, dBl, options);
  } else if (zone === "collar") {
    const t = CX - BDY_L_X > 0 ? Math.min(1, Math.abs(x - CX) / (CX - BDY_L_X)) : 0;
    const sideLeft = x - CX < 0;
    const bwScale = 0.3;
    const bodySpanK = options?.useShoulderAnchorDrop === true ? GARMENT_FLAT_CM_BODY_WIDTH_SPAN_K : 1;
    if (useSlope) {
      const u = bodyWidthSlopeUnit(sideLeft);
      const mag = dBw * t * bwScale * bodySpanK;
      dx = mag * u.ux;
      dy = mag * u.uy;
    } else {
      dx = x - CX >= 0 ? dBw * t * bwScale * bodySpanK : -dBw * t * bwScale * bodySpanK;
      dy = 0;
    }
  } else if (zone === "button_L") {
    const bwScale = 0.05;
    const bodySpanK = options?.useShoulderAnchorDrop === true ? GARMENT_FLAT_CM_BODY_WIDTH_SPAN_K : 1;
    if (useSlope) {
      const u = bodyWidthSlopeUnit(true);
      dx = dBw * bwScale * bodySpanK * u.ux;
      dy = dBw * bwScale * bodySpanK * u.uy;
    } else {
      dx = -dBw * bwScale * bodySpanK;
      dy = 0;
    }
    if (y >= BODY_TOP) {
      const ty = Math.min(1, (y - BODY_TOP) / (BODY_BOT - BODY_TOP));
      dy += dBl * ty;
    }
  } else if (zone === "button_R") {
    const bwScale = 0.05;
    const bodySpanK = options?.useShoulderAnchorDrop === true ? GARMENT_FLAT_CM_BODY_WIDTH_SPAN_K : 1;
    if (useSlope) {
      const u = bodyWidthSlopeUnit(false);
      dx = dBw * bwScale * bodySpanK * u.ux;
      dy = dBw * bwScale * bodySpanK * u.uy;
    } else {
      dx = dBw * bwScale * bodySpanK;
      dy = 0;
    }
    if (y >= BODY_TOP) {
      const ty = Math.min(1, (y - BODY_TOP) / (BODY_BOT - BODY_TOP));
      dy += dBl * ty;
    }
  }

  return [dx, dy];
}

export function flatCmGarmentPointDelta(
  x: number,
  y: number,
  zone: GarmentFlatCmZone,
  dSh: number,
  dBw: number,
  dBl: number,
  dSleeveLengthPx: number,
  options?: GarmentFlatCmDeformOptions
): [number, number] {
  return getDelta(x, y, zone, dSh, dBw, dBl, dSleeveLengthPx, options);
}

export function rewriteFlatCmGarmentPath(
  d: string,
  zone: GarmentFlatCmZone,
  dSh: number,
  dBw: number,
  dBl: number,
  dSleeveLengthPx: number,
  options?: GarmentFlatCmDeformOptions
): string {
  const tokens = tokenize(d);
  const out: string[] = [];
  let i = 0;
  let cmd = "M";
  let cx = 0;
  let cy = 0;

  while (i < tokens.length) {
    const t = tokens[i];
    const isCmd = /^[MmLlHhVvZzCcSsQqTtAa]$/.test(t);

    if (isCmd) {
      cmd = t;
      out.push(t);
      i += 1;
      continue;
    }

    const upper = cmd.toUpperCase();

    if (upper === "M" || upper === "L") {
      const x = parseFloat(tokens[i]);
      const y = parseFloat(tokens[i + 1]);
      const [dx, dy] = getDelta(x, y, zone, dSh, dBw, dBl, dSleeveLengthPx, options);
      out.push(String(fmt(x + dx)));
      out.push(String(fmt(y + dy)));
      cx = x;
      cy = y;
      i += 2;
    } else if (upper === "H") {
      const x = parseFloat(tokens[i]);
      const [dx] = getDelta(x, cy, zone, dSh, dBw, dBl, dSleeveLengthPx, options);
      out.push(String(fmt(x + dx)));
      cx = x;
      i += 1;
    } else if (upper === "V") {
      const y = parseFloat(tokens[i]);
      const [, dy] = getDelta(cx, y, zone, dSh, dBw, dBl, dSleeveLengthPx, options);
      out.push(String(fmt(y + dy)));
      cy = y;
      i += 1;
    } else if (upper === "C") {
      for (let k = 0; k < 3; k += 1) {
        const x = parseFloat(tokens[i]);
        const y = parseFloat(tokens[i + 1]);
        const [dx, dy] = getDelta(x, y, zone, dSh, dBw, dBl, dSleeveLengthPx, options);
        out.push(String(fmt(x + dx)));
        out.push(String(fmt(y + dy)));
        i += 2;
      }
      cx = parseFloat(tokens[i - 2]);
      cy = parseFloat(tokens[i - 1]);
    } else if (upper === "Z") {
      i += 1;
    } else {
      out.push(tokens[i]);
      i += 1;
    }
  }

  return out.join(" ");
}

export function flatCmMeasureLineAttrs(
  dSh: number,
  dBw: number,
  dBl: number,
  dSleeveLengthPx: number,
  options: GarmentFlatCmDeformOptions = GARMENT_FLAT_CM_DEFAULT_DEFORM_OPTIONS
): {
  shoulder: { x1: string; x2: string; y1: string; y2: string };
  bodyWidth: { x1: string; x2: string; y1: string; y2: string };
  bodyLength: { x1: string; y1: string; x2: string; y2: string };
  sleeveL: { d: string };
  sleeveR: { d: string };
} {
  const useAnchorDrop = options.useShoulderAnchorDrop === true;
  const spanDx = dSh * (useAnchorDrop ? GARMENT_FLAT_CM_SHOULDER_SPAN_K : 1);
  const dropDy =
    useAnchorDrop && options.useShoulderSlopeDistribution
      ? dSh * GARMENT_FLAT_CM_SHOULDER_DROP_K * GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_L.uy
      : 0;

  return {
    shoulder: {
      x1: String(fmt(SH_L_X - spanDx)),
      x2: String(fmt(SH_R_X + spanDx)),
      y1: String(fmt(SH_Y + dropDy)),
      y2: String(fmt(SH_Y + dropDy)),
    },
    bodyWidth: {
      x1: String(fmt(BDY_L_X - dBw)),
      x2: String(fmt(BDY_R_X + dBw)),
      y1: "157.501",
      y2: "157.501",
    },
    bodyLength: {
      x1: "194.375",
      y1: String(fmt(MEASURE_BODY_LENGTH_Y1 + dBl)),
      x2: "194.375",
      y2: String(MEASURE_BODY_LENGTH_Y2),
    },
    sleeveL: {
      d: rewriteFlatCmGarmentPath(
        MEASURE_SLEEVE_L_PATH_D,
        "sleeve_L",
        dSh,
        dBw,
        dBl,
        dSleeveLengthPx,
        options
      ),
    },
    sleeveR: {
      d: rewriteFlatCmGarmentPath(
        MEASURE_SLEEVE_R_PATH_D,
        "sleeve_R",
        dSh,
        dBw,
        dBl,
        dSleeveLengthPx,
        options
      ),
    },
  };
}
