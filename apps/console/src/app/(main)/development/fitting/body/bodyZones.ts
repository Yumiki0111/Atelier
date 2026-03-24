import type { BodyZones } from "../lib/types";
import { BZ } from "../lib/constants";

export function getZones(yScale: number): BodyZones {
  const z: Record<string, number> = {};
  for (const [k, v] of Object.entries(BZ)) {
    z[k] = v <= BZ.head_bot ? v : BZ.head_bot + (v - BZ.head_bot) * yScale;
  }
  return z as unknown as BodyZones;
}

/** 身長スケールしても肩ラインを基準Yに固定するためのYオフセット */
export function getAnchorYOffset(yScale: number): number {
  const shoulderScaled = BZ.head_bot + (BZ.shoulder - BZ.head_bot) * yScale;
  const shoulderFixed = BZ.shoulder; // 基準体(170cm)の肩Y
  return shoulderFixed - shoulderScaled;
}

/** 首・肩などのゾーンをアンカー固定（肩Yを基準に平行移動）したものを返す */
export function getZonesAnchored(yScale: number): BodyZones {
  const z = getZones(yScale) as unknown as Record<string, number>;
  const yOff = getAnchorYOffset(yScale);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(z)) {
    out[k] = v <= BZ.head_bot ? v : v + yOff;
  }
  return out as unknown as BodyZones;
}
