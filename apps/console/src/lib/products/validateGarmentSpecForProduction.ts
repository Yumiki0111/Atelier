import { RIG_LINE_PATH_COUNT } from "@/lib/fitting-compute/fittingCanvasRigAlign";

/**
 * 2D 試着用 garment_spec（pathDs あり）を保存・公開する前提の検証。
 * pathDs が無い／空のときは 2D 試着対象外としてスキップ（ok）。
 */
export function validateGarmentSpecForProduction(
  spec: unknown
): { ok: true } | { ok: false; message: string } {
  if (spec == null || typeof spec !== "object" || Array.isArray(spec)) {
    return { ok: false, message: "garment_spec の形式が不正です。" };
  }
  const o = spec as Record<string, unknown>;
  const pathDs = o.pathDs;
  if (!Array.isArray(pathDs) || pathDs.length === 0) {
    return { ok: true };
  }
  if (typeof pathDs[0] !== "string") {
    return { ok: false, message: "garment_spec の pathDs が不正です。" };
  }

  if (o.presetId !== "genericSymmetricTop") {
    return { ok: false, message: "汎用トップ（genericSymmetricTop）として登録してください。" };
  }
  if (o.genericSymmetricTop == null || typeof o.genericSymmetricTop !== "object") {
    return { ok: false, message: "汎用トップ設定（genericSymmetricTop）がありません。" };
  }

  const rigDs = o.debugRigPathDs;
  if (!Array.isArray(rigDs) || rigDs.length === 0) {
    return {
      ok: false,
      message: "服SVGにリグ線がありません。モデルと同じリグ付きのSVGをアップロードしてください。",
    };
  }

  if (rigDs.length !== RIG_LINE_PATH_COUNT) {
    return {
      ok: false,
      message: `服のリグ本数（${rigDs.length}）がモデル（${RIG_LINE_PATH_COUNT}本）と一致しません。`,
    };
  }

  return { ok: true };
}
