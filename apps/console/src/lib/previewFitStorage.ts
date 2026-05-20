const STORAGE_KEY = "atelier.console.previewFitV1";

export type PreviewFitParams = {
  heightCm: number;
  bodyVal: number;
};

/** SSR とクライアント初回レンダーを一致させる（localStorage はマウント後に反映） */
export const DEFAULT_PREVIEW_FIT_HEIGHT_CM = 170;
/** `WidgetStyleProductPreview` の DEFAULT_FIT_BODY_VAL と揃える */
/** `weightKgFromBodyVal` とプレビュー体重レンジ変更時は、体感 ~53kg になるよう合わせる */
export const DEFAULT_PREVIEW_FIT_BODY_VAL = 9;

const DEFAULT_HEIGHT = DEFAULT_PREVIEW_FIT_HEIGHT_CM;
const DEFAULT_BODY = DEFAULT_PREVIEW_FIT_BODY_VAL;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function loadPreviewFit(): PreviewFitParams {
  if (typeof window === "undefined") {
    return { heightCm: DEFAULT_HEIGHT, bodyVal: DEFAULT_BODY };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { heightCm: DEFAULT_HEIGHT, bodyVal: DEFAULT_BODY };
    }
    const p = JSON.parse(raw) as Partial<PreviewFitParams>;
    const heightCm =
      typeof p.heightCm === "number" && Number.isFinite(p.heightCm)
        ? clamp(Math.round(p.heightCm), 150, 195)
        : DEFAULT_HEIGHT;
    const bodyVal =
      typeof p.bodyVal === "number" && Number.isFinite(p.bodyVal)
        ? clamp(p.bodyVal, 0, 100)
        : DEFAULT_BODY;
    return { heightCm, bodyVal };
  } catch {
    return { heightCm: DEFAULT_HEIGHT, bodyVal: DEFAULT_BODY };
  }
}

export function savePreviewFit(p: PreviewFitParams): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        heightCm: clamp(Math.round(p.heightCm), 150, 195),
        bodyVal: clamp(p.bodyVal, 0, 100),
      })
    );
  } catch {
    // quota / private mode
  }
}
