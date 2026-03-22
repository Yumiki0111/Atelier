"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { FittingControls } from "./fitting/FittingControls";
import { FittingCanvas } from "./fitting/FittingCanvas";
import { sizeEqual, landmarksEqual } from "./fitting/fittingStateUtils";
import { getGenericSymmetricTopPreset } from "./fitting/generic/getGenericSymmetricTopPreset";
import type {
  GarmentType,
  ShirtSize,
  JacketSize,
  CustomGarmentData,
  ShoulderDebug,
  GenericVertexPlotHighlight,
} from "./fitting/types";
import { DevelopmentProductRegisterPanel } from "./DevelopmentProductRegisterPanel";

const ANIM_DURATION_MS = 300;
const STORAGE_KEY = "atelier-dev-fitting";

type SavedState = {
  garment: GarmentType;
  shirtSize?: ShirtSize;
  jacketSize?: JacketSize;
};

function loadSavedState(): Partial<SavedState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch {
    return null;
  }
}

function saveState(garment: GarmentType, shirtSize: ShirtSize, jacketSize: JacketSize) {
  if (typeof window === "undefined") return;
  try {
    const toSave: SavedState = { garment, shirtSize, jacketSize };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

export default function DevelopmentPage() {
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(60);
  const [garment, setGarment] = useState<GarmentType>("custom");
  const [shirtSize, setShirtSize] = useState<ShirtSize>("48");
  const [jacketSize, setJacketSize] = useState<JacketSize>("4");
  const [customGarmentData, setCustomGarmentData] = useState<CustomGarmentData | null>(() =>
    getGenericSymmetricTopPreset("4")
  );
  const [hydrated, setHydrated] = useState(false);
  const [animFromSize, setAnimFromSize] = useState<ShirtSize | null>(null);
  const [animToSize, setAnimToSize] = useState<ShirtSize | null>(null);
  const [animFromCustom, setAnimFromCustom] = useState<CustomGarmentData | null>(null);
  const [animToCustom, setAnimToCustom] = useState<CustomGarmentData | null>(null);
  const [animProgress, setAnimProgress] = useState(1);
  const [showGarment, setShowGarment] = useState(true);
  const [showMeasureOverlay, setShowMeasureOverlay] = useState(true);
  const [showPlotCoords, setShowPlotCoords] = useState(true);
  const [showBodyPlotCoords, setShowBodyPlotCoords] = useState(false);
  const [showRigAngleDiagram, setShowRigAngleDiagram] = useState(false);
  const [rigBodyEnabled, setRigBodyEnabled] = useState(false);
  const [rigGarmentEnabled, setRigGarmentEnabled] = useState(false);
  const [shoulderDebug, setShoulderDebug] = useState<ShoulderDebug | null>(null);
  const [genericVertexPlotHighlight, setGenericVertexPlotHighlight] = useState<GenericVertexPlotHighlight | null>(
    null
  );
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const handleShirtSizeChange = useCallback((next: ShirtSize) => {
    if (next === shirtSize) return;
    setAnimFromSize(shirtSize);
    setAnimToSize(next);
    setShirtSize(next);
    setAnimProgress(0);
    startRef.current = null;
  }, [shirtSize]);

  const handleCustomGarmentApply = useCallback((newData: CustomGarmentData) => {
    const prev = customGarmentData;
    setCustomGarmentData(newData);
    if (
      prev &&
      prev.pathDs === newData.pathDs &&
      (!sizeEqual(prev.size, newData.size) ||
        !landmarksEqual(prev.landmarks, newData.landmarks))
    ) {
      setAnimFromCustom(prev);
      setAnimToCustom(newData);
      setAnimProgress(0);
      startRef.current = null;
    } else if (prev && prev.pathDs !== newData.pathDs) {
      setAnimFromCustom(null);
      setAnimToCustom(null);
      setAnimProgress(1);
    }
  }, [customGarmentData]);

  const handleGenericVertexPlotHighlightChange = useCallback((h: GenericVertexPlotHighlight | null) => {
    setGenericVertexPlotHighlight(h);
  }, []);
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const saved = loadSavedState();
    if (saved?.garment != null) setGarment(saved.garment);
    if (saved?.shirtSize != null) setShirtSize(saved.shirtSize);
    if (saved?.jacketSize != null) setJacketSize(saved.jacketSize);
    if (saved?.garment === "custom" && saved?.jacketSize != null) {
      setCustomGarmentData(getGenericSymmetricTopPreset(saved.jacketSize));
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveState(garment, shirtSize, jacketSize);
  }, [hydrated, garment, shirtSize, jacketSize]);

  useEffect(() => {
    if (animProgress >= 1) {
      setAnimFromSize(null);
      setAnimToSize(null);
      setAnimFromCustom(null);
      setAnimToCustom(null);
      return;
    }
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const next = Math.min(elapsed / ANIM_DURATION_MS, 1);
      setAnimProgress(next);
      if (next < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [animProgress]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none">
      <div className="flex shrink-0 flex-col gap-2 py-2">
        <h1 className="text-xl font-semibold">開発</h1>
        <DevelopmentProductRegisterPanel garment={garment} customGarmentData={customGarmentData} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-lg bg-[#f0ede8] p-3 lg:flex-row lg:items-stretch lg:gap-4">
        <div className="relative min-h-0 min-h-[min(55dvh,520px)] flex-1 overflow-hidden lg:order-2 lg:min-h-0">
          <FittingCanvas
            height={height}
            weight={weight}
            garment={garment}
            shirtSize={shirtSize}
            jacketSize={jacketSize}
            customGarmentData={customGarmentData}
            animProgress={animProgress}
            fromSize={animFromSize}
            toSize={animToSize}
            fromCustomGarmentData={animFromCustom}
            toCustomGarmentData={animToCustom}
            showGarment={showGarment}
            showMeasureOverlay={showMeasureOverlay}
            showPlotCoords={showPlotCoords}
            showBodyPlotCoords={showBodyPlotCoords}
            showRigAngleDiagram={showRigAngleDiagram}
            rigBodyEnabled={rigBodyEnabled}
            rigGarmentEnabled={rigGarmentEnabled}
            onShoulderDebugChange={setShoulderDebug}
            genericVertexPlotHighlight={genericVertexPlotHighlight}
          />
        </div>
        <FittingControls
          className="max-h-[min(42vh,360px)] w-full max-w-none shrink-0 rounded-md bg-white/60 px-2 py-2 ring-1 ring-slate-200/70 lg:order-1 lg:max-h-none lg:w-[min(17rem,100%)] lg:bg-transparent lg:px-0 lg:py-1 lg:ring-0"
          height={height}
          weight={weight}
          garment={garment}
          shirtSize={shirtSize}
          jacketSize={jacketSize}
          customGarmentData={customGarmentData}
          showGarment={showGarment}
          showMeasureOverlay={showMeasureOverlay}
          showPlotCoords={showPlotCoords}
          showBodyPlotCoords={showBodyPlotCoords}
          showRigAngleDiagram={showRigAngleDiagram}
          rigBodyEnabled={rigBodyEnabled}
          rigGarmentEnabled={rigGarmentEnabled}
          onHeightChange={setHeight}
          onWeightChange={setWeight}
          onGarmentChange={setGarment}
          onShirtSizeChange={handleShirtSizeChange}
          onJacketSizeChange={setJacketSize}
          onCustomGarmentApply={handleCustomGarmentApply}
          onToggleGarment={() => setShowGarment((v) => !v)}
          onToggleMeasureOverlay={() => setShowMeasureOverlay((v) => !v)}
          onTogglePlotCoords={() => setShowPlotCoords((v) => !v)}
          onToggleBodyPlotCoords={() => setShowBodyPlotCoords((v) => !v)}
          onToggleRigAngleDiagram={() => setShowRigAngleDiagram((v) => !v)}
          onToggleRigBody={() => setRigBodyEnabled((v) => !v)}
          onToggleRigGarment={() => setRigGarmentEnabled((v) => !v)}
          shoulderDebug={shoulderDebug}
          onGenericVertexPlotHighlightChange={handleGenericVertexPlotHighlightChange}
        />
      </div>
    </div>
  );
}
