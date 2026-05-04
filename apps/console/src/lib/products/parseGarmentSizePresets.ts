import type { BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";

/** サイズごとの cm プリセット（互換レイヤ）。Grading v4 は別カタログ参照。 */
export type GarmentSizePresetRow = {
  label: string;
  lengthCm: number;
  sleeveCm: number;
};

/** Grading v4 ではウィジェット側の固定カタログを使用。DB 側のプリセット配列は廃止。 */
export function parseGarmentSizePresets(_garmentSpec: unknown): GarmentSizePresetRow[] {
  return [];
}

export function canEditGarmentSizePresets(_garmentSpec: unknown): boolean {
  return false;
}

export function mergeGarmentSpecSizePresets(garmentSpec: unknown, _presets: GarmentSizePresetRow[]): unknown {
  return garmentSpec;
}

/**
 * 他フィールドは維持し、`bodyModelVariant` だけ設定または削除する（既存商品の試着ボディを後から切り替え）。
 */
export function mergeGarmentSpecBodyModelVariant(
  garmentSpec: unknown,
  variant: BodyModelVariant
): unknown {
  if (garmentSpec == null || typeof garmentSpec !== "object" || Array.isArray(garmentSpec)) {
    return garmentSpec;
  }
  const g = { ...(garmentSpec as Record<string, unknown>) };
  if (variant === "lineArtVerification") {
    g.bodyModelVariant = "lineArtVerification";
  } else {
    delete g.bodyModelVariant;
  }
  return g;
}
