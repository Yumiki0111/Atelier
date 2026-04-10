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
  resolveEffectiveMirrorSleeveGradingGeometry,
  resolveEffectiveSleeveGradingGeometry,
  type EffectiveSleeveGradingGeometry,
} from "@/app/(main)/development/fitting/generic";
import {
  resolveLowerSleeveGlobalsOntoSleevePath,
  tryLowerSleeveFollowArgs,
} from "@/app/(main)/development/fitting/generic/genericMeasureOnlySleeveFollowArgs";
import { globalToLocal } from "@/app/(main)/development/fitting/generic/genericMeasureOnlyShared";
import { getPathPoints } from "@/app/(main)/development/fitting/lib/pathUtils";

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
  return `あり（1 path: index ${eff.sleevePathIdx}。キャンバス後段は隣接1辺伸縮＋袖口隣接角維持＋下袖内点の比例 remap（弧長）。build・キャンバス後段共通）`;
}

/** 採寸が乗っている path が構築線っぽいとき、外腕に採寸を移すよう促す（推測で path は変えない） */
function sleeveScalePathAdvisory(
  pathDs: string[],
  landmarks: CustomGarmentData["landmarks"],
  eff: EffectiveSleeveGradingGeometry | null
): string {
  if (!eff) return "（袖 path 未確定）";
  const d = pathDs[eff.sleevePathIdx];
  if (!d) return "袖 path index の path が無い";
  if (isLikelyVerticalSymmetryGuidePath(d, landmarks, pathDs)) {
    return "採寸が縦センターガイドっぽい path 上です。この線だけ動き外腕輪郭は動きません（見た目が大きくズレます）。袖丈採寸の # を左外腕の輪郭 path 上に付け替えてください。";
  }
  if (isNearlyVerticalThinPath(d)) {
    return "採寸が細い縦 path（構築線の可能性）上です。上記と同様に、採寸 # を外腕輪郭 path に付け替えてください。";
  }
  if (isVerticalCenterSpinePath(d, landmarks, pathDs)) {
    return "採寸が前中心スパイン（構築線）上です。上記と同様に、採寸 # を外腕輪郭 path に付け替えてください。";
  }
  return "なし（採寸 path は構築線判定を通過。それでもズレる場合は下袖区間・袖 path を確認）";
}

function mirrorSleeveMeasureLabel(gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>): string {
  if (!distinctVertexPair(gt.sleeveMirrorMeasureVertexStart, gt.sleeveMirrorMeasureVertexEnd)) {
    return "なし";
  }
  const chain = gt.sleeveMirrorMeasureVertexChain;
  if (chain != null && chain.length >= 2) {
    return `あり（チェーン ${chain.length} 頂点・オーバーレイ採寸）`;
  }
  return "あり（端点ペア・オーバーレイ採寸）";
}

function mirrorSleeveCanvasScaleLabel(
  eff: EffectiveSleeveGradingGeometry | null,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): string {
  if (!distinctVertexPair(gt.sleeveMirrorMeasureVertexStart, gt.sleeveMirrorMeasureVertexEnd)) {
    return "なし（ミラー袖 始点/終点が未設定）";
  }
  if (!eff) {
    return "なし（採寸が単一 path に収まらない、またはチェーンが別 path を跨ぐ）";
  }
  return `あり（1 path: index ${eff.sleevePathIdx}。applyGenericSleeveScaleAfterLengthMesh がプライマリと同型で適用）`;
}

function firstEdgePairDevSummary(gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>): {
  プライマリ: string;
  ミラー: string;
} {
  const p = gt.sleeveFirstEdgeGlobalPair;
  const m = gt.sleeveMirrorFirstEdgeGlobalPair;
  return {
    プライマリ:
      p != null && p.length === 2
        ? `明示 #${Math.min(p[0], p[1])}–#${Math.max(p[0], p[1])}（推奨）`
        : "未設定（採寸終端の Y ヒューリスティック）",
    ミラー:
      m != null && m.length === 2
        ? `明示 #${Math.min(m[0], m[1])}–#${Math.max(m[0], m[1])}（推奨）`
        : "未設定（ミラー側も Y ヒューリスティック）",
  };
}

