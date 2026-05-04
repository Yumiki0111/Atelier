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
  type GradingV4GarmentZone,
  SH_L_X,
  SH_R_X,
  SH_Y,
} from "./gradingV4Constants";
import { sleeveLengthStrainOffset } from "./gradingV4SleeveStrain";

function getDelta(
  x: number,
  y: number,
  zone: GradingV4GarmentZone,
  dSh: number,
  dBw: number,
  dBl: number,
  dSleeveLengthPx: number
): [number, number] {
  let dx = 0;
  let dy = 0;
  let z: GradingV4GarmentZone | "body" = zone;

  if (zone === "sleeve_L") {
    if (x > SH_L_X) {
      z = "body";
      return getDelta(x, y, z, dSh, dBw, dBl, dSleeveLengthPx);
    }
    const [lsx, lsy] = sleeveLengthStrainOffset(x, y, dSleeveLengthPx, "L");
    dx = -dSh + lsx;
    dy = lsy;
  } else if (zone === "sleeve_R") {
    if (x < SH_R_X) {
      z = "body";
      return getDelta(x, y, z, dSh, dBw, dBl, dSleeveLengthPx);
    }
    const [rsx, rsy] = sleeveLengthStrainOffset(x, y, dSleeveLengthPx, "R");
    dx = dSh + rsx;
    dy = rsy;
  } else if (zone === "body") {
    const BLEND_TOP = SH_Y;
    const BLEND_BOT = BODY_TOP;
    const tyBlend = Math.max(0, Math.min(1, (y - BLEND_TOP) / (BLEND_BOT - BLEND_TOP)));
    const effectiveDw = dSh * (1 - tyBlend) + dBw * tyBlend;

    const half = x <= CX ? CX - BDY_L_X : BDY_R_X - CX;
    const distFromCX = x - CX;
    const t = half > 0 ? Math.min(1, Math.abs(distFromCX) / half) : 0;
    dx = distFromCX >= 0 ? effectiveDw * t : -effectiveDw * t;

    if (y >= BODY_TOP) {
      const ty =
        BODY_BOT - BODY_TOP > 0 ? Math.min(1, (y - BODY_TOP) / (BODY_BOT - BODY_TOP)) : 0;
      dy = dBl * ty;
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

export function gradingV4GarmentPointDelta(
  x: number,
  y: number,
  zone: GradingV4GarmentZone,
  dSh: number,
  dBw: number,
  dBl: number,
  dSleeveLengthPx: number
): [number, number] {
  return getDelta(x, y, zone, dSh, dBw, dBl, dSleeveLengthPx);
}

export function rewriteGradingV4GarmentPath(
  d: string,
  zone: GradingV4GarmentZone,
  dSh: number,
  dBw: number,
  dBl: number,
  dSleeveLengthPx: number
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
      const [dx, dy] = getDelta(x, y, zone, dSh, dBw, dBl, dSleeveLengthPx);
      out.push(String(fmt(x + dx)));
      out.push(String(fmt(y + dy)));
      cx = x;
      cy = y;
      i += 2;
    } else if (upper === "H") {
      const x = parseFloat(tokens[i]);
      const [dx] = getDelta(x, cy, zone, dSh, dBw, dBl, dSleeveLengthPx);
      out.push(String(fmt(x + dx)));
      cx = x;
      i += 1;
    } else if (upper === "V") {
      const y = parseFloat(tokens[i]);
      const [, dy] = getDelta(cx, y, zone, dSh, dBw, dBl, dSleeveLengthPx);
      out.push(String(fmt(y + dy)));
      cy = y;
      i += 1;
    } else if (upper === "C") {
      for (let k = 0; k < 3; k += 1) {
        const x = parseFloat(tokens[i]);
        const y = parseFloat(tokens[i + 1]);
        const [dx, dy] = getDelta(x, y, zone, dSh, dBw, dBl, dSleeveLengthPx);
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

export function gradingV4MeasureLineAttrs(
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
      d: rewriteGradingV4GarmentPath(
        MEASURE_SLEEVE_L_PATH_D,
        "sleeve_L",
        dSh,
        dBw,
        dBl,
        dSleeveLengthPx
      ),
    },
    sleeveR: {
      d: rewriteGradingV4GarmentPath(
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
