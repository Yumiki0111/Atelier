import { useEffect, useLayoutEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/api-client";
import {
  DEFAULT_PREVIEW_FIT_BODY_VAL,
  DEFAULT_PREVIEW_FIT_HEIGHT_CM,
  loadPreviewFit,
} from "@/lib/previewFitStorage";

export function useWidgetStyleProductFitParams(options: {
  embedPublicWidget: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
}) {
  const { embedPublicWidget, authLoading, isAuthenticated } = options;

  const [fitHeightCm, setFitHeightCm] = useState(() =>
    embedPublicWidget ? DEFAULT_PREVIEW_FIT_HEIGHT_CM : loadPreviewFit().heightCm
  );
  const [fitBodyVal, setFitBodyVal] = useState(() =>
    embedPublicWidget ? DEFAULT_PREVIEW_FIT_BODY_VAL : loadPreviewFit().bodyVal
  );

  useLayoutEffect(() => {
    if (!embedPublicWidget) return;
    const local = loadPreviewFit();
    setFitHeightCm(local.heightCm);
    setFitBodyVal(local.bodyVal);
  }, [embedPublicWidget]);

  useEffect(() => {
    if (embedPublicWidget) return;
    if (authLoading) return;
    if (!isAuthenticated) {
      const local = loadPreviewFit();
      setFitHeightCm(local.heightCm);
      setFitBodyVal(local.bodyVal);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await authenticatedFetch("/api/auth/profile", {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          const local = loadPreviewFit();
          setFitHeightCm(local.heightCm);
          setFitBodyVal(local.bodyVal);
          return;
        }
        const p = (await res.json()) as {
          preview_fit_height_cm?: number | null;
          preview_fit_body_val?: number | null;
        };
        if (cancelled) return;
        const h = p.preview_fit_height_cm;
        const b = p.preview_fit_body_val;
        if (
          typeof h === "number" &&
          Number.isFinite(h) &&
          typeof b === "number" &&
          Number.isFinite(b)
        ) {
          setFitHeightCm(Math.min(195, Math.max(150, Math.round(h))));
          setFitBodyVal(Math.min(100, Math.max(0, Math.round(b))));
        } else {
          const local = loadPreviewFit();
          setFitHeightCm(local.heightCm);
          setFitBodyVal(local.bodyVal);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof Error && e.name === "AbortError") return;
        const local = loadPreviewFit();
        setFitHeightCm(local.heightCm);
        setFitBodyVal(local.bodyVal);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [embedPublicWidget, authLoading, isAuthenticated]);

  return { fitHeightCm, fitBodyVal, setFitHeightCm, setFitBodyVal };
}
