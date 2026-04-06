/**
 * 開発用: サイズプリセット追加／適用、または商品DB登録成功時に、
 * **その服で袖採寸・袖スケールのどれが有効か**だけを console に出す。本番では no-op。
 */

import type { CustomGarmentData, JacketSize, ShirtSize } from "@/app/(main)/development/fitting/lib/types";
import {
  genericMeasureOnlyGradingActive,
  genericSymmetricTopCanvasSleeveSnapEligible,
  isLikelyVerticalSymmetryGuidePath,
  isNearlyVerticalThinPath,
  isVerticalCenterSpinePath,
  resolveEffectiveSleeveGradingGeometry,
  type EffectiveSleeveGradingGeometry,
} from "@/app/(main)/development/fitting/generic";
import { resolveLowerSleeveGlobalsOntoSleevePath } from "@/app/(main)/development/fitting/generic/genericMeasureOnlySleeveFollowArgs";
import {
  previewLowerSleeveSeamOnPathSnapshot,
  type LowerSleeveSeamPathPreview,
  type LowerSleeveSeamRunStats,
} from "@/app/(main)/development/fitting/generic/genericMeasureOnlyLowerSleeveSnap";
import { cumulativePathPointOffsets } from "@/app/(main)/development/fitting/lib/pathUtils";

export type DevFitPipelineLogAction = "addPreset" | "activatePreset" | "productDbRegister";

function distinctVertexPair(a: unknown, b: unknown): boolean {
  return (
    typeof a === "number" &&
    typeof b === "number" &&
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    a !== b
  );
}

function primarySleeveCanvasScaleLabel(
  eff: EffectiveSleeveGradingGeometry | null,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): string {
  if (!distinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd)) {
    return "なし（プライマリ袖 始点/終点が未設定）";
  }
  if (!eff) {
    return "なし（採寸 min/max が単一 path に収まらない、または袖チェーンが別 path を跨ぐ）";
  }
  return `あり（1 path: index ${eff.sleevePathIdx}。採寸頂点の所属 path のみ Y スケール。build・キャンバス後段共通）`;
}

/** 採寸が乗っている path が構築線っぽいとき、外腕に採寸を移すよう促す（推測で path は変えない） */
function sleeveScalePathAdvisory(
  pathDs: string[],
  landmarks: CustomGarmentData["landmarks"],
  eff: EffectiveSleeveGradingGeometry | null
): string {
  if (!eff) return "（Y スケール対象 path なし）";
  const d = pathDs[eff.sleevePathIdx];
  if (!d) return "Y スケール index の path が無い";
  if (isLikelyVerticalSymmetryGuidePath(d, landmarks, pathDs)) {
    return "採寸が縦センターガイドっぽい path 上です。Y スケールはこの線だけ動き外腕輪郭は動きません（見た目が大きくズレます）。袖丈採寸の # を左外腕の輪郭 path 上に付け替えてください。";
  }
  if (isNearlyVerticalThinPath(d)) {
    return "採寸が細い縦 path（構築線の可能性）上です。上記と同様に、採寸 # を外腕輪郭 path に付け替えてください。";
  }
  if (isVerticalCenterSpinePath(d, landmarks, pathDs)) {
    return "採寸が前中心スパイン（構築線）上です。上記と同様に、採寸 # を外腕輪郭 path に付け替えてください。";
  }
  return "なし（採寸 path は構築線判定を通過。それでもズレる場合は下袖区間・胴合わせ先 #・袖 path を確認）";
}

function mirrorSleeveMeasureLabel(gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>): string {
  if (!distinctVertexPair(gt.sleeveMirrorMeasureVertexStart, gt.sleeveMirrorMeasureVertexEnd)) {
    return "なし";
  }
  const chain = gt.sleeveMirrorMeasureVertexChain;
  if (chain != null && chain.length >= 2) {
    return `あり（チェーン ${chain.length} 頂点・オーバーレイ採寸。キャンバス袖スケールはプライマリのみ）`;
  }
  return "あり（端点ペア・オーバーレイ採寸。キャンバス袖スケールはプライマリのみ）";
}

function primarySleeveMeasureLabel(gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>): string {
  if (!distinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd)) {
    return "なし";
  }
  const chain = gt.sleeveMeasureVertexChain;
  if (chain != null && chain.length >= 2) {
    return `あり（チェーン ${chain.length} 頂点・縦|Δy| 合算）`;
  }
  return "あり（端点ペア・|Δy|）";
}

