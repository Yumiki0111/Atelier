"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { FileText, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomGarmentData, GarmentType } from "../lib/types";
import { applyGenericSymmetricTopFromSvgText } from "./FittingControlsGenericSvgApply";

export function FittingControlsSvgUploadSection({
  hasUploadedGenericSvg,
  presetSizeKey,
  onGarmentChange,
  onCustomGarmentApply,
}: {
  hasUploadedGenericSvg: boolean;
  presetSizeKey: "3" | "4" | "5";
  onGarmentChange: (g: GarmentType) => void;
  onCustomGarmentApply: (data: CustomGarmentData) => void;
}) {
  const svgInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingSvg, setIsDraggingSvg] = useState(false);

  const applySvgText = useCallback(
    (text: string) => {
      applyGenericSymmetricTopFromSvgText(text, presetSizeKey, {
        onGarmentChange,
        onCustomGarmentApply,
        setUploadError,
      });
    },
    [presetSizeKey, onCustomGarmentApply, onGarmentChange]
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
        <span className="text-[12px] font-medium text-slate-700">参照 SVG</span>
        <FileText className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
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
          "flex min-h-[96px] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed bg-slate-50/80 px-3 py-3 text-center transition-colors",
          isDraggingSvg
            ? "border-sky-400 bg-sky-50/90"
            : "border-slate-300/90 hover:border-sky-300 hover:bg-slate-50"
        )}
      >
        <ImagePlus className="h-9 w-9 text-slate-400" strokeWidth={1.25} aria-hidden />
        {hasUploadedGenericSvg ? (
          <span className="text-[10px] font-medium text-sky-700">読込済み · クリックで差し替え</span>
        ) : (
          <span className="text-[10px] text-slate-500">クリックまたはドロップ</span>
        )}
      </button>
      {uploadError ? <p className="text-center text-[10px] text-red-600">{uploadError}</p> : null}
    </div>
  );
}
