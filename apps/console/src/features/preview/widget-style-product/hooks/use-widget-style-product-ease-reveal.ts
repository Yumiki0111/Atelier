import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import type { FitSvgPayload } from "../fit-svg-types";
import { useFitSvgStage } from "../fit-svg-stage";

export function useWidgetStyleProductEaseReveal(options: {
  garmentPathsInViewer: boolean;
  fitData: FitSvgPayload | null;
  productId: string;
  fitEaseRevealNonce: number;
  embedPublicWidget: boolean;
  embedSplashSuspended: boolean;
  bodySheetOpen: boolean;
  customGarmentData: CustomGarmentData | null;
  draftFitData: FitSvgPayload | null;
}) {
  const {
    garmentPathsInViewer,
    fitData,
    productId,
    fitEaseRevealNonce,
    embedPublicWidget,
    embedSplashSuspended,
    bodySheetOpen,
    customGarmentData,
    draftFitData,
  } = options;

  const hasEaseDiagramEmbed = useMemo(
    () => Boolean(garmentPathsInViewer && fitData && (fitData.fitEaseDiagram?.ops?.length ?? 0) > 0),
    [garmentPathsInViewer, fitData]
  );

  const [embedEaseRevealDone, setEmbedEaseRevealDone] = useState(false);
  const [embedEaseRevealKey, setEmbedEaseRevealKey] = useState(0);
  useLayoutEffect(() => {
    setEmbedEaseRevealDone(false);
    setEmbedEaseRevealKey((k) => k + 1);
  }, [productId, garmentPathsInViewer, fitEaseRevealNonce]);

  const fitSvgStageEmbed = useFitSvgStage(
    hasEaseDiagramEmbed,
    [hasEaseDiagramEmbed, embedEaseRevealKey],
    {
      embedSplashSuspended: embedPublicWidget && embedSplashSuspended === true,
    }
  );

  useEffect(() => {
    if (embedEaseRevealDone) return;
    if (!fitData) return;
    if (fitSvgStageEmbed >= 3) setEmbedEaseRevealDone(true);
  }, [fitSvgStageEmbed, embedEaseRevealDone, fitData]);

  const showEmbedEaseOverlay = embedEaseRevealDone || fitSvgStageEmbed >= 2;
  const showEmbedEaseText = embedEaseRevealDone || fitSvgStageEmbed >= 3;

  const [draftEaseRevealDone, setDraftEaseRevealDone] = useState(false);
  const [draftEaseRevealKey, setDraftEaseRevealKey] = useState(0);
  const draftEaseStagedOnceRef = useRef(false);
  useLayoutEffect(() => {
    draftEaseStagedOnceRef.current = false;
    setDraftEaseRevealDone(false);
  }, [productId, fitEaseRevealNonce]);
  useLayoutEffect(() => {
    if (!bodySheetOpen || customGarmentData) return;
    if (draftFitData && !draftEaseStagedOnceRef.current) {
      setDraftEaseRevealDone(false);
      setDraftEaseRevealKey((k) => k + 1);
    }
  }, [bodySheetOpen, customGarmentData, draftFitData]);
  useEffect(() => {
    if (draftEaseRevealDone) draftEaseStagedOnceRef.current = true;
  }, [draftEaseRevealDone]);

  const draftRevealActive = Boolean(bodySheetOpen && !customGarmentData && draftFitData);
  const draftFitSvgStage = useFitSvgStage(draftRevealActive, [draftEaseRevealKey, draftRevealActive]);
  useEffect(() => {
    if (draftEaseRevealDone) return;
    if (!draftRevealActive) return;
    if (draftFitSvgStage >= 3) setDraftEaseRevealDone(true);
  }, [draftFitSvgStage, draftEaseRevealDone, draftRevealActive]);

  const showDraftEaseText = draftEaseRevealDone || draftFitSvgStage >= 3;

  return {
    fitSvgStageEmbed,
    showEmbedEaseOverlay,
    showEmbedEaseText,
    showDraftEaseText,
  };
}