function lowerSleeveRangeLabel(gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>): string {
  if (!distinctVertexPair(gt.lowerSleeveVertexStart, gt.lowerSleeveVertexEnd)) {
    return "なし（寄せ先ポリラインは袖 path 全体にフォールバック）";
  }
  const a = Math.trunc(gt.lowerSleeveVertexStart!);
  const b = Math.trunc(gt.lowerSleeveVertexEnd!);
  return `あり #${Math.min(a, b)}〜#${Math.max(a, b)}`;
}

function buildLowerSleeveSeamOneLineSummary(
  stats: LowerSleeveSeamRunStats,
  moved: number[],
  sleevePathIdx: number
): string {
  const parts: string[] = [];
  if (stats.skipReason && stats.sleeveVerticesTranslated === 0 && moved.length === 0) {
    parts.push(stats.skipReason);
  } else {
    if (stats.snapTargetBodyGlobal != null) {
      const src =
        stats.snapTargetSource === "auto_nearest_body"
          ? "自動・最近傍胴"
          : stats.snapTargetSource === "legacy_linked"
            ? "旧連結リスト"
            : "";
      parts.push(`合わせ先胴#${stats.snapTargetBodyGlobal}${src ? `（${src}）` : ""}（胴は固定）`);
    }
    if (stats.translation && (stats.translation.dx !== 0 || stats.translation.dy !== 0)) {
      parts.push(
        `袖口方向に最大 Δx=${stats.translation.dx.toFixed(2)} Δy=${stats.translation.dy.toFixed(2)}（付け根は0〜袖口でブレンド）`
      );
    }
    if (stats.sleeveVerticesTranslated > 0) {
      parts.push(`下袖で動いた袖頂点≈${stats.sleeveVerticesTranslated}個`);
    }
  }
  if (moved.length > 0) {
    const head =
      moved.length <= 14 ? moved.join(", ") : `${moved.slice(0, 14).join(", ")}+他${moved.length - 14}`;
    parts.push(`座標が変わった#=[${head}]`);
  }
  if (parts.length === 0) {
    return `この path 試算では移動なし（袖 path index=${sleevePathIdx}）`;
  }
  return parts.join(" ／ ");
}

function formatLowerSleeveSeamPreviewJa(
  preview: LowerSleeveSeamPathPreview,
  sleevePathIdx: number
): Record<string, unknown> {
  const { stats, movedGlobalVertexIndices } = preview;
  const oneLine = buildLowerSleeveSeamOneLineSummary(stats, movedGlobalVertexIndices, sleevePathIdx);
  return {
    要約: oneLine,
    読み方:
      "胴の # は動かさない。下袖区間では**ジャンクション側は据え置き**、**袖口側へ寄せる量を線形に増やして**折れ線を伸ばし、最近点が胴 # に来るようにします（袖 path 全体フォールバック時は剛体移動）。",
    動いた全局番号: movedGlobalVertexIndices,
    内訳: {
      ポリライン頂点数: stats.polyPointCount,
      ポリライン由来: stats.polySource === "lower_sleeve_segment" ? "下袖区間" : "袖 path 全体（フォールバック）",
      合わせ先胴全局番号: stats.snapTargetBodyGlobal,
      合わせ先の決め方: stats.snapTargetSource,
      自動推定時の距離上限px: stats.autoSnapMaxPx,
      袖口側への最大移動量px: stats.translation,
      下袖で実際に動いた袖頂点数: stats.sleeveVerticesTranslated,
      スキップ理由: stats.skipReason,
    },
    注: "本番 build は袖スケール・エルボ追従の後に同じロジックが走ります",
  };
}

function lowerSleeveSeamPreviewOnCurrentPaths(
  pathDs: string[],
  landmarks: CustomGarmentData["landmarks"],
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  effPrimary: EffectiveSleeveGradingGeometry | null
): Record<string, unknown> | string {
  if (!effPrimary) {
    return "スキップ（プライマリ袖 path が未確定。採寸が単一 path に収まっていない等）";
  }
  const low = resolveLowerSleeveGlobalsOntoSleevePath(pathDs, landmarks, effPrimary.sleevePathIdx, gt);
  const off = cumulativePathPointOffsets(pathDs)[effPrimary.sleevePathIdx]!;
  const lengthIdxLo = Math.min(effPrimary.gLo, effPrimary.gHi) - off;
  const lengthIdxHi = Math.max(effPrimary.gLo, effPrimary.gHi) - off;
  const preview = previewLowerSleeveSeamOnPathSnapshot(
    pathDs,
    landmarks,
    gt,
    effPrimary.sleevePathIdx,
    low?.lowGlo,
    low?.lowGhi,
    lengthIdxLo,
    lengthIdxHi
  );
  return formatLowerSleeveSeamPreviewJa(preview, effPrimary.sleevePathIdx);
}

