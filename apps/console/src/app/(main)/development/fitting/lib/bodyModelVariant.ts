import { BPATHS as BPATHS_MODEL_DEFAULT } from "./modelData";
import { BPATHS_RIG_LINES as BPATHS_RIG_LINES_DEFAULT } from "./modelRigData";
import { BPATHS_VERIFICATION_BODY, BPATHS_VERIFICATION_RIG_LINES } from "./modelDataVerification";

export type BodyModelVariant = "default" | "lineArtVerification";

export function getBodyTemplatePaths(variant: BodyModelVariant | undefined): string[] {
  return variant === "lineArtVerification" ? BPATHS_VERIFICATION_BODY : BPATHS_MODEL_DEFAULT;
}

export function getBodyRigLinePathsTemplate(variant: BodyModelVariant | undefined): string[] {
  return variant === "lineArtVerification" ? BPATHS_VERIFICATION_RIG_LINES : BPATHS_RIG_LINES_DEFAULT;
}
