"use client";

import { useQuery } from "@tanstack/react-query";
import type { Asset } from "@atelier/shared";

async function fetchAssets(productId: string): Promise<Asset[]> {
  const response = await fetch(`/api/assets?productId=${productId}`);
  if (!response.ok) {
    // データベースが設定されていない場合は空配列を返す
    if (response.status === 500) {
      const error = await response.json();
      if (error.error === "Database not configured") {
        return [];
      }
    }
    throw new Error("Failed to fetch assets");
  }
  return response.json();
}

export function useAssets(productId: string | undefined) {
  return useQuery<Asset[]>({
    queryKey: ["assets", productId],
    queryFn: () => fetchAssets(productId!),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
}
