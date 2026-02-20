"use client";

import { useState, useEffect } from "react";
import { MeasurementForm } from "@/components/model/MeasurementForm";
import { PreviewPanel } from "@/features/preview/PreviewPanel";
import { useModelGeneration, type BodyMeasurements } from "@/hooks/useModelGeneration";
import { toast } from "sonner";

export default function ModelGeneratePage() {
  const { generateModel, isGenerating, error, generatedModelUrl } = useModelGeneration();
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleGenerate = async (measurements: BodyMeasurements) => {
    try {
      const modelUrl = await generateModel(measurements);
      toast.success("モデルが生成されました");
    } catch (err) {
      toast.error(error || "モデル生成に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">カスタムモデル生成</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <MeasurementForm onSubmit={handleGenerate} isLoading={isGenerating} />
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
        <div>
          {isGenerating ? (
            <div className="h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              <div className="text-center">
                <p className="text-gray-700 font-medium">モデルを生成中...</p>
                <p className="text-sm text-gray-500 mt-2">
                  アバター作成 → エクスポート処理中
                  <br />
                  <span className="text-xs">通常30-60秒かかります</span>
                </p>
              </div>
            </div>
          ) : generatedModelUrl ? (
            <div className="h-[600px]">
              <PreviewPanel
                selectedProduct={selectedProduct || undefined}
                customModelUrl={generatedModelUrl}
              />
            </div>
          ) : (
            <div className="h-[600px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">モデルを生成するとここに表示されます</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
