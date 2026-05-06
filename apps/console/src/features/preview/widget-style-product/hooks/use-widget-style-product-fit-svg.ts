import { useEffect, useState } from "react";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { weightKgFromBodyVal } from "@Atelier/shared";
import type { GarmentPreviewBodyView } from "@/lib/widget-fit/resolveGarmentDataForPreviewView";
import type { FitSvgPayload } from "../fit-svg-types";
import {
  fitSvgHttpErrorHint,
  fitSvgPayloadFromApiBody,
  type FitSvgApiJsonBody,
} from "../fit-svg-api";

function fitSvgSearchParams(options: {
  currentSize: string;
  fitHeightCm: number;
  fitBodyVal: number;
  bodyDraftHeight?: number;
  bodyDraftVal?: number;
  previewBodyView: GarmentPreviewBodyView;
  disableFitEase: boolean;
  draft: boolean;
}): URLSearchParams {
  const {
    currentSize,
    fitHeightCm,
    fitBodyVal,
    bodyDraftHeight,
    bodyDraftVal,
    previewBodyView,
    disableFitEase,
    draft,
  } = options;
  const sp = new URLSearchParams({
    size: currentSize,
    heightCm: String(draft ? bodyDraftHeight ?? fitHeightCm : fitHeightCm),
    weightKg: String(weightKgFromBodyVal(draft ? bodyDraftVal ?? fitBodyVal : fitBodyVal)),
  });
  sp.set("view", previewBodyView);
  if (disableFitEase) sp.set("fitEase", "0");
  return sp;
}

export function useWidgetStyleProductFitSvgQueries(options: {
  customGarmentData: CustomGarmentData | null;
  garmentFitAvailable: boolean;
  productId: string;
  currentSize: string;
  fitHeightCm: number;
  fitBodyVal: number;
  authLoading: boolean;
  isAuthenticated: boolean;
  bodySheetOpen: boolean;
  bodyDraftHeight: number;
  bodyDraftVal: number;
  previewBodyView: GarmentPreviewBodyView;
  disableFitEase: boolean;
}) {
  const {
    customGarmentData,
    garmentFitAvailable,
    productId,
    currentSize,
    fitHeightCm,
    fitBodyVal,
    authLoading,
    isAuthenticated,
    bodySheetOpen,
    bodyDraftHeight,
    bodyDraftVal,
    previewBodyView,
    disableFitEase,
  } = options;

  const [fitData, setFitData] = useState<FitSvgPayload | null>(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [fitError, setFitError] = useState<string | null>(null);
  const [draftFitData, setDraftFitData] = useState<FitSvgPayload | null>(null);
  const [draftFitLoading, setDraftFitLoading] = useState(false);
  const [draftFitError, setDraftFitError] = useState<string | null>(null);

  useEffect(() => {
    if (customGarmentData) {
      setFitData(null);
      setFitError(null);
      setFitLoading(false);
      return;
    }
    if (!garmentFitAvailable || !productId) {
      setFitData(null);
      setFitError(null);
      return;
    }
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      setFitLoading(false);
      setFitData(null);
      setFitError("ログインが必要です。");
      return;
    }

    const ac = new AbortController();
    setFitLoading(true);
    setFitError(null);

    const sp = fitSvgSearchParams({
      currentSize,
      fitHeightCm,
      fitBodyVal,
      previewBodyView,
      disableFitEase,
      draft: false,
    });
    const url = `/api/products/${encodeURIComponent(productId)}/fit-svg?${sp.toString()}`;

    void (async () => {
      try {
        const res = await authenticatedFetch(url, { signal: ac.signal, cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as FitSvgApiJsonBody;
        if (!res.ok) {
          setFitData(null);
          setFitError(fitSvgHttpErrorHint(res.status, body));
          return;
        }
        const payload = fitSvgPayloadFromApiBody(body);
        if (!payload) {
          setFitData(null);
          setFitError("サーバー応答の形式が不正です。");
          return;
        }
        setFitData(payload);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        const msg = e instanceof Error ? e.message : "通信に失敗しました";
        setFitData(null);
        setFitError(msg);
      } finally {
        if (!ac.signal.aborted) setFitLoading(false);
      }
    })();

    return () => ac.abort();
  }, [
    customGarmentData,
    garmentFitAvailable,
    productId,
    currentSize,
    fitHeightCm,
    fitBodyVal,
    authLoading,
    isAuthenticated,
    previewBodyView,
    disableFitEase,
  ]);

  useEffect(() => {
    if (!bodySheetOpen) {
      setDraftFitData(null);
      setDraftFitError(null);
      setDraftFitLoading(false);
      return;
    }
    if (customGarmentData || !garmentFitAvailable || !productId) {
      return;
    }
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      setDraftFitError("ログインが必要です。");
      setDraftFitData(null);
      return;
    }

    const ac = new AbortController();
    const t = setTimeout(() => {
      void (async () => {
        setDraftFitLoading(true);
        setDraftFitError(null);
        try {
          const sp = fitSvgSearchParams({
            currentSize,
            fitHeightCm,
            fitBodyVal,
            bodyDraftHeight,
            bodyDraftVal,
            previewBodyView,
            disableFitEase,
            draft: true,
          });
          const url = `/api/products/${encodeURIComponent(productId)}/fit-svg?${sp.toString()}`;
          const res = await authenticatedFetch(url, { signal: ac.signal, cache: "no-store" });
          const body = (await res.json().catch(() => ({}))) as FitSvgApiJsonBody;
          if (ac.signal.aborted) return;
          if (!res.ok) {
            setDraftFitData(null);
            setDraftFitError(fitSvgHttpErrorHint(res.status, body));
            return;
          }
          const payload = fitSvgPayloadFromApiBody(body);
          if (!payload) {
            setDraftFitData(null);
            setDraftFitError("サーバー応答の形式が不正です。");
            return;
          }
          setDraftFitData(payload);
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return;
          const msg = e instanceof Error ? e.message : "通信に失敗しました";
          setDraftFitData(null);
          setDraftFitError(msg);
        } finally {
          if (!ac.signal.aborted) setDraftFitLoading(false);
        }
      })();
    }, 160);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [
    bodySheetOpen,
    bodyDraftHeight,
    bodyDraftVal,
    currentSize,
    productId,
    customGarmentData,
    garmentFitAvailable,
    authLoading,
    isAuthenticated,
    previewBodyView,
    disableFitEase,
    fitHeightCm,
    fitBodyVal,
  ]);

  return {
    fitData,
    fitLoading,
    fitError,
    draftFitData,
    draftFitLoading,
    draftFitError,
    setDraftFitData,
    setDraftFitError,
  };
}
