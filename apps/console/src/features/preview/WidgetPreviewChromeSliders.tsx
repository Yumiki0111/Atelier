"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PREVIEW_ACCENT, usePreviewChromeScale, usePreviewChromeTheme } from "./WidgetPreviewChromeTheme";

/** 親への数値コミット間隔（試着計算の負荷を抑える。バーはローカルで追従） */
const SLIDER_COMMIT_INTERVAL_MS = 72;

/** 身長・体型スライダー（サイズ行と同じ横パディング・段組） */
export function PreviewFitParamSliders({
  heightCm,
  bodyVal,
  onHeightChange,
  onBodyValChange,
  accentColor = PREVIEW_ACCENT,
}: {
  heightCm: number;
  bodyVal: number;
  onHeightChange: (v: number) => void;
  onBodyValChange: (v: number) => void;
  accentColor?: string;
}) {
  const scale = usePreviewChromeScale();
  const isEmbed = scale === "embed";
  const cv = usePreviewChromeTheme().canvas;

  const [heightLocal, setHeightLocal] = useState(heightCm);
  const [bodyLocal, setBodyLocal] = useState(bodyVal);
  const heightRef = useRef(heightCm);
  const bodyRef = useRef(bodyVal);
  const lastHCommit = useRef(0);
  const lastBCommit = useRef(0);
  const hTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHeightLocal(heightCm);
    heightRef.current = heightCm;
  }, [heightCm]);
  useEffect(() => {
    setBodyLocal(bodyVal);
    bodyRef.current = bodyVal;
  }, [bodyVal]);

  useEffect(
    () => () => {
      if (hTimerRef.current) clearTimeout(hTimerRef.current);
      if (bTimerRef.current) clearTimeout(bTimerRef.current);
    },
    [],
  );

  const commitHeight = useCallback(
    (v: number) => {
      lastHCommit.current = performance.now();
      onHeightChange(v);
    },
    [onHeightChange],
  );
  const commitBody = useCallback(
    (v: number) => {
      lastBCommit.current = performance.now();
      onBodyValChange(v);
    },
    [onBodyValChange],
  );

  const onHeightInput = useCallback(
    (v: number) => {
      setHeightLocal(v);
      heightRef.current = v;
      const now = performance.now();
      if (hTimerRef.current) {
        clearTimeout(hTimerRef.current);
        hTimerRef.current = null;
      }
      if (now - lastHCommit.current >= SLIDER_COMMIT_INTERVAL_MS) {
        commitHeight(v);
      } else {
        const wait = SLIDER_COMMIT_INTERVAL_MS - (now - lastHCommit.current);
        hTimerRef.current = setTimeout(() => {
          hTimerRef.current = null;
          commitHeight(heightRef.current);
        }, Math.max(0, wait));
      }
    },
    [commitHeight],
  );

  const onBodyInput = useCallback(
    (v: number) => {
      setBodyLocal(v);
      bodyRef.current = v;
      const now = performance.now();
      if (bTimerRef.current) {
        clearTimeout(bTimerRef.current);
        bTimerRef.current = null;
      }
      if (now - lastBCommit.current >= SLIDER_COMMIT_INTERVAL_MS) {
        commitBody(v);
      } else {
        const wait = SLIDER_COMMIT_INTERVAL_MS - (now - lastBCommit.current);
        bTimerRef.current = setTimeout(() => {
          bTimerRef.current = null;
          commitBody(bodyRef.current);
        }, Math.max(0, wait));
      }
    },
    [commitBody],
  );

  const flushHeight = useCallback(() => {
    if (hTimerRef.current) {
      clearTimeout(hTimerRef.current);
      hTimerRef.current = null;
    }
    commitHeight(heightRef.current);
  }, [commitHeight]);

  const flushBody = useCallback(() => {
    if (bTimerRef.current) {
      clearTimeout(bTimerRef.current);
      bTimerRef.current = null;
    }
    commitBody(bodyRef.current);
  }, [commitBody]);

  return (
    <div className={cn("flex shrink-0 flex-col px-3", isEmbed ? "gap-2 pb-2 pt-2" : "gap-1.5 pb-1.5 pt-2")}>
      <div>
        <div
          className={cn(
            "flex justify-between font-normal leading-tight",
            isEmbed ? "mb-1.5 text-[11px]" : "mb-1 text-[9px]",
          )}
          style={{ color: cv.fg }}
        >
          <span>身長</span>
          <span>{heightLocal} cm</span>
        </div>
        <input
          type="range"
          min={150}
          max={195}
          value={heightLocal}
          onChange={(e) => onHeightInput(parseInt(e.target.value, 10) || 170)}
          onPointerUp={flushHeight}
          onPointerCancel={flushHeight}
          className={cn("w-full", isEmbed ? "h-8" : "h-7")}
          style={{ accentColor }}
        />
      </div>
      <div>
        <div
          className={cn("font-normal leading-tight", isEmbed ? "mb-1.5 text-[11px]" : "mb-1 text-[9px]")}
          style={{ color: cv.fg }}
        >
          シルエット
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={bodyLocal}
          onChange={(e) => onBodyInput(parseInt(e.target.value, 10) || 0)}
          onPointerUp={flushBody}
          onPointerCancel={flushBody}
          className={cn("w-full", isEmbed ? "h-8" : "h-7")}
          style={{ accentColor }}
        />
      </div>
    </div>
  );
}
