import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { validateGarmentSpecForProduction } from "@/lib/products/validateGarmentSpecForProduction";
import {
  GRADING_V4_PATH_ZONES,
  GRADING_V4_GARMENT_BACK_LAYER_IDS,
  GRADING_V4_STANDARD_REGISTERED_OUTLINE_PATH_IDS,
} from "@/app/(main)/development/fitting/gradingV4/gradingV4Constants";
import {
  garmentFlatCmToGradeDeltas,
  GRADING_V4_SIZE_FLAT_CM,
  type GradingV4GarmentFlatCm,
} from "@/app/(main)/development/fitting/gradingV4/gradingV4GarmentCm";
import { rewriteGradingV4GarmentPath } from "@/app/(main)/development/fitting/gradingV4/gradingV4GarmentDeform";
import { buildGradingV4StandardBehindBodyFallback } from "@/app/(main)/development/fitting/gradingV4/gradingV4StandardBehindBodyFallback";

import { matchStoredGarmentFlatCmToGradingSize, parseGradingV4SizeKey } from "@/lib/widget-fit/widgetFitGradingSize";

/** ウィジェットで選んだサイズラベルに合わせて平置き cm（Grading v4 カタログ）を反映 */
export function applyWidgetSizeToCustomGarmentData(
  base: CustomGarmentData,
  selectedSize: string
): CustomGarmentData {
  const data = JSON.parse(JSON.stringify(base)) as CustomGarmentData;
  const key =
    parseGradingV4SizeKey(selectedSize) ?? matchStoredGarmentFlatCmToGradingSize(data) ?? "S";
  const flat = GRADING_V4_SIZE_FLAT_CM[key];

  const refFlatCm: GradingV4GarmentFlatCm = {
    shoulder: data.size.shoulder,
    bodyWidth: data.size.chest,
    bodyLength: data.size.length,
    sleeve: data.size.sleeve,
  };

  data.size = {
    shoulder: flat.shoulder,
    chest: flat.bodyWidth,
    length: flat.bodyLength,
    sleeve: flat.sleeve,
  };

  const targetFlatCm: GradingV4GarmentFlatCm = {
    shoulder: flat.shoulder,
    bodyWidth: flat.bodyWidth,
    bodyLength: flat.bodyLength,
    sleeve: flat.sleeve,
  };

  const resolveGradingOutlineIdsForRewrite = (dataPathN: number): readonly string[] | null => {
    const oc = data.gradingV4OutlinePathIds?.length ?? 0;
    if (oc === dataPathN && oc > 0) return data.gradingV4OutlinePathIds!;
    if (dataPathN === GRADING_V4_STANDARD_REGISTERED_OUTLINE_PATH_IDS.length) {
      return GRADING_V4_STANDARD_REGISTERED_OUTLINE_PATH_IDS;
    }
    return null;
  };

  let rewriteStrategy = "none" as "explicit-base" | "legacy-delta" | "none";
  let rewroteBehind = false;
  let syntheticBehindFallbackInjected = false;
  let syntheticBaseBehindSyncedForExplicit = false;

  if (data.presetId === "gradingV4") {
    const outlineIds = resolveGradingOutlineIdsForRewrite(data.pathDs.length);
    const explicitBaseReady =
      Boolean(data.gradingV4OutlinePathIds?.length) &&
      Boolean(data.gradingV4BasePathDs?.length) &&
      data.gradingV4OutlinePathIds!.length === data.gradingV4BasePathDs!.length &&
      data.gradingV4OutlinePathIds!.length === data.pathDs.length;

    const bm = data.bodyModelVariant;
    /** 線画検証のみ除外。試着側は grading v4 で強制的に grid と同系計算になり得るため default であっても補完する */
    const syntheticBehindEligibleBody =
      bm !== "lineArtVerification" && (bm === "gridSvgBody" || bm === "default" || bm == null);
    const shouldInjectStandardBehindFallback =
      syntheticBehindEligibleBody &&
      !(data.gradingV4BehindBody?.pathDs?.length) &&
      data.pathDs.length === GRADING_V4_STANDARD_REGISTERED_OUTLINE_PATH_IDS.length;

    let standardBehindFbPayload: ReturnType<typeof buildGradingV4StandardBehindBodyFallback> | null =
      null;

    if (shouldInjectStandardBehindFallback) {
      standardBehindFbPayload = buildGradingV4StandardBehindBodyFallback();
      data.gradingV4BehindBody = JSON.parse(JSON.stringify(standardBehindFbPayload)) as NonNullable<
        CustomGarmentData["gradingV4BehindBody"]
      >;
      syntheticBehindFallbackInjected = true;
      if (explicitBaseReady && standardBehindFbPayload) {
        data.gradingV4BaseBehindBody = JSON.parse(JSON.stringify(standardBehindFbPayload)) as NonNullable<
          CustomGarmentData["gradingV4BaseBehindBody"]
        >;
        syntheticBaseBehindSyncedForExplicit = true;
      }
      // #region agent log
      fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "47077e" },
        body: JSON.stringify({
          sessionId: "47077e",
          runId: "behind-inject",
          hypothesisId: "H-behind",
          location: "applyWidgetSizeToGarment.ts:syntheticBehindInject",
          message: "injected gradingV4 standard behind body fallback when missing",
          data: {
            bodyModelVariant: bm ?? "(undefined)",
            explicitBaseReady,
            pathDsN: data.pathDs.length,
            behindNAfter: data.gradingV4BehindBody?.pathDs?.length ?? 0,
            baseBehindSynced: syntheticBaseBehindSyncedForExplicit,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }

    if (explicitBaseReady) {
      rewriteStrategy = "explicit-base";
      const { dSh, dBw, dBl, dSleeveLengthPx } = garmentFlatCmToGradeDeltas(targetFlatCm);

      data.pathDs = data.gradingV4OutlinePathIds!.map((pathId, i) => {
        const zone = GRADING_V4_PATH_ZONES[pathId];
        const baseD = data.gradingV4BasePathDs![i];
        if (!zone || baseD == null || baseD.length === 0) {
          return data.pathDs[i] ?? "";
        }
        return rewriteGradingV4GarmentPath(baseD, zone, dSh, dBw, dBl, dSleeveLengthPx);
      });

      const behind = data.gradingV4BehindBody;
      const behindBase = data.gradingV4BaseBehindBody;
      if (
        behind?.pathDs?.length &&
        behindBase?.pathDs?.length === behind.pathDs.length &&
        behind.pathIds?.length === behind.pathDs.length
      ) {
        const prevBehindDs = behind.pathDs.slice();
        behind.pathDs = behind.pathIds.map((pathId, i) => {
          const zone = GRADING_V4_PATH_ZONES[pathId];
          const baseDRow = behindBase.pathDs[i];
          if (!zone || baseDRow == null || baseDRow.length === 0) {
            return prevBehindDs[i] ?? "";
          }
          return rewriteGradingV4GarmentPath(baseDRow, zone, dSh, dBw, dBl, dSleeveLengthPx);
        });
        rewroteBehind = true;
      }
    } else if (outlineIds != null && outlineIds.length === data.pathDs.length) {
      rewriteStrategy = "legacy-delta";
      const { dSh, dBw, dBl, dSleeveLengthPx } = garmentFlatCmToGradeDeltas(targetFlatCm, refFlatCm);

      data.pathDs = outlineIds.map((pathId, i) => {
        const zone = GRADING_V4_PATH_ZONES[pathId];
        const cur = data.pathDs[i];
        if (!zone || cur == null || cur.length === 0) return cur ?? "";
        return rewriteGradingV4GarmentPath(cur, zone, dSh, dBw, dBl, dSleeveLengthPx);
      });

      const behind = data.gradingV4BehindBody;
      const needsStandardBehindRewrite =
        behind?.pathDs &&
        behind.pathDs.length === GRADING_V4_GARMENT_BACK_LAYER_IDS.length &&
        !(data.gradingV4BaseBehindBody?.pathDs?.length === behind.pathDs.length && behind.pathIds?.length === behind.pathDs.length);

      if (needsStandardBehindRewrite) {
        behind.pathDs = GRADING_V4_GARMENT_BACK_LAYER_IDS.map((pathId, i) => {
          const zone = GRADING_V4_PATH_ZONES[pathId];
          const cur = behind.pathDs[i];
          if (!zone || cur == null || cur.length === 0) return cur ?? "";
          return rewriteGradingV4GarmentPath(cur, zone, dSh, dBw, dBl, dSleeveLengthPx);
        });
        rewroteBehind = true;
      }
    }

    // #region agent log
    {
      fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "47077e" },
        body: JSON.stringify({
          sessionId: "47077e",
          runId: "post-fix",
          hypothesisId: "H1-size",
          location: "applyWidgetSizeToGarment.ts:applyWidgetSizeToCustomGarmentData",
          message: "gradingV4 sized + rewrite resolved",
          data: {
            presetId: data.presetId,
            selectedSize,
            resolvedKey: key,
            pathDsN: data.pathDs.length,
            basePathN: data.gradingV4BasePathDs?.length ?? 0,
            outlineIdN: data.gradingV4OutlinePathIds?.length ?? 0,
            behindN: data.gradingV4BehindBody?.pathDs?.length ?? 0,
            baseBehindN: data.gradingV4BaseBehindBody?.pathDs?.length ?? 0,
            behindPathIdsN: data.gradingV4BehindBody?.pathIds?.length ?? 0,
            syntheticBehindFallbackInjected,
            syntheticBaseBehindSyncedForExplicit,
            rewriteStrategy,
            rewroteBehind,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion

    if (rewriteStrategy === "none") {
      // #region agent log
      fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "47077e" },
        body: JSON.stringify({
          sessionId: "47077e",
          runId: "post-fix",
          hypothesisId: "H1-size",
          location: "applyWidgetSizeToGarment.ts:noPathRewrite",
          message: "path rewrite skipped (no usable outline id list)",
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } else {
      // #region agent log
      fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "47077e" },
        body: JSON.stringify({
          sessionId: "47077e",
          runId: "post-fix",
          hypothesisId: "H1-size",
          location: "applyWidgetSizeToGarment.ts:afterRewrite",
          message: rewriteStrategy === "explicit-base" ? "path rewrite applied (base slice)" : "path rewrite applied (legacy delta)",
          data: {
            firstPathHead: data.pathDs[0]?.slice(0, 24) ?? "",
            rewroteBehind,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }
  }

  return data;
}

/**
 * ウィジェット・プレビューで 2D 試着を出せるか。
 */
export function isGarmentSpecRenderable(spec: unknown): spec is CustomGarmentData {
  if (!spec || typeof spec !== "object") return false;
  const p = spec as { pathDs?: unknown };
  if (!Array.isArray(p.pathDs) || p.pathDs.length === 0 || typeof p.pathDs[0] !== "string") {
    return false;
  }
  return validateGarmentSpecForProduction(spec).ok;
}
