"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const PREVIEW_SIZE = 280;
const EXPORT_SIZE = 512;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function computeLayout(
  iw: number,
  ih: number,
  zoom: number,
  panX: number,
  panY: number,
  S: number
) {
  const base = Math.max(S / iw, S / ih);
  const dw = iw * base * zoom;
  const dh = ih * base * zoom;
  const left = (S - dw) / 2 + panX;
  const top = (S - dh) / 2 + panY;
  return { base, dw, dh, left, top };
}

/**
 * Pan range: image edges can reach the square preview frame.
 * left = (S-dw)/2 + panX stays in [S-dw, 0] (panX in [-|S-dw|/2, |S-dw|/2]).
 */
function clampPan(
  panX: number,
  panY: number,
  dw: number,
  dh: number,
  S: number
) {
  const halfX = Math.abs(S - dw) / 2;
  const halfY = Math.abs(S - dh) / 2;
  return {
    panX: clamp(panX, -halfX, halfX),
    panY: clamp(panY, -halfY, halfY),
  };
}

/** Square thumbnail export (no circular mask). */
export function exportThumbnailCropBlob(
  image: HTMLImageElement,
  zoom: number,
  panX: number,
  panY: number,
  previewSize: number,
  exportSize: number
): Promise<Blob> {
  const S = previewSize;
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const { dw, dh, left, top } = computeLayout(iw, ih, zoom, panX, panY, S);

  const canvas = document.createElement("canvas");
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas 2D context を取得できません"));
  }
  const scale = exportSize / S;
  ctx.scale(scale, scale);
  ctx.drawImage(image, left, top, dw, dh);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error("画像の書き出しに失敗しました")),
      "image/png",
      0.92
    );
  });
}

interface CircularImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onConfirm: (blob: Blob, fileName: string) => void;
}

export function CircularImageCropDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
}: CircularImageCropDialogProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const cropRef = useRef(crop);
  cropRef.current = crop;

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  } | null>(null);
  const dragListenersCleanupRef = useRef<(() => void) | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  imgRef.current = img;

  const S = PREVIEW_SIZE;
  const iw = img?.naturalWidth ?? 1;
  const ih = img?.naturalHeight ?? 1;
  const { zoom, panX, panY } = crop;
  const { dw, dh, left, top } = computeLayout(iw, ih, zoom, panX, panY, S);

  useEffect(() => {
    if (!file || !open) {
      setImg(null);
      setCrop({ zoom: 1, panX: 0, panY: 0 });
      setLoadError(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setCrop({ zoom: 1, panX: 0, panY: 0 });
      setLoadError(null);
    };
    image.onerror = () => {
      setImg(null);
      setLoadError("画像を読み込めませんでした");
    };
    image.src = url;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, open]);

  const handleZoomChange = (values: number[]) => {
    const z = values[0] ?? ZOOM_MIN;
    setCrop((prev) => {
      const image = imgRef.current;
      if (!image) return { ...prev, zoom: z };
      const iw0 = image.naturalWidth;
      const ih0 = image.naturalHeight;
      const { dw: ndw, dh: ndh } = computeLayout(
        iw0,
        ih0,
        z,
        prev.panX,
        prev.panY,
        S
      );
      const c = clampPan(prev.panX, prev.panY, ndw, ndh, S);
      return { zoom: z, panX: c.panX, panY: c.panY };
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imgRef.current || e.button !== 0) return;
    e.preventDefault();
    const cr = cropRef.current;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originPanX: cr.panX,
      originPanY: cr.panY,
    };

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      const image = imgRef.current;
      if (!d || ev.pointerId !== d.pointerId || !image) return;
      const z = cropRef.current.zoom;
      const iw0 = image.naturalWidth;
      const ih0 = image.naturalHeight;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      const nx = d.originPanX + dx;
      const ny = d.originPanY + dy;
      const { dw: ndw, dh: ndh } = computeLayout(iw0, ih0, z, nx, ny, S);
      const c = clampPan(nx, ny, ndw, ndh, S);
      setCrop((prev) => ({ ...prev, panX: c.panX, panY: c.panY }));
    };

    const remove = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      dragListenersCleanupRef.current = null;
      dragRef.current = null;
    };

    const onUp = (ev: PointerEvent) => {
      if (!dragRef.current || ev.pointerId !== dragRef.current.pointerId) return;
      remove();
    };

    dragListenersCleanupRef.current = remove;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const handleConfirm = async () => {
    const image = imgRef.current;
    const cr = cropRef.current;
    if (!image || !file) return;
    try {
      const blob = await exportThumbnailCropBlob(
        image,
        cr.zoom,
        cr.panX,
        cr.panY,
        PREVIEW_SIZE,
        EXPORT_SIZE
      );
      const base = file.name.replace(/\.[^.]+$/, "") || "thumbnail";
      const fileName = `${base}.png`;
      onConfirm(blob, fileName);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "書き出しに失敗しました");
    }
  };

  const handleDialogOpenChange = (next: boolean) => {
    if (!next) {
      dragListenersCleanupRef.current?.();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="z-[100] max-w-[min(100vw-2rem,24rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>サムネイルのトリミング</DialogTitle>
          <DialogDescription>
            ドラッグで位置、スライダーで拡大してから確定してください。正方形の画像として保存されます。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative cursor-grab touch-none overflow-hidden rounded-2xl bg-muted ring-2 ring-border select-none active:cursor-grabbing"
            style={{ width: S, height: S, touchAction: "none" }}
            onPointerDown={handlePointerDown}
          >
            {loadError ? (
              <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-destructive">
                {loadError}
              </div>
            ) : img ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob preview
              <img
                src={img.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{
                  width: dw,
                  height: dh,
                  left,
                  top,
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                読み込み中…
              </div>
            )}
          </div>

          <div className="w-full space-y-2 px-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>拡大</span>
              <span>{zoom.toFixed(2)}×</span>
            </div>
            <Slider
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.01}
              value={[zoom]}
              onValueChange={handleZoomChange}
              disabled={!img || !!loadError}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDialogOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!img || !!loadError}
          >
            この範囲でアップロード
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