function lowerSleeveSeamConfigSummary(gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>): Record<string, unknown> {
  const legacyLinked = gt.lowerSleeveFollowLinkedGlobalVertices;
  const mirrorLower =
    gt.lowerSleeveMirrorVertexStart != null &&
    gt.lowerSleeveMirrorVertexEnd != null &&
    gt.lowerSleeveMirrorVertexStart !== gt.lowerSleeveMirrorVertexEnd
      ? `${Math.min(gt.lowerSleeveMirrorVertexStart, gt.lowerSleeveMirrorVertexEnd)}–${Math.max(
          gt.lowerSleeveMirrorVertexStart,
          gt.lowerSleeveMirrorVertexEnd
        )}`
      : "（未設定）";
  return {
    下袖区間_プライマリ: lowerSleeveRangeLabel(gt),
    下袖区間_ミラー: mirrorLower,
    脇合わせ先: "自動（旧連結リストの胴 # があれば互換フォールバック）",
    旧_連結リスト_非推奨: legacyLinked?.length ? legacyLinked.join(", ") : "（なし）",
  };
}

/**
 * サイズプリセット操作直後のデータから、袖まわりで有効な経路だけ要約する。
 */
export function logGarmentSleeveMeasureUsage(input: {
  action: DevFitPipelineLogAction;
  customGarmentData: CustomGarmentData;
}): void {
  if (process.env.NODE_ENV === "production") return;

  const { action, customGarmentData } = input;
  const { presetId, pathDs, genericSymmetricTop: gt } = customGarmentData;

  if (presetId !== "genericSymmetricTop" || gt == null) {
    console.info(`[FIT][dev] 袖・採寸の使い分け (${action})`, {
      presetId,
      袖: "汎用トップ以外 — measure-only / キャンバス袖スナップの対象外（コート等は ScalableGarmentSpec 経由）",
    });
    return;
  }

  const effPrimary =
    distinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd)
      ? resolveEffectiveSleeveGradingGeometry(pathDs, customGarmentData.landmarks, gt)
      : null;

  const seamPrev = lowerSleeveSeamPreviewOnCurrentPaths(
    pathDs,
    customGarmentData.landmarks,
    gt,
    effPrimary
  );
  const seamSummaryLine =
    typeof seamPrev === "string" ? seamPrev : String((seamPrev as Record<string, unknown>).要約 ?? "");

  console.info(`[FIT][dev] 袖・採寸の使い分け (${action})`, {
    presetId,
    入力サイズ袖丈cm: customGarmentData.size.sleeve,
    build_applyGenericMeasureOnlyGrading: genericMeasureOnlyGradingActive(gt)
      ? "有効"
      : "無効（汎用トップの採寸頂点が不足）",
    キャンバス袖スナップ候補: genericSymmetricTopCanvasSleeveSnapEligible(gt)
      ? "あり（プライマリまたはミラーに採寸頂点）"
      : "なし",
    プライマリ袖採寸: primarySleeveMeasureLabel(gt),
    プライマリ袖キャンバスYスケール: primarySleeveCanvasScaleLabel(effPrimary, gt),
    Yスケール対象pathの注意: sleeveScalePathAdvisory(pathDs, customGarmentData.landmarks, effPrimary),
    ミラー袖採寸: mirrorSleeveMeasureLabel(gt),
    下袖脇合わせ設定: lowerSleeveSeamConfigSummary(gt),
    下袖脇合わせプレビュー_要約: seamSummaryLine,
    下袖脇合わせプレビュー_現在のpathDs: seamPrev,
    詳細ログ_任意:
      "sessionStorage DEBUG_FITTING_SLEEVE_WELD=1 後リロードで [FITTING_LOWER_SLEEVE_SNAP]",
  });
}

/** @deprecated 互換: 旧名。中身は `logGarmentSleeveMeasureUsage` のみ。 */
export function logDevFitPipelineAfterSizePresetChange(input: {
  action: DevFitPipelineLogAction;
  height: number;
  weight: number;
  shirtSize: ShirtSize;
  jacketSize: JacketSize;
  customGarmentData: CustomGarmentData;
}): void {
  logGarmentSleeveMeasureUsage({
    action: input.action,
    customGarmentData: input.customGarmentData,
  });
}
