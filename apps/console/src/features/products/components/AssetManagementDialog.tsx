"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createAssetSchema, type ProductSize, type Asset } from "@atelier/shared";
import { Package, Plus, Trash2, Upload, Edit, X } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// versionは自動設定されるため、フォームから除外
// createAssetSchemaからversionを除外
const assetFormSchema = createAssetSchema.omit({ 
  version: true,
});

type AssetFormData = z.infer<typeof assetFormSchema>;

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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingGlb, setUploadingGlb] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      productId,
      size: "M",
      glbUrl: "",
      isActive: true,
    } as AssetFormData,
  });

  const selectedSize = watch("size");
  const glbUrl = watch("glbUrl");

  const handleGlbFileUpload = async (file: File) => {
    setUploadingGlb(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "glb");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        let errorMessage = error.details 
          ? `${error.error}: ${error.details}${error.hint ? `\n\nヒント: ${error.hint}` : ""}`
          : error.error || "アップロードに失敗しました";
        
        // 利用可能なバケット一覧がある場合は追加
        if (error.availableBuckets && error.availableBuckets.length > 0) {
          errorMessage += `\n\n利用可能なバケット: ${error.availableBuckets.join(", ")}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setValue("glbUrl", data.url, { shouldValidate: true });
      toast.success("GLBファイルをアップロードしました");
    } catch (error) {
      console.error("Failed to upload GLB file:", error);
      const errorMessage = error instanceof Error ? error.message : "アップロードに失敗しました";
      toast.error(errorMessage);
    } finally {
      setUploadingGlb(false);
    }
  };

  // Fetch assets when dialog opens
  useEffect(() => {
    if (open) {
      fetchAssets();
    }
  }, [open, productId]);

  const fetchAssets = async () => {
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
  };

  const onSubmit = async (data: AssetFormData) => {
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
      reset();
      await fetchAssets();
      onAssetAdded?.();
    } catch (error) {
      console.error("Error creating asset:", error);
      toast.error(
        error instanceof Error ? error.message : "アセットの追加に失敗しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAsset = async (assetId: string, updates: { glbUrl?: string; thumbnailUrl?: string; isActive?: boolean }) => {
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
  };

  const handleDeleteAsset = async (assetId: string) => {
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
  };

  // Group assets by size
  const assetsBySize = assets.reduce((acc, asset) => {
    if (!acc[asset.size]) {
      acc[asset.size] = [];
    }
    acc[asset.size].push(asset);
    return acc;
  }, {} as Record<ProductSize, Asset[]>);

  // Get latest version for each size
  const latestAssets = Object.entries(assetsBySize).map(([size, sizeAssets]) => {
    const latest = sizeAssets.reduce((prev, current) =>
      current.version > prev.version ? current : prev
    );
    return { size: size as ProductSize, asset: latest };
  });

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
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm">新しいアセットを追加</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="size">サイズ</Label>
                  <Select
                    value={selectedSize}
                    onValueChange={(value: ProductSize) => {
                      setValue("size", value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* レターサイズ */}
                      <SelectItem value="XS">XS</SelectItem>
                      <SelectItem value="S">S</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="XL">XL</SelectItem>
                      <SelectItem value="XXL">XXL</SelectItem>
                      {/* 数字サイズ */}
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      {/* ウエストサイズ */}
                      <SelectItem value="28">28</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="32">32</SelectItem>
                      <SelectItem value="34">34</SelectItem>
                      <SelectItem value="36">36</SelectItem>
                      <SelectItem value="38">38</SelectItem>
                      {/* フリーサイズ */}
                      <SelectItem value="FREE">FREE</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                      {/* 靴サイズ */}
                      <SelectItem value="39">39</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                      <SelectItem value="41">41</SelectItem>
                      <SelectItem value="42">42</SelectItem>
                      <SelectItem value="43">43</SelectItem>
                      <SelectItem value="44">44</SelectItem>
                      <SelectItem value="45">45</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.size && (
                    <p className="text-sm text-red-500">{errors.size.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="glbUrl">GLB URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="glbUrl"
                      placeholder="https://example.com/model.glb またはファイルをアップロード"
                      {...register("glbUrl")}
                      className="flex-1"
                    />
                    <div className="flex-shrink-0">
                      <input
                        id="glbFile"
                        type="file"
                        accept=".glb,model/gltf-binary"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleGlbFileUpload(file);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingGlb}
                        size="icon"
                        title={uploadingGlb ? "アップロード中..." : "GLBファイルをアップロード"}
                        onClick={() => {
                          document.getElementById("glbFile")?.click();
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {errors.glbUrl && (
                    <p className="text-sm text-red-500">
                      {errors.glbUrl.message}
                    </p>
                  )}
                  {glbUrl && (
                    <p className="text-xs text-gray-500 truncate">
                      アップロード済み: {glbUrl}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="sm:justify-start">
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {isSubmitting ? "追加中..." : "アセットを追加"}
                </Button>
              </DialogFooter>
            </form>
          </div>

          {/* アセット一覧 */}
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">登録済みアセット</h3>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                読み込み中...
              </div>
            ) : assets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                アセットが登録されていません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">サイズ</TableHead>
                      <TableHead className="whitespace-nowrap">バージョン</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[300px]">GLB URL</TableHead>
                      <TableHead className="whitespace-nowrap">状態</TableHead>
                      <TableHead className="whitespace-nowrap">作成日時</TableHead>
                      <TableHead className="text-right whitespace-nowrap">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets
                      .sort((a, b) => {
                        if (a.size !== b.size) {
                          return a.size.localeCompare(b.size);
                        }
                        return b.version - a.version;
                      })
                      .map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">
                            {asset.size}
                          </TableCell>
                          <TableCell>v{asset.version}</TableCell>
                          <TableCell>
                            {editingAssetId === asset.id ? (
                              <Input
                                defaultValue={asset.glbUrl}
                                onBlur={(e) => {
                                  if (e.target.value !== asset.glbUrl) {
                                    handleUpdateAsset(asset.id, { glbUrl: e.target.value });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  }
                                  if (e.key === "Escape") {
                                    setEditingAssetId(null);
                                  }
                                }}
                                className="text-sm"
                                autoFocus
                              />
                            ) : (
                              <a
                                href={asset.glbUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm truncate max-w-xs block"
                              >
                                {asset.glbUrl}
                              </a>
                            )}
                          </TableCell>
                          <TableCell>
                            {asset.isActive ? (
                              <span className="text-sm text-green-600">有効</span>
                            ) : (
                              <span className="text-sm text-gray-400">無効</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(asset.createdAt).toLocaleString("ja-JP")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (editingAssetId === asset.id) {
                                    setEditingAssetId(null);
                                  } else {
                                    setEditingAssetId(asset.id);
                                  }
                                }}
                                className="gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                {editingAssetId === asset.id ? "キャンセル" : "編集"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteAsset(asset.id)}
                                disabled={deletingAssetId === asset.id}
                                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                                {deletingAssetId === asset.id ? "削除中..." : "削除"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 最新バージョンサマリー */}
            {latestAssets.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <h4 className="text-sm font-semibold mb-2">最新バージョン（サイズ別）</h4>
                <div className="flex gap-2 flex-wrap">
                  {latestAssets.map(({ size, asset }) => (
                    <div
                      key={size}
                      className="px-3 py-1 bg-white border rounded text-sm"
                    >
                      <span className="font-medium">{size}:</span> v{asset.version}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
