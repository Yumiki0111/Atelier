import {
  GRADING_V4_BASE_FLAT_CM,
  GRADING_V4_GARMENT_CM_STORAGE_KEY,
  GRADING_V4_LEGACY_SLEEVE_CM_OFFSET,
  type GradingV4GarmentFlatCm,
} from "./gradingV4GarmentCm";
import type { GradingV4SizeKey } from "./gradingV4Constants";

export const GRADING_V4_PRESETS_STORAGE_KEY = "grading-v4-garment-presets-v2";

/** 2 = 袖丈を実寸（S≈62cm）スケールで保存 */
const SLEEVE_CM_SCHEMA_V2 = 2;

/** 旧 UI（袖が概ね 35cm 以下）を実寸スケールへ */
function migratePresetCmSleeveToRealWorld(cm: GradingV4GarmentFlatCm): GradingV4GarmentFlatCm {
  if (cm.sleeve > 35) return { ...cm };
  return {
    ...cm,
    sleeve: Math.round((cm.sleeve + GRADING_V4_LEGACY_SLEEVE_CM_OFFSET) * 10) / 10,
  };
}

function migratePresetsStateSleeveSchema(state: GradingV4PresetsState): GradingV4PresetsState {
  return {
    ...state,
    userPresets: state.userPresets.map((p) => ({
      ...p,
      cm: migratePresetCmSleeveToRealWorld(p.cm),
    })),
  };
}

export type GradingV4UserPreset = { id: string; name: string; cm: GradingV4GarmentFlatCm };

/** 登録プリセットのみ。未選択時は S 基準アート相当の GRADING_V4_BASE_FLAT_CM を返す。 */
export type GradingV4PresetsState = {
  activeUserPresetId: string | null;
  userPresets: GradingV4UserPreset[];
};

export const GRADING_V4_PRESETS_DEFAULT: GradingV4PresetsState = {
  activeUserPresetId: null,
  userPresets: [],
};

function normalizeUserPresets(arr: unknown): GradingV4UserPreset[] {
  if (!Array.isArray(arr)) return [];
  const out: GradingV4UserPreset[] = [];
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
  | { kind: "builtin"; key: GradingV4SizeKey }
  | { kind: "user"; id: string };

function migrateV2Shape(j: Record<string, unknown>): GradingV4PresetsState | null {
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
): { state: GradingV4PresetsState; sleeveCmSchema: number } | null {
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

function migrateLegacySingleCm(): GradingV4PresetsState | null {
  if (typeof window === "undefined") return null;
  try {
    const legacy = window.localStorage.getItem(GRADING_V4_GARMENT_CM_STORAGE_KEY);
    if (!legacy) return null;
    const p = JSON.parse(legacy) as Partial<GradingV4GarmentFlatCm>;
    if (
      typeof p.shoulder !== "number" ||
      typeof p.bodyWidth !== "number" ||
      typeof p.bodyLength !== "number" ||
      typeof p.sleeve !== "number"
    )
      return null;
    const cm0: GradingV4GarmentFlatCm = {
      shoulder: p.shoulder,
      bodyWidth: p.bodyWidth,
      bodyLength: p.bodyLength,
      sleeve: p.sleeve,
    };
    const cm = migratePresetCmSleeveToRealWorld(cm0);
    return {
      activeUserPresetId: "migrated-legacy",
      userPresets: [{ id: "migrated-legacy", name: "保存", cm }],
    };
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

export function loadGradingV4PresetsState(): GradingV4PresetsState {
  if (typeof window === "undefined") return GRADING_V4_PRESETS_DEFAULT;
  try {
    const v2 = window.localStorage.getItem(GRADING_V4_PRESETS_STORAGE_KEY);
    if (v2) {
      const parsed = parsePresetsState(v2);
      if (parsed) {
        let { state, sleeveCmSchema } = parsed;
        let needsSave = false;
        if (needsMigrationToV3(v2)) needsSave = true;
        if (sleeveCmSchema < SLEEVE_CM_SCHEMA_V2) {
          state = migratePresetsStateSleeveSchema(state);
          needsSave = true;
        }
        if (needsSave) saveGradingV4PresetsState(state);
        return state;
      }
    }
    const migrated = migrateLegacySingleCm();
    if (migrated) {
      saveGradingV4PresetsState(migrated);
      return migrated;
    }
  } catch {
    // ignore
  }
  return GRADING_V4_PRESETS_DEFAULT;
}

export function saveGradingV4PresetsState(state: GradingV4PresetsState): void {
  if (typeof window === "undefined") return;
  const payload = { ...state, sleeveCmSchema: SLEEVE_CM_SCHEMA_V2 };
  window.localStorage.setItem(GRADING_V4_PRESETS_STORAGE_KEY, JSON.stringify(payload));
}

export function getCmForActive(state: GradingV4PresetsState): GradingV4GarmentFlatCm {
  if (state.activeUserPresetId) {
    const p = state.userPresets.find((x) => x.id === state.activeUserPresetId);
    if (p) return { ...p.cm };
  }
  return { ...GRADING_V4_BASE_FLAT_CM };
}