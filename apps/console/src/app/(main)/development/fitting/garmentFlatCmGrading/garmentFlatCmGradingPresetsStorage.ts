import {
  GARMENT_FLAT_CM_BASE,
  GARMENT_FLAT_CM_LEGACY_SLEEVE_CM_OFFSET,
  type GarmentFlatCm,
} from "./garmentFlatCmGradingMeasurements";
import type { FlatCmSizeKey } from "./garmentFlatCmGradingConstants";

const GARMENT_FLAT_CM_PRESETS_LS_V3 = "garment-flat-cm-presets-v3";

/** 読み取り側が参照（新規保存は v3 のみ） */
export const GARMENT_FLAT_CM_PRESETS_STORAGE_KEY = GARMENT_FLAT_CM_PRESETS_LS_V3;

/** 2 = 袖丈を実寸（S≈62cm）スケールで保存 */
const SLEEVE_CM_SCHEMA_V2 = 2;

/** 旧 UI（袖が概ね 35cm 以下）を実寸スケールへ */
function migratePresetCmSleeveToRealWorld(cm: GarmentFlatCm): GarmentFlatCm {
  if (cm.sleeve > 35) return { ...cm };
  return {
    ...cm,
    sleeve: Math.round((cm.sleeve + GARMENT_FLAT_CM_LEGACY_SLEEVE_CM_OFFSET) * 10) / 10,
  };
}

function migratePresetsStateSleeveSchema(state: GarmentFlatCmPresetsState): GarmentFlatCmPresetsState {
  return {
    ...state,
    userPresets: state.userPresets.map((p) => ({
      ...p,
      cm: migratePresetCmSleeveToRealWorld(p.cm),
    })),
  };
}

export type GarmentFlatCmUserPreset = { id: string; name: string; cm: GarmentFlatCm };

/** 登録プリセットのみ。未選択時は S 基準アート相当の GARMENT_FLAT_CM_BASE を返す。 */
export type GarmentFlatCmPresetsState = {
  activeUserPresetId: string | null;
  userPresets: GarmentFlatCmUserPreset[];
};

export const GARMENT_FLAT_CM_PRESETS_DEFAULT: GarmentFlatCmPresetsState = {
  activeUserPresetId: null,
  userPresets: [],
};

function normalizeUserPresets(arr: unknown): GarmentFlatCmUserPreset[] {
  if (!Array.isArray(arr)) return [];
  const out: GarmentFlatCmUserPreset[] = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.name !== "string" || !o.cm || typeof o.cm !== "object") continue;
    const cm = o.cm as Record<string, unknown>;
    if (
      typeof cm.shoulder !== "number" ||
      typeof cm.bodyWidth !== "number" ||
      typeof cm.bodyLength !== "number" ||
      typeof cm.sleeve !== "number"
    )
      continue;
    out.push({
      id: o.id,
      name: o.name,
      cm: {
        shoulder: cm.shoulder,
        bodyWidth: cm.bodyWidth,
        bodyLength: cm.bodyLength,
        sleeve: cm.sleeve,
      },
    });
  }
  return out;
}

type LegacyV2Active =
  | { kind: "builtin"; key: FlatCmSizeKey }
  | { kind: "user"; id: string };

function migrateV2Shape(j: Record<string, unknown>): GarmentFlatCmPresetsState | null {
  const presets = normalizeUserPresets(j.userPresets);
  const active = j.active as LegacyV2Active | undefined;
  if (active?.kind === "user" && typeof active.id === "string" && presets.some((p) => p.id === active.id)) {
    return { activeUserPresetId: active.id, userPresets: presets };
  }
  if (active?.kind === "builtin") {
    return { activeUserPresetId: null, userPresets: presets };
  }
  if (presets.length > 0) {
    return { activeUserPresetId: presets[0].id, userPresets: presets };
  }
  return { activeUserPresetId: null, userPresets: presets };
}

function parsePresetsState(
  raw: string
): { state: GarmentFlatCmPresetsState; sleeveCmSchema: number } | null {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const presets = normalizeUserPresets(j.userPresets);
    const sleeveCmSchema = typeof j.sleeveCmSchema === "number" ? j.sleeveCmSchema : 1;

    if ("activeUserPresetId" in j) {
      const id = j.activeUserPresetId;
      let activeUserPresetId: string | null = null;
      if (id === null || id === undefined) activeUserPresetId = null;
      else if (typeof id === "string" && presets.some((p) => p.id === id)) activeUserPresetId = id;
      else activeUserPresetId = presets[0]?.id ?? null;
      return { state: { activeUserPresetId, userPresets: presets }, sleeveCmSchema };
    }

    const legacy = migrateV2Shape(j);
    return legacy ? { state: legacy, sleeveCmSchema: 1 } : null;
  } catch {
    return null;
  }
}

function needsMigrationToV3(raw: string): boolean {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    return "active" in j && !("activeUserPresetId" in j);
  } catch {
    return false;
  }
}

export function loadGarmentFlatCmPresetsState(): GarmentFlatCmPresetsState {
  if (typeof window === "undefined") return GARMENT_FLAT_CM_PRESETS_DEFAULT;
  try {
    const raw = window.localStorage.getItem(GARMENT_FLAT_CM_PRESETS_LS_V3);
    if (raw) {
      const parsed = parsePresetsState(raw);
      if (parsed) {
        let { state, sleeveCmSchema } = parsed;
        let needsSave = false;
        if (needsMigrationToV3(raw)) needsSave = true;
        if (sleeveCmSchema < SLEEVE_CM_SCHEMA_V2) {
          state = migratePresetsStateSleeveSchema(state);
          needsSave = true;
        }
        if (needsSave) saveGarmentFlatCmPresetsState(state);
        return state;
      }
    }
  } catch {
    // ignore
  }
  return GARMENT_FLAT_CM_PRESETS_DEFAULT;
}

export function saveGarmentFlatCmPresetsState(state: GarmentFlatCmPresetsState): void {
  if (typeof window === "undefined") return;
  const payload = { ...state, sleeveCmSchema: SLEEVE_CM_SCHEMA_V2 };
  window.localStorage.setItem(GARMENT_FLAT_CM_PRESETS_LS_V3, JSON.stringify(payload));
}

export function getCmForActive(state: GarmentFlatCmPresetsState): GarmentFlatCm {
  if (state.activeUserPresetId) {
    const p = state.userPresets.find((x) => x.id === state.activeUserPresetId);
    if (p) return { ...p.cm };
  }
  return { ...GARMENT_FLAT_CM_BASE };
}
