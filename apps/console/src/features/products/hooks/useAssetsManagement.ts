import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth/api-client";
import type { Asset } from "@atelier/shared";

interface UseAssetsManagementOptions {
  productId: string;
  onAssetAdded?: () => void;
}

export function useAssetsManagement({ productId, onAssetAdded }: UseAssetsManagementOptions) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/assets?productId=${productId}`);
      if (!response.ok) {
        const error = await response.json();
        if (error.error === "Database not configured") {
          toast.info("データベースが設定されていません。環境変数を設定してください。");
          setAssets([]);
          return;
        }
        // UUID形式エラーの場合、より詳細なメッセージを表示
        if (error.error?.includes("Invalid productId format")) {
          console.error("Invalid productId:", productId, error.details);
          toast.error(
            `商品IDの形式が正しくありません。UUID形式が必要です。\n${error.details || ""}`
          );
          setAssets([]);
          return;
        }
        throw new Error(error.error || "Failed to fetch assets");
      }
      const data = await response.json();
      setAssets(data);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "アセットの取得に失敗しました"
      );
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]); // fetchAssetsが変更されたときに再取得（productIdが変更されるとfetchAssetsも再作成される）

  const createAsset = useCallback(async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await authenticatedFetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.error === "Database not configured") {
          throw new Error("データベースが設定されていません。環境変数を設定してください。");
        }
        throw new Error(error.error || "Failed to create asset");
      }

      toast.success("アセットを追加しました");
      await fetchAssets();
      onAssetAdded?.();
      return true;
    } catch (error) {
      console.error("Error creating asset:", error);
      toast.error(
        error instanceof Error ? error.message : "アセットの追加に失敗しました"
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchAssets, onAssetAdded]);

  const updateAsset = useCallback(async (assetId: string, updates: { glbUrl?: string; thumbnailUrl?: string; isActive?: boolean }) => {
    try {
      const response = await authenticatedFetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "アセットの更新に失敗しました");
      }

      toast.success("アセットを更新しました");
      setEditingAssetId(null);
      await fetchAssets();
      onAssetAdded?.();
    } catch (error) {
      console.error("Error updating asset:", error);
      toast.error(
        error instanceof Error ? error.message : "アセットの更新に失敗しました"
      );
    }
  }, [fetchAssets, onAssetAdded]);

  const deleteAsset = useCallback(async (assetId: string) => {
    if (!confirm("このアセットを削除してもよろしいですか？")) {
      return;
    }

    setDeletingAssetId(assetId);
    try {
      const response = await authenticatedFetch(`/api/assets/${assetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "アセットの削除に失敗しました");
      }

      toast.success("アセットを削除しました");
      await fetchAssets();
      onAssetAdded?.();
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error(
        error instanceof Error ? error.message : "アセットの削除に失敗しました"
      );
    } finally {
      setDeletingAssetId(null);
    }
  }, [fetchAssets, onAssetAdded]);

  return {
    assets,
    isLoading,
    isSubmitting,
    editingAssetId,
    deletingAssetId,
    setEditingAssetId,
    fetchAssets,
    createAsset,
    updateAsset,
    deleteAsset,
  };
}
