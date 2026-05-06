/** サイズごとの cm プリセット（互換レイヤ）。平置き cm は別カタログ参照。 */
export type GarmentSizePresetRow = {
  label: string;
  lengthCm: number;
  sleeveCm: number;
};

/** 平置き cm ではウィジェット側の固定カタログを使用。DB 側のプリセット配列は廃止。 */
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
 * 保存済み garment_spec の `bodyModelVariant === "lineArtVerification"` は廃止（格子テンプレに統一）。
 * 他フィールドは維持し、線画検証のみ除去する。
 */
export function mergeGarmentSpecBodyModelVariant(garmentSpec: unknown, _obsolete: null): unknown {
  if (garmentSpec == null || typeof garmentSpec !== "object" || Array.isArray(garmentSpec)) {
    return garmentSpec;
  }
  const g = { ...(garmentSpec as Record<string, unknown>) };
  if (g.bodyModelVariant === "lineArtVerification") {
    delete g.bodyModelVariant;
  }
  return g;
}
