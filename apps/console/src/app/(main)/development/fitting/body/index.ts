export { getBodyParams } from "./bodyParams";
export { getZones, getAnchorYOffset, getZonesAnchored } from "./bodyZones";
export { getBodyOutlineHalfW, armOutlineX } from "./bodyOutlineSample";
export {
  warp,
  bodyHeight,
  torsoLateralSpreadFactor,
  torsoXFactor,
  blendDeformedWithIndentWarpRelief,
  buildIndentWaistPolylines,
  type WarpOptions,
  type IndentWaistPolylines,
} from "./bodyWarp";
export {
  getInterpolatedArmOutline,
  getWarpedArmAngles,
  warpArmOutline,
  BASE_THETA_L,
  BASE_THETA_R,
  getDeltaThetas,
  getSkinnedVertex,
  warpArmOutlineAlongArm,
  warpArmOutlineAlongRefFixedAxis,
  type ShoulderWarpFromTemplateFn,
} from "./armWarp";
