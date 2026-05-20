import { tokenize, round10 as fmt } from "../svgPath/tokenize";
import {
  BDY_L_X,
  BDY_R_X,
  BODY_BOT,
  BODY_TOP,
  CX,
  MEASURE_BODY_LENGTH_Y1,
  MEASURE_BODY_LENGTH_Y2,
  MEASURE_SLEEVE_L_PATH_D,
  MEASURE_SLEEVE_R_PATH_D,
  type GarmentFlatCmZone,
  SH_L_X,
  SH_R_X,
  SH_Y,
} from "./garmentFlatCmGradingConstants";
/**
 * 肩スロープ単位ベクトル。元は `./garmentFlatCmShoulderSlope` から import していたが、
 * 同モジュールはユーザー判断で削除済み。`uy = 0`（真横）の no-op に置き換え、
 * `useShoulderSlopeDistribution` を有効化しても従来の水平方向のみの分配と等価になる。
 */
const GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_L = { ux: -1, uy: 0 } as const;
const GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_R = { ux: 1, uy: 0 } as const;

/**
 * 平置き cm の局所変形オプション。
 * - useShoulderSlopeDistribution: 肩幅 dSh を真横ではなく肩スロープ単位ベクトル方向（斜め下）へ分配
 *   （フェーズ2: 「実際に着ると肩に追従して落ちる」見え方を再現）
 */
export interface GarmentFlatCmDeformOptions {
  useShoulderSlopeDistribution?: boolean;
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
  let z: GarmentFlatCmZone | "body" = zone;
  const useSlope = options?.useShoulderSlopeDistribution === true;
  /**
   * 「左半身か右半身か」を判定する: x <= CX なら左、それ以外は右。
   * 肩スロープ単位ベクトル `(ux, uy)` は左右で `ux` の符号が反転（外側方向）し、`uy` は両側 +Y（下方向）。
   */
  const slopeUnit = (sideLeft: boolean) =>
    sideLeft ? GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_L : GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_R;

  if (zone === "sleeve_L") {
    if (x > SH_L_X) {
      z = "body";
      return getDelta(x, y, z, dSh, dBw, dBl, dSleeveLengthPx, options);
    }
    if (useSlope) {
      const u = slopeUnit(true);
      // dSh は「肩幅変化 px の片側」相当。これを左肩スロープ方向へ符号付きで投影。
      // 既存挙動 (`dx = -dSh`) は `u.ux ≈ -0.925` でほぼ等価、加えて `dy = +dSh * uy` が「肩を下に落とす」。
      dx = dSh * u.ux;
      dy = dSh * u.uy;
    } else {
      dx = -dSh;
      dy = 0;
    }
  } else if (zone === "sleeve_R") {
    if (x < SH_R_X) {
      z = "body";
      return getDelta(x, y, z, dSh, dBw, dBl, dSleeveLengthPx, options);
    }
    if (useSlope) {
      const u = slopeUnit(false);
      dx = dSh * u.ux;
      dy = dSh * u.uy;
    } else {
      dx = dSh;
      dy = 0;
    }
  } else if (zone === "body") {
    const BLEND_TOP = SH_Y;
    const BLEND_BOT = BODY_TOP;
    const tyBlend = Math.max(0, Math.min(1, (y - BLEND_TOP) / (BLEND_BOT - BLEND_TOP)));
    const effectiveDw = dSh * (1 - tyBlend) + dBw * tyBlend;

    const half = x <= CX ? CX - BDY_L_X : BDY_R_X - CX;
    const distFromCX = x - CX;
    const t = half > 0 ? Math.min(1, Math.abs(distFromCX) / half) : 0;
    const sideLeft = distFromCX < 0;
    if (useSlope) {
      /**
       * 胴ブレンド領域（y in [SH_Y, BODY_TOP]）は肩寄りほど tyBlend≈0 で `dSh` 主体。
       * その帯では肩スロープ方向の `(ux, uy)` を、肩→胴へ移るほど水平へなだらかに減衰させる:
       *   shoulderInfluence = (1 - tyBlend)  // 肩に近いほど 1
       *   dx_slope = dSh * ux * shoulderInfluence
       *   dy_slope = dSh * uy * shoulderInfluence
       * その上に従来の水平ブレンド `effectiveDw * sign * t * tyBlend` を残し、
       * 胴下方では従来挙動（純水平）と一致させる。
       */
      const u = slopeUnit(sideLeft);
      const shoulderInfluence = 1 - tyBlend;
      const horizontalBody = effectiveDw * t * tyBlend;
      const slopeDx = dSh * Math.abs(u.ux) * t * shoulderInfluence; // 肩寄りでは dSh が水平に効く（sign は下で付与）
      dx = (sideLeft ? -1 : 1) * (slopeDx + horizontalBody);
      dy = dSh * u.uy * shoulderInfluence; // 肩寄りほど下へ落ちる
    } else {
      dx = distFromCX >= 0 ? effectiveDw * t : -effectiveDw * t;
      dy = 0;
    }

    if (y >= BODY_TOP) {
      const ty =
        BODY_BOT - BODY_TOP > 0 ? Math.min(1, (y - BODY_TOP) / (BODY_BOT - BODY_TOP)) : 0;
      dy += dBl * ty;
    }
  } else if (zone === "collar") {
    const t = CX - BDY_L_X > 0 ? Math.min(1, Math.abs(x - CX) / (CX - BDY_L_X)) : 0;
    dx = x - CX >= 0 ? dBw * t * 0.3 : -dBw * t * 0.3;
    dy = 0;
  } else if (zone === "button_L") {
    dx = -dBw * 0.05;
    if (y >= BODY_TOP) {
      const ty = Math.min(1, (y - BODY_TOP) / (BODY_BOT - BODY_TOP));
      dy = dBl * ty;
    }
  } else if (zone === "button_R") {
    dx = dBw * 0.05;
    if (y >= BODY_TOP) {
      const ty = Math.min(1, (y - BODY_TOP) / (BODY_BOT - BODY_TOP));
      dy = dBl * ty;
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
  dSleeveLengthPx: number
): {
  shoulder: { x1: string; x2: string; y1: string; y2: string };
  bodyWidth: { x1: string; x2: string; y1: string; y2: string };
  bodyLength: { x1: string; y1: string; x2: string; y2: string };
  sleeveL: { d: string };
  sleeveR: { d: string };
} {
  return {
    shoulder: {
      x1: String(fmt(SH_L_X - dSh)),
      x2: String(fmt(SH_R_X + dSh)),
      y1: "103.501",
      y2: "103.501",
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
        dSleeveLengthPx
      ),
    },
    sleeveR: {
      d: rewriteFlatCmGarmentPath(
        MEASURE_SLEEVE_R_PATH_D,
        "sleeve_R",
        dSh,
        dBw,
        dBl,
        dSleeveLengthPx
      ),
    },
  };
}
