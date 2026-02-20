import { useState } from "react";
import { authenticatedFetch } from "@/lib/auth/api-client";

export interface BodyMeasurements {
  height: number;
  chest: number;
  waist: number;
  hip: number;
  shoulder: number;
  armLength: number;
  legLength: number;
  neck?: number;
  sleeve?: number;
  inseam?: number;
  skinTone?: number; // 肌色 (0.0 = 最も明るい, 1.0 = 最も濃い)
}

export function useModelGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);

  const generateModel = async (measurements: BodyMeasurements) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedModelUrl(null);

    try {
      const response = await authenticatedFetch("/api/model/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ measurements }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate model");
      }

      const data = await response.json();
      setGeneratedModelUrl(data.modelUrl);
      return data.modelUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateModel,
    isGenerating,
    error,
    generatedModelUrl,
  };
}
