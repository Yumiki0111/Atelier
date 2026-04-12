"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { FileText, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomGarmentData, GarmentType } from "../lib/types";
import { applyGenericSymmetricTopFromSvgText } from "./FittingControlsGenericSvgApply";

export function FittingControlsSvgUploadSection({
  hasUploadedGenericSvg,
  onGarmentChange,
  onCustomGarmentApply,
}: {
  hasUploadedGenericSvg: boolean;
  onGarmentChange: (g: GarmentType) => void;
  onCustomGarmentApply: (data: CustomGarmentData) => void;
}) {
  const svgInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingSvg, setIsDraggingSvg] = useState(false);

  const applySvgText = useCallback(
    (text: string) => {
      applyGenericSymmetricTopFromSvgText(text, {
        onGarmentChange,
        onCustomGarmentApply,
        setUploadError,
      });
    },
    [onCustomGarmentApply, onGarmentChange]
  );

  const onSvgFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => applySvgText(reader.result as string);
      reader.readAsText(file);
    },
    [applySvgText]
  );

  const onSvgInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      onSvgFile(file);
      e.target.value = "";
    },
    [onSvgFile]
  );

  return (
    <div className="shrink-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">参照 SVG</span>
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <input
        ref={svgInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={onSvgInputChange}
      />
      <button
        type="button"
        aria-label="SVG ファイルを選択またはドロップ"
        onClick={() => svgInputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDraggingSvg(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDraggingSvg(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingSvg(false);
          const f = e.dataTransfer.files?.[0];
          if (f && (f.type === "image/svg+xml" || f.name.toLowerCase().endsWith(".svg"))) {
            onSvgFile(f);
          } else {
            setUploadError(".svg ファイルをドロップしてください");
          }
        }}
        className={cn(
          "flex min-h-[96px] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted/40 px-3 py-3 text-center transition-colors",
          isDraggingSvg
            ? "border-primary bg-accent"
            : "hover:border-primary/50 hover:bg-muted/60"
        )}
      >
        <ImagePlus className="h-9 w-9 text-muted-foreground" strokeWidth={1.25} aria-hidden />
        {hasUploadedGenericSvg ? (
          <span className="text-[10px] font-medium text-foreground">読込済み · クリックで差し替え</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">クリックまたはドロップ</span>
        )}
      </button>
      {uploadError ? <p className="text-center text-[10px] text-red-600">{uploadError}</p> : null}
    </div>
  );
}
