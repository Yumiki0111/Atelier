import type { GarmentFlatCm } from "./garmentFlatCmGradingMeasurements";
import type { GarmentFlatCmPresetsState } from "./garmentFlatCmGradingPresetsStorage";

export function measureOpenPolylineLength(verts: ReadonlyArray<readonly [number, number]>): number {
  let s = 0;
  for (let i = 0; i < verts.length - 1; i++) {
    const a = verts[i];
    const b = verts[i + 1];
    s += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return s;
}

export function flatCmEqual(a: GarmentFlatCm | null, b: GarmentFlatCm): boolean {
  if (!a) return false;
  return (
    a.shoulder === b.shoulder &&
    a.bodyWidth === b.bodyWidth &&
    a.bodyLength === b.bodyLength &&
    a.sleeve === b.sleeve
  );
}

export function fmtMeasureLabel(base: number, delta: number): { text: string; accent: boolean } {
  const cur = Math.round(base + delta);
  const d = Math.round(delta);
  return {
    text: `${cur} px${d !== 0 ? ` (${d > 0 ? "+" : ""}${d})` : ""}`,
    accent: d !== 0,
  };
}

export function clampCm(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function parseCmInputDraft(raw: string): number | null {
  const s = raw.replace(",", ".").trim();
  if (s === "" || s === "-" || s === "." || s === "-.") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function clampGarmentCmKey(key: keyof GarmentFlatCm, n: number): number {
  const lo =
    key === "shoulder"
      ? 34
      : key === "bodyWidth"
        ? 38
        : key === "bodyLength"
          ? 54
          : 45;
  const hi =
    key === "shoulder"
      ? 62
      : key === "bodyWidth"
        ? 72
        : key === "bodyLength"
          ? 92
          : 100;
  return clampCm(n, lo, hi);
}

export function formatCmInputValue(n: number): string {
  return String(round1(n));
}

export function presetNameDraftForState(s: GarmentFlatCmPresetsState): string {
  const active =
    s.activeUserPresetId != null
      ? s.userPresets.find((p) => p.id === s.activeUserPresetId)
      : undefined;
  return active?.name ?? `サイズ${s.userPresets.length + 1}`;
}