function primarySleeveMeasureLabel(gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>): string {
  if (!distinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd)) {
    return "なし";
  }
  const chain = gt.sleeveMeasureVertexChain;
  const arcT = gt.sleeveMeasureArcTargetChain;
  const hasArcDiff =
    arcT != null &&
    arcT.length >= 2 &&
    (chain == null ||
      chain.length !== arcT.length ||
      chain.some((v, i) => v !== arcT[i]));
  if (chain != null && chain.length >= 2) {
    return hasArcDiff
      ? `あり（表示 ${chain.length} 頂点・目標弧長 ${arcT!.length}）`
      : `あり（チェーン ${chain.length} 頂点・弧長）`;
  }
  if (hasArcDiff) {
    return `あり（端点＋目標弧長 ${arcT!.length} 頂点）`;
  }
  return "あり（端点ペア・弧長）";
}

function lowerSleeveRangeLabel(gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>): string {
  if (!distinctVertexPair(gt.lowerSleeveVertexStart, gt.lowerSleeveVertexEnd)) {
    return "なし（下袖追従は tryLowerSleeveFollowArgs が null のときスキップ）";
  }
  const a = Math.trunc(gt.lowerSleeveVertexStart!);
  const b = Math.trunc(gt.lowerSleeveVertexEnd!);
  const span = Math.abs(b - a) + 1;
  const hint = span <= 2 ? "・長袖は複数頂点に広げるとなめらかになりやすい" : "";
  return `あり #${Math.min(a, b)}〜#${Math.max(a, b)}（${span} 頂点。胴端・ジャンクション固定のうえ下袖弧長を比例 remap${hint}）`;
}

function sleeveLengthIndicesFromMeasureGlobals(
  pathDs: string[],
  sleevePathIdx: number,
  gLo: number,
  gHi: number
): { lengthStartIdx: number; lengthEndIdx: number } | null {
  const li0 = globalToLocal(pathDs, sleevePathIdx, gLo);
  const li1 = globalToLocal(pathDs, sleevePathIdx, gHi);
  if (li0 == null || li1 == null) return null;
  const pts = getPathPoints(pathDs[sleevePathIdx]!);
  const pa = pts[li0]!;
  const pb = pts[li1]!;
  const topIs0 = pa[1] <= pb[1];
  return {
    lengthStartIdx: topIs0 ? li0 : li1,
    lengthEndIdx: topIs0 ? li1 : li0,
  };
}

