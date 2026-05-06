import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { GarmentPreviewBodyView } from "@/lib/widget-fit/resolveGarmentDataForPreviewView";

const FADE_MS = 200;

/**
 * 前後ビュー切替時: フェードアウト → state 更新 → フェードイン。
 * `resetKey`（例: productId）が変わったときはアニメーションを中断して不透明度を戻す。
 */
export function useGarmentPreviewBodyViewCrossfade(
  view: GarmentPreviewBodyView,
  setView: (next: GarmentPreviewBodyView) => void,
  resetKey: unknown,
) {
  const [opacity, setOpacity] = useState(1);
  const busyRef = useRef(false);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    clearTimers();
    busyRef.current = false;
    setOpacity(1);
  }, [clearTimers, resetKey]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const onTogglePress = useCallback(() => {
    if (busyRef.current) return;
    clearTimers();
    busyRef.current = true;
    const next: GarmentPreviewBodyView = view === "front" ? "back" : "front";
    setOpacity(0);
    const t1 = setTimeout(() => {
      setView(next);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpacity(1);
          const t2 = setTimeout(() => {
            busyRef.current = false;
          }, FADE_MS);
          timersRef.current.push(t2);
        });
      });
    }, FADE_MS);
    timersRef.current.push(t1);
  }, [view, setView, clearTimers]);

  const canvasFadeStyle = useMemo(
    (): CSSProperties => ({
      opacity,
      transition: `opacity ${FADE_MS}ms ease`,
    }),
    [opacity],
  );

  return { canvasFadeStyle, onTogglePress };
}
