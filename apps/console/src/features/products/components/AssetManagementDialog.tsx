"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Package } from "lucide-react";
import { useAssetsManagement } from "../hooks/useAssetsManagement";
import { AssetUploadForm } from "./AssetUploadForm";
import { AssetList } from "./AssetList";

interface AssetManagementDialogProps {
  productId: string;
  productName: string;
  onAssetAdded?: () => void;
}

export function AssetManagementDialog({
  productId,
  productName,
  onAssetAdded,
}: AssetManagementDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    assets,
    isLoading,
    isSubmitting,
    editingAssetId,
    deletingAssetId,
    setEditingAssetId,
    createAsset,
    updateAsset,
    deleteAsset,
  } = useAssetsManagement({ productId, onAssetAdded });

  const handleUpdateGlbUrl = (assetId: string, glbUrl: string) => {
    updateAsset(assetId, { glbUrl });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Package className="h-4 w-4" />
          アセット管理
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>3Dアセット管理 - {productName}</DialogTitle>
          <DialogDescription>
            商品の3Dモデル（GLBファイル）をサイズ別に管理します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* アセット追加フォーム */}
          <AssetUploadForm
            productId={productId}
            onSubmit={createAsset}
            isSubmitting={isSubmitting}
          />

          {/* アセット一覧 */}
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">登録済みアセット</h3>
            </div>
            <AssetList
              assets={assets}
              isLoading={isLoading}
              editingAssetId={editingAssetId}
              deletingAssetId={deletingAssetId}
              onEdit={setEditingAssetId}
              onCancelEdit={() => setEditingAssetId(null)}
              onUpdate={handleUpdateGlbUrl}
              onDelete={deleteAsset}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
