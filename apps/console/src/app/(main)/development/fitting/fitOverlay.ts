import { BODY_CX, SIZES, BASE_SHOULDER_HALF } from "./constants";
import { getBodyParams, getZonesAnchored, getBodyOutlineHalfW } from "./bodyUtils";

const STEP = 25;
const TOL = STEP * 1.2;
const H2 = STEP * 0.9;
const MIN_GAP = 8;

export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function parsePathPoints(d: string): [number, number][] {
  const pts: [number, number][] = [];
  const re = /[ML](-?[\d.]+)\s+(-?[\d.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    pts.push([+m[1], +m[2]]);
  }
  return pts;
}

export function getOverlayRects(
  shirtPathD: string,
  h: number,
  w: number,
  currentSize: string
): OverlayRect[] {
  const { yScale, xScale } = getBodyParams(h, w);
  const zones = getZonesAnchored(yScale);
  const bodyShoulderY = zones.shoulder;
  const B = (BASE_SHOULDER_HALF * 2) / SIZES["48"].shoulder;
  const size = SIZES[currentSize] ?? SIZES["48"];
  const bodyHemY = bodyShoulderY + size.length * B;
  const shirtPts = parsePathPoints(shirtPathD);
  const rects: OverlayRect[] = [];

  for (
    let bodyY = bodyShoulderY + 20;
    bodyY < bodyHemY - 10;
    bodyY += STEP
  ) {
    const baseHalfW = getBodyOutlineHalfW(bodyY, yScale);
    if (!baseHalfW) continue;
    const bodyHalfW = baseHalfW * (1 + (xScale - 1) * 0.7);
    const bodyLX = BODY_CX - bodyHalfW;
    const bodyRX = BODY_CX + bodyHalfW;
    const near = shirtPts.filter(([, y]) => Math.abs(y - bodyY) < TOL);
    if (near.length < 2) continue;
    const leftPts = near.filter(([x]) => x < BODY_CX);
    const rightPts = near.filter(([x]) => x > BODY_CX);
    if (!leftPts.length || !rightPts.length) continue;
    const shirtLX = Math.max(...leftPts.map(([x]) => x));
    const shirtRX = Math.min(...rightPts.map(([x]) => x));

    if (bodyLX < shirtLX - MIN_GAP) {
      rects.push({
        x: bodyLX,
        y: bodyY - H2 / 2,
        width: shirtLX - bodyLX,
        height: H2,
      });
    }
    if (bodyRX > shirtRX + MIN_GAP) {
      rects.push({
        x: shirtRX,
        y: bodyY - H2 / 2,
        width: bodyRX - shirtRX,
        height: H2,
      });
    }
  }
  return rects;
}
