"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { init3DViewer } from "@atelier/preview";
import type { ViewerInstance } from "@atelier/preview";
import { PhoneFrame } from "@/features/preview/PhoneFrame";

// ─── テスト用アセット ─────────────────────────────────────────────────────────
const ASSETS = [
  { id: "tops",    url: "/3d/test/testT.fbx",    category: "トップス", name: "テストTシャツ" },
  { id: "bottoms", url: "/3d/test/testPants.fbx", category: "ボトムス", name: "テストパンツ" },
] as const;

const CATEGORIES = ["トップス", "ボトムス"] as const;
const SIZES      = ["S", "M", "L", "XL"]    as const;
const MIN_H = 150, MAX_H = 190, INIT_H = 170;

type AssetId = (typeof ASSETS)[number]["id"];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function TestMorphPage() {
  const borderRef  = useRef<HTMLDivElement | null>(null);
  const viewerEl   = useRef<HTMLDivElement>(null);
  const viewerInst = useRef<ViewerInstance | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>("トップス");
  const [activeAssets,   setActiveAssets]   = useState<Set<AssetId>>(new Set(["tops", "bottoms"]));
  const [height,         setHeight]          = useState(INIT_H);
  const [size,           setSize]            = useState<string>("M");

  // ── 3D viewer 初期化 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!viewerEl.current) return;

    const initial = ASSETS.map((a) => ({ url: a.url, category: a.category }));
    viewerInst.current = init3DViewer(viewerEl.current, {
      modelUrl:   "/3d/Model.fbx",
      assets:     initial,
      apiBaseUrl: "",
      onLoad:     () => {},
      onError:    (e) => console.error("[TestMorph]", e),
    });

    return () => {
      viewerInst.current?.destroy();
      viewerInst.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── アセット更新 ─────────────────────────────────────────────────────────
  const applyAssets = useCallback((next: Set<AssetId>) => {
    const list = ASSETS.filter((a) => next.has(a.id)).map((a) => ({
      url: a.url, category: a.category,
    }));
    viewerInst.current?.updateAssets(list);
  }, []);

  const toggleAsset = useCallback((id: AssetId) => {
    setActiveAssets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      applyAssets(next);
      return next;
    });
  }, [applyAssets]);

  // ── 身長変更 ─────────────────────────────────────────────────────────────
  const applyHeight = useCallback((h: number) => {
    const v = Math.max(MIN_H, Math.min(MAX_H, h));
    setHeight(v);
    viewerInst.current?.updateHeight?.(v, INIT_H);
  }, []);

  // ── 垂直スライダー ────────────────────────────────────────────────────────
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const draggingSlider = useRef(false);

  const sliderYtoH = useCallback((clientY: number): number => {
    const rect = sliderTrackRef.current?.getBoundingClientRect();
    if (!rect) return height;
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return Math.round(MAX_H - ratio * (MAX_H - MIN_H));
  }, [height]);

  useEffect(() => {
    const onMove = (y: number) => { if (draggingSlider.current) applyHeight(sliderYtoH(y)); };
    const onEnd  = () => { draggingSlider.current = false; };
    const mm = (e: MouseEvent) => onMove(e.clientY);
    const tm = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientY); };
    document.addEventListener("mousemove", mm);
    document.addEventListener("touchmove", tm, { passive: false });
    document.addEventListener("mouseup",   onEnd);
    document.addEventListener("touchend",  onEnd);
    return () => {
      document.removeEventListener("mousemove", mm);
      document.removeEventListener("touchmove", tm);
      document.removeEventListener("mouseup",   onEnd);
      document.removeEventListener("touchend",  onEnd);
    };
  }, [applyHeight, sliderYtoH]);

  const handleTopPct = ((1 - (height - MIN_H) / (MAX_H - MIN_H)) * 100).toFixed(2);
  const currentCatAssets = ASSETS.filter((a) => a.category === activeCategory);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">モデルに対する服の追従テスト</h1>

      {/* Phone frame + widget bottom sheet preview */}
      <div style={{ height: "560px", width: "260px", flexShrink: 0 }}>
        <PhoneFrame
          previewContainerRef={viewerEl}
          selectedAsset={null}
          borderRef={borderRef}
        >
          {/* ── Full-screen content inside phone screen ── */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>

            {/* Backdrop (top ~10% above the sheet) */}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.48)" }} />

            {/* Bottom sheet */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: "96%",
              background: "#fff",
              borderRadius: "16px 16px 0 0",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}>

              {/* ── Drag handle ── */}
              <div style={{
                flexShrink: 0, display: "flex", justifyContent: "center",
                padding: "3px 0 2px",
              }}>
                <div style={{ width: 32, height: 3, background: "#d1d5db", borderRadius: 99 }} />
              </div>

              {/* ── Viewer area (flex:1 → definite height for Three.js) ── */}
              <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>

                {/* 3D canvas – fills viewer area exactly */}
                <div ref={viewerEl} style={{ position: "absolute", inset: 0 }} />

                {/* Left slots overlay */}
                <div style={{
                  position: "absolute", top: 8, left: 6,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 6,
                  zIndex: 20,
                }}>
                  {/* 着ている商品だけを表示（activeAssetsに含まれているもののみ） */}
                  {ASSETS.filter((a) => activeAssets.has(a.id)).map((asset) => {
                    const isActive = asset.category === activeCategory;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => setActiveCategory(asset.category)}
                        style={{
                          width: 30, height: 30, flexShrink: 0,
                          border: `2px solid ${isActive ? "#3b82f6" : "#e5e7eb"}`,
                          borderRadius: 6,
                          background: "rgba(249,250,251,0.9)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", overflow: "hidden",
                          boxSizing: "border-box",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Height slider overlay */}
                <div style={{
                  position: "absolute", bottom: 8, right: 6,
                  width: 28, height: 180,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  userSelect: "none", touchAction: "none",
                }}>
                  <div
                    onClick={() => applyHeight(height + 1)}
                    style={{ fontSize: 12, fontWeight: 700, color: "#374151", cursor: "pointer", lineHeight: 1, padding: "2px 0", width: "100%", textAlign: "center" }}
                  >+</div>
                  <div
                    ref={sliderTrackRef}
                    style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", margin: "3px 0" }}
                  >
                    <div style={{ position: "absolute", top: 0, bottom: 0, width: 2, background: "#d1d5db", borderRadius: 1, left: "50%", transform: "translateX(-50%)" }} />
                    <div
                      onMouseDown={(e) => { e.preventDefault(); draggingSlider.current = true; }}
                      onTouchStart={() => { draggingSlider.current = true; }}
                      style={{
                        position: "absolute",
                        width: 12, height: 12, background: "#111", borderRadius: "50%",
                        top: `${handleTopPct}%`, left: "50%",
                        transform: "translate(-50%, -50%)",
                        cursor: "grab", zIndex: 1,
                      }}
                    />
                  </div>
                  <div
                    onClick={() => applyHeight(height - 1)}
                    style={{ fontSize: 12, fontWeight: 700, color: "#374151", cursor: "pointer", lineHeight: 1, padding: "2px 0", width: "100%", textAlign: "center" }}
                  >−</div>
                </div>

              </div>{/* /viewer area */}

              {/* ── Bottom panel ── */}
              <div style={{ flexShrink: 0, background: "#fff" }}>
                {/* Size row ‹ M › */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "1px 16px 1px" }}>
                  <button
                    onClick={() => { const i = SIZES.indexOf(size as any); if (i > 0) setSize(SIZES[i - 1]); }}
                    style={{ width: 22, height: 22, background: "transparent", border: "none", fontSize: 18, color: "#111", cursor: "pointer", lineHeight: 1, padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >‹</button>
                  <span style={{ 
                    minWidth: 40, padding: "4px 12px",
                    textAlign: "center", fontSize: 13, fontWeight: 700,
                    color: "#fff", background: "#3b82f6",
                    borderRadius: 4
                  }}>{size}</span>
                  <button
                    onClick={() => { const i = SIZES.indexOf(size as any); if (i < SIZES.length - 1) setSize(SIZES[i + 1]); }}
                    style={{ width: 22, height: 22, background: "transparent", border: "none", fontSize: 18, color: "#111", cursor: "pointer", lineHeight: 1, padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >›</button>
                </div>

                {/* Thumbnails row */}
                <div style={{
                  display: "flex", gap: 6,
                  padding: "2px 10px 2px",
                  overflowX: "auto", overflowY: "hidden",
                  scrollbarWidth: "none",
                }}>
                  {currentCatAssets.map((asset) => {
                    const isSel = activeAssets.has(asset.id);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => toggleAsset(asset.id)}
                        style={{
                          width: 38, minWidth: 38, height: 38, borderRadius: 7,
                          background: "#fff",
                          border: `2px solid ${isSel ? "#3b82f6" : "#e5e7eb"}`,
                          display: "flex",
                          alignItems: "center", justifyContent: "center",
                          cursor: "pointer", flexShrink: 0,
                          boxSizing: "border-box",
                        }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 3, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#9ca3af" }}>3D</div>
                      </div>
                    );
                  })}
                </div>

                {/* Category tabs */}
                <div style={{ display: "flex", gap: 2, padding: "2px 10px 5px" }}>
                  {CATEGORIES.map((cat) => {
                    const isActive = cat === activeCategory;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                          padding: "3px 8px", fontSize: 9,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? "#fff" : "#374151",
                          background: isActive ? "#111" : "transparent",
                          border: "none", borderRadius: 99,
                          cursor: "pointer", whiteSpace: "nowrap",
                          flexShrink: 0, outline: "none",
                        }}
                      >{cat}</button>
                    );
                  })}
                </div>
              </div>

            </div>{/* /bottom sheet */}
          </div>
        </PhoneFrame>
      </div>

      {/* Debug info */}
      <p className="text-xs text-gray-400">
        身長: {height}cm　サイズ: {size}　着用: {[...activeAssets].join(", ")}
      </p>
    </div>
  );
}