function lowerSleevePipelineNote(
  pathDs: string[],
  landmarks: CustomGarmentData["landmarks"],
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  effPrimary: EffectiveSleeveGradingGeometry | null
): Record<string, unknown> | string {
  if (!effPrimary) {
    return "スキップ（プライマリ袖 path が未確定。採寸が単一 path に収まっていない等）";
  }
  const low = resolveLowerSleeveGlobalsOntoSleevePath(pathDs, landmarks, effPrimary.sleevePathIdx, gt);
  const lenIdx = sleeveLengthIndicesFromMeasureGlobals(
    pathDs,
    effPrimary.sleevePathIdx,
    effPrimary.gLo,
    effPrimary.gHi
  );
  const follow =
    lenIdx != null
      ? tryLowerSleeveFollowArgs(
          pathDs,
          landmarks,
          effPrimary.sleevePathIdx,
          lenIdx.lengthStartIdx,
          lenIdx.lengthEndIdx,
          gt
        )
      : null;

  let junctionNote: string;
  if (low == null) {
    junctionNote = "スキップ（下袖グローバル範囲が袖 path に乗らない等）";
  } else if (lenIdx == null) {
    junctionNote = "スキップ（採寸 gLo/gHi の local 解決失敗）";
  } else if (follow == null) {
    junctionNote =
      "スキップ（採寸帯と下袖帯が path 上で内部重複 → ジャンクション一意に定まらない。区間を離すか採寸チェーンを見直す）";
  } else {
    junctionNote = `実行可（junctionLocal=${follow.junction}。胴端〜ジャンクションの下袖チェーンで弧長 remap）`;
  }

  return {
    説明:
      "キャンバス袖丈は着丈メッシュ後に袖パイプライン実行。弧長はチェーン＋隣接1辺伸縮。袖口は隣接頂点で上袖–袖口角を維持。下袖内点は静止弦フレームで等方スケール（generic/sleeveLower）。胴接点の outline snap は post seam sync 後に 1 回。",
    下袖区間解決: low != null ? { lowGlo: low.lowGlo, lowGhi: low.lowGhi } : "未解決（ガイド path 上のみ等）",
    下袖追従_tryLowerSleeveFollowArgs: junctionNote,
    デバッグ: "sessionStorage DEBUG_FITTING_SLEEVE_WELD=0 で [FITTING_LOWER_SLEEVE_FOLLOW] を抑止",
  };
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
    脇合わせ先: "（廃止）胴への自動スナップは行わない",
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
      袖: "汎用トップ以外 — measure-only / キャンバス袖の対象外（コート等は ScalableGarmentSpec 経由）",
    });
    return;
  }

  const effPrimary =
    distinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd)
      ? resolveEffectiveSleeveGradingGeometry(pathDs, customGarmentData.landmarks, gt)
      : null;

  const effMirror =
    distinctVertexPair(gt.sleeveMirrorMeasureVertexStart, gt.sleeveMirrorMeasureVertexEnd)
      ? resolveEffectiveMirrorSleeveGradingGeometry(pathDs, customGarmentData.landmarks, gt)
      : null;

  const lowerNote = lowerSleevePipelineNote(pathDs, customGarmentData.landmarks, gt, effPrimary);

  // #region agent log
  if (action === "addPreset") {
    let lowerOntoPath: boolean | null = null;
    if (effPrimary != null) {
      lowerOntoPath =
        resolveLowerSleeveGlobalsOntoSleevePath(pathDs, customGarmentData.landmarks, effPrimary.sleevePathIdx, gt) !=
        null;
    }
    fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c35241" },
      body: JSON.stringify({
        sessionId: "c35241",
        runId: "size-add",
        hypothesisId: "H0_addPreset",
        location: "fittingCanvasDevSizePresetDebug.ts:logGarmentSleeveMeasureUsage",
        message: "size_preset_added_dev_summary",
        data: {
          action,
          sleeveCm: customGarmentData.size.sleeve,
          lengthCm: customGarmentData.size.length,
          effPrimaryPathIdx: effPrimary?.sleevePathIdx ?? null,
          lowerSleeveGlobalsResolveOk: lowerOntoPath,
          canvasSleeveSnapEligible: genericSymmetricTopCanvasSleeveSnapEligible(gt),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  console.info(`[FIT][dev] 袖・採寸の使い分け (${action})`, {
    presetId,
    入力サイズ袖丈cm: customGarmentData.size.sleeve,
    build_applyGenericMeasureOnlyGrading: genericMeasureOnlyGradingActive(gt)
      ? "有効"
      : "無効（汎用トップの採寸頂点が不足）",
    キャンバス袖丈補正候補: genericSymmetricTopCanvasSleeveSnapEligible(gt)
      ? "あり（プライマリまたはミラーに採寸頂点）"
      : "なし",
    プライマリ袖採寸: primarySleeveMeasureLabel(gt),
    プライマリ袖キャンバス袖丈: primarySleeveCanvasScaleLabel(effPrimary, gt),
    ミラー袖キャンバス袖丈: mirrorSleeveCanvasScaleLabel(effMirror, gt),
    袖丈1辺_明示ペア: firstEdgePairDevSummary(gt),
    袖pathの注意: sleeveScalePathAdvisory(pathDs, customGarmentData.landmarks, effPrimary),
    ミラー袖採寸: mirrorSleeveMeasureLabel(gt),
    下袖設定: lowerSleeveSeamConfigSummary(gt),
    下袖パイプライン: lowerNote,
    詳細ログ_任意: "sessionStorage DEBUG_FITTING_SLEEVE_WELD=1 で [FITTING_LOWER_SLEEVE_FOLLOW]",
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
