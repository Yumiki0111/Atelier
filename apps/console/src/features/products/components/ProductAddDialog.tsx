"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAddProduct } from "../useProducts";
import { createProductSchema, productCategorySchema, type ProductCategory } from "@atelier/shared";
import { Plus, Upload, X } from "lucide-react";
import { z } from "zod";

import { useAuth } from "@/contexts/AuthContext";

const productFormSchema = createProductSchema.extend({
  // Form-specific fields can be added here if needed
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductAddDialogProps {
  onProductAdded?: () => void;
}

export function ProductAddDialog({ onProductAdded }: ProductAddDialogProps) {
  const [open, setOpen] = useState(false);
  const addProduct = useAddProduct();
  const { shopId } = useAuth();
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      shopId,
    },
  });

  const selectedCategory = watch("category");
  const thumbnailUrl = watch("thumbnailUrl");
  const previewImageUrl = watch("previewImageUrl");

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
    }
  };

  const handleFileUpload = async (file: File, type: "thumbnail" | "preview") => {
    const setUploading = type === "thumbnail" ? setUploadingThumbnail : setUploadingPreview;
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "images");

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
      
      if (data.warning) {
        console.warn("Upload warning:", data.warning);
        alert(`アップロード成功: ${data.warning}`);
      }
      
      if (type === "thumbnail") {
        setValue("thumbnailUrl", data.url, { shouldValidate: true });
      } else {
        setValue("previewImageUrl", data.url, { shouldValidate: true });
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      const errorMessage = error instanceof Error ? error.message : "アップロードに失敗しました";
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      // 空文字列をundefinedに変換
      const cleanedData = {
        shopId: data.shopId,
        name: data.name,
        brand: data.brand && data.brand.trim() !== "" ? data.brand : undefined,
        category: data.category,
        sku: data.sku && data.sku.trim() !== "" ? data.sku : undefined,
        handle: data.handle && data.handle.trim() !== "" ? data.handle : undefined,
        url: data.url && data.url.trim() !== "" ? data.url : undefined,
        sizeTypeId: data.sizeTypeId && data.sizeTypeId.trim() !== "" ? data.sizeTypeId : undefined,
        thumbnailUrl: data.thumbnailUrl && data.thumbnailUrl.trim() !== "" ? data.thumbnailUrl : undefined,
        previewImageUrl: data.previewImageUrl && data.previewImageUrl.trim() !== "" ? data.previewImageUrl : undefined,
        description: data.description && data.description.trim() !== "" ? data.description : undefined,
      };
      
      await addProduct.mutateAsync(cleanedData);
      reset();
      setOpen(false);
      onProductAdded?.();
    } catch (error) {
      console.error("Failed to add product:", error);
      const errorMessage = error instanceof Error ? error.message : "商品の追加に失敗しました";
      alert(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          商品を追加
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>商品を追加</DialogTitle>
          <DialogDescription>
            新しい商品の情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto space-y-4 min-w-0 px-6 pb-6">
          <div className="space-y-2 min-w-0">
            <Label htmlFor="name">商品名</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="商品名を入力"
              className="w-full"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="brand">ブランド（任意）</Label>
            <Input
              id="brand"
              {...register("brand")}
              placeholder="ブランド名を入力"
              className="w-full"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="category">カテゴリ（任意）</Label>
            <Select
              value={selectedCategory || ""}
              onValueChange={(value: ProductCategory) =>
                setValue("category", value, { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ジャケット">ジャケット</SelectItem>
                <SelectItem value="コート">コート</SelectItem>
                <SelectItem value="トップス">トップス</SelectItem>
                <SelectItem value="ボトムス">ボトムス</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="sku">SKU（任意）</Label>
            <Input
              id="sku"
              {...register("sku")}
              placeholder="SKUを入力"
              className="w-full"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="handle">Handle（任意）</Label>
            <Input
              id="handle"
              {...register("handle")}
              placeholder="handleを入力"
              className="w-full"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="url">URL（任意）</Label>
            <Input
              id="url"
              {...register("url")}
              placeholder="https://..."
              className="w-full"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="sizeTypeId">サイズタイプID（任意）</Label>
            <Input
              id="sizeTypeId"
              {...register("sizeTypeId")}
              placeholder="空UUID形式で入力"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              入力する場合は、サイズタイプのUUIDを入力してください（例: レターサイズ、数字サイズなど）。空欄のままでも登録できます。
            </p>
            {errors.sizeTypeId && (
              <p className="text-sm text-red-500">{errors.sizeTypeId.message}</p>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="thumbnailUrl">サムネイル画像（任意）</Label>
            <div className="flex gap-2">
              <Input
                id="thumbnailUrl"
                {...register("thumbnailUrl")}
                placeholder="https://... またはファイルをアップロード"
                className="w-full"
              />
              <div className="flex-shrink-0">
                <input
                  id="thumbnailFile"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, "thumbnail");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingThumbnail}
                  size="icon"
                  title={uploadingThumbnail ? "アップロード中..." : "ファイルをアップロード"}
                  onClick={() => {
                    document.getElementById("thumbnailFile")?.click();
                  }}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {thumbnailUrl && (
              <div className="relative inline-block mt-2">
                <img
                  src={thumbnailUrl}
                  alt="サムネイルプレビュー"
                  className="h-20 w-20 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => setValue("thumbnailUrl", "")}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="previewImageUrl">プレビュー画像（任意）</Label>
            <div className="flex gap-2">
              <Input
                id="previewImageUrl"
                {...register("previewImageUrl")}
                placeholder="https://... またはファイルをアップロード"
                className="w-full"
              />
              <div className="flex-shrink-0">
                <input
                  id="previewFile"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, "preview");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingPreview}
                  size="icon"
                  title={uploadingPreview ? "アップロード中..." : "ファイルをアップロード"}
                  onClick={() => {
                    document.getElementById("previewFile")?.click();
                  }}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {previewImageUrl && (
              <div className="relative inline-block mt-2">
                <img
                  src={previewImageUrl}
                  alt="プレビュー画像"
                  className="h-20 w-20 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => setValue("previewImageUrl", "")}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="description">商品説明（任意）</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="商品の詳細な説明を入力してください"
              className="min-h-[100px]"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={addProduct.isPending}>
              {addProduct.isPending ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
