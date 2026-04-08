/**
 * garment_spec（開発フィット登録）からサイズラベルと着丈・袖丈（cm）を取り出す。
 */
export type GarmentSizePresetRow = {
  label: string;
  /** 着丈 cm */
  lengthCm: number;
  /** 袖丈 cm */
  sleeveCm: number;
};

export function parseGarmentSizePresets(garmentSpec: unknown): GarmentSizePresetRow[] {
  if (!garmentSpec || typeof garmentSpec !== "object") return [];
  const raw = (garmentSpec as { genericSymmetricTop?: { sizePresets?: unknown } })
    .genericSymmetricTop?.sizePresets;
  if (!Array.isArray(raw)) return [];
  const out: GarmentSizePresetRow[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const { label, length, sleeve } = p as {
      label?: unknown;
      length?: unknown;
      sleeve?: unknown;
    };
    if (typeof label !== "string" || !label.trim()) continue;
    if (typeof length !== "number" || !Number.isFinite(length)) continue;
    if (typeof sleeve !== "number" || !Number.isFinite(sleeve)) continue;
    out.push({ label: label.trim(), lengthCm: length, sleeveCm: sleeve });
  }
  return out;
}

/** `genericSymmetricTop` があるときのみ寸法プリセットを編集できる */
export function canEditGarmentSizePresets(garmentSpec: unknown): boolean {
  if (garmentSpec == null || typeof garmentSpec !== "object") return false;
  const g = garmentSpec as { genericSymmetricTop?: unknown };
  return g.genericSymmetricTop != null && typeof g.genericSymmetricTop === "object";
}

/**
 * garment_spec の他フィールドは維持し、`genericSymmetricTop.sizePresets` だけ置き換える。
 */
export function mergeGarmentSpecSizePresets(
  garmentSpec: unknown,
  presets: GarmentSizePresetRow[]
): unknown {
  if (garmentSpec == null || typeof garmentSpec !== "object") {
    return garmentSpec;
  }
  const g = { ...(garmentSpec as Record<string, unknown>) };
  const prevGt = g.genericSymmetricTop;
  const gt =
    prevGt && typeof prevGt === "object"
      ? { ...(prevGt as Record<string, unknown>) }
      : {};
  gt.sizePresets = presets.map((p) => ({
    label: p.label,
    length: p.lengthCm,
    sleeve: p.sleeveCm,
  }));
  g.genericSymmetricTop = gt;
  return g;
}
