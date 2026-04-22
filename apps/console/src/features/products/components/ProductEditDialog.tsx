"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProduct, useProduct } from "../useProducts";
import { useAssets } from "../useAssets";
import { createProductSchema } from "@Atelier/shared";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  canEditGarmentSizePresets,
  mergeGarmentSpecSizePresets,
  parseGarmentSizePresets,
  type GarmentSizePresetRow,
} from "@/lib/products/parseGarmentSizePresets";
import { CircularImageCropDialog } from "@/features/products/components/CircularImageCropDialog";

const productFormSchema = createProductSchema.extend({
  // Form-specific fields can be added here if needed
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductEditDialogProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated?: () => void;
}

export function ProductEditDialog({
  productId,
  open,
  onOpenChange,
  onProductUpdated,
}: ProductEditDialogProps) {
  const updateProduct = useUpdateProduct();
  const { data: product, isLoading } = useProduct(productId);
  const { data: assets } = useAssets(productId);
  const { shopId } = useAuth();
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [thumbnailCropFile, setThumbnailCropFile] = useState<File | null>(null);
  const [presetDrafts, setPresetDrafts] = useState<GarmentSizePresetRow[]>([]);
  const [priceYenInput, setPriceYenInput] = useState("");

  const canEditMeasures = useMemo(
    () => canEditGarmentSizePresets(product?.garmentSpec),
    [product?.garmentSpec]
  );

  const presetReadOnly = useMemo(
    () => parseGarmentSizePresets(product?.garmentSpec),
    [product?.garmentSpec]
  );

  useEffect(() => {
    if (product && open) {
      setPresetDrafts(parseGarmentSizePresets(product.garmentSpec));
    }
  }, [product, open]);

  const assetSizeLabelsOnly = useMemo(() => {
    const set = new Set<string>();
    for (const a of assets ?? []) {
      if (a.size?.trim()) set.add(a.size.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [assets]);

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

  const thumbnailUrl = watch("thumbnailUrl");

  // 商品データが読み込まれたらフォームに設定
  // open を依存配列に含めることで、ダイアログを閉じて再度開いた際にも再セットされる
  useEffect(() => {
    if (product && open) {
      setValue("shopId", product.shopId);
      setValue("name", product.name);
      setValue("externalProductId", product.externalProductId || "");
      setValue("brand", product.brand || "");
      setValue("category", product.category ?? undefined);
      setValue("thumbnailUrl", product.thumbnailUrl || "");
      setPriceYenInput(
        product.priceYen != null && Number.isFinite(product.priceYen)
          ? String(product.priceYen)
          : ""
      );
    }
  }, [product, setValue, open]);

  const handleFileUpload = async (file: File) => {
    setUploadingThumbnail(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "images");

      const response = await authenticatedFetch("/api/upload", {
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
        toast.info(`アップロード成功: ${data.warning}`);
      }
      
      setValue("thumbnailUrl", data.url, { shouldValidate: true });
    } catch (error) {
      console.error("Failed to upload file:", error);
      const errorMessage = error instanceof Error ? error.message : "アップロードに失敗しました";
      toast.error(errorMessage);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      reset();
      setPriceYenInput("");
      setCropOpen(false);
      setThumbnailCropFile(null);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!product) return;
    try {
      // 一覧 UI と同じ項目のみ編集。ブランド・カテゴリは一覧に無いため既存値を維持
      const priceTrim = priceYenInput.replace(/,/g, "").trim();
      let priceYen: number | null;
      if (priceTrim === "") {
        priceYen = null;
      } else {
        const n = Math.round(Number(priceTrim));
        if (!Number.isFinite(n) || n < 0) {
          toast.error("金額は0以上の整数（円）で入力してください");
          return;
        }
        priceYen = n;
      }

      const cleanedData = {
        name: data.name,
        externalProductId:
          data.externalProductId && data.externalProductId.trim() !== ""
            ? data.externalProductId
            : undefined,
        brand: product.brand && product.brand.trim() !== "" ? product.brand : undefined,
        category: product.category ?? undefined,
        thumbnailUrl:
          data.thumbnailUrl && data.thumbnailUrl.trim() !== "" ? data.thumbnailUrl : undefined,
        priceYen,
      };

      const sanitizedPresets = presetDrafts
        .filter((r) => r.label.trim().length > 0)
        .map((r) => ({
          label: r.label.trim(),
          lengthCm: Number(r.lengthCm),
          sleeveCm: Number(r.sleeveCm),
        }))
        .filter((r) => Number.isFinite(r.lengthCm) && Number.isFinite(r.sleeveCm));

      await updateProduct.mutateAsync({
        id: productId,
        updates: {
          ...cleanedData,
          ...(canEditMeasures
            ? {
                garmentSpec: mergeGarmentSpecSizePresets(
                  product.garmentSpec,
                  sanitizedPresets
                ),
              }
            : {}),
        },
      });
      reset();
      handleOpenChange(false);
      toast.success("商品を更新しました");
      onProductUpdated?.();
    } catch (error) {
      console.error("Failed to update product:", error);
      const errorMessage = error instanceof Error ? error.message : "商品の更新に失敗しました";
      toast.error(errorMessage);
    }
  };

  return (
    <>
    {isLoading ? (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>商品を編集</DialogTitle>
            <DialogDescription>読み込み中...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ) : (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>商品を編集</DialogTitle>
          <DialogDescription>
            画像・商品名・外部商品ID・金額、および開発フィットのサイズ寸法（着丈・袖）を編集できます。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto space-y-4 min-w-0 px-6 pb-6">
          <div className="space-y-2 min-w-0">
            <Label>画像</Label>
            <input type="hidden" {...register("thumbnailUrl")} />
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="product-edit-thumbnail-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) {
                    setThumbnailCropFile(file);
                    setCropOpen(true);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadingThumbnail}
                className="gap-2"
                title={uploadingThumbnail ? "アップロード中..." : "画像をアップロード"}
                onClick={() => {
                  document.getElementById("product-edit-thumbnail-file")?.click();
                }}
              >
                <Upload className="h-4 w-4" />
                {uploadingThumbnail ? "アップロード中..." : "画像をアップロード"}
              </Button>
              <p className="text-xs text-muted-foreground">
                開発の商品登録と同じ手順で、トリミング後にアップロードされます。一覧では円形に表示されます。
              </p>
            </div>
            {thumbnailUrl ? (
              <div className="relative mt-2 w-full max-w-[200px]">
                <div
                  className={cn(
                    "flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border border-black/5 bg-stone-100 p-0"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl}
                    alt="サムネイルプレビュー"
                    className="h-full w-full min-h-0 min-w-0 rounded-none object-cover object-top"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setValue("thumbnailUrl", "")}
                  className="absolute -right-2 -top-2 rounded-md bg-red-500 p-1 text-white hover:bg-red-600"
                  aria-label="画像を削除"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ) : (
              <div className="mt-2 flex aspect-square w-full max-w-[200px] items-center justify-center rounded-full border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">
                画像なし
              </div>
            )}
          </div>

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
            <Label htmlFor="externalProductId">
              外部商品ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="externalProductId"
              {...register("externalProductId")}
              placeholder="ECサイトの商品ID（例: product-001）"
              className="w-full font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              ECサイトの商品IDと一致させる必要があります。ウィジェット連携で使用されます。
            </p>
            {errors.externalProductId && (
              <p className="text-sm text-red-500">{errors.externalProductId.message}</p>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="priceYen">金額（円・任意）</Label>
            <Input
              id="priceYen"
              inputMode="numeric"
              value={priceYenInput}
              onChange={(e) => setPriceYenInput(e.target.value)}
              placeholder="未入力でクリア"
              className="w-full"
              autoComplete="off"
            />
            <p className="text-xs text-gray-500">空にして更新すると金額を削除します。</p>
          </div>

          <div className="rounded-md border border-gray-200 bg-stone-50/90 p-3">
            <p className="text-xs font-medium text-gray-800">登録サイズと寸法（開発フィット）</p>
            {canEditMeasures ? (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  ラベル・着丈・袖丈（cm）を変更して更新できます。行の追加・削除も可能です。
                </p>
                <div className="mt-3 space-y-3">
                  {presetDrafts.map((row, i) => (
                    <div
                      key={`preset-${i}`}
                      className="flex flex-col gap-2 rounded-md border border-gray-200/80 bg-white p-2 sm:flex-row sm:items-end"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label className="text-xs text-gray-600">ラベル</Label>
                        <Input
                          value={row.label}
                          onChange={(e) => {
                            const next = [...presetDrafts];
                            next[i] = { ...next[i], label: e.target.value };
                            setPresetDrafts(next);
                          }}
                          placeholder="例: 3"
                          className="h-9"
                        />
                      </div>
                      <div className="w-full space-y-1 sm:w-24">
                        <Label className="text-xs text-gray-600">着丈(cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={Number.isFinite(row.lengthCm) ? row.lengthCm : ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            const next = [...presetDrafts];
                            next[i] = {
                              ...next[i],
                              lengthCm: Number.isFinite(v) ? v : 0,
                            };
                            setPresetDrafts(next);
                          }}
                          className="h-9"
                        />
                      </div>
                      <div className="w-full space-y-1 sm:w-24">
                        <Label className="text-xs text-gray-600">袖(cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={Number.isFinite(row.sleeveCm) ? row.sleeveCm : ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            const next = [...presetDrafts];
                            next[i] = {
                              ...next[i],
                              sleeveCm: Number.isFinite(v) ? v : 0,
                            };
                            setPresetDrafts(next);
                          }}
                          className="h-9"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label="この行を削除"
                        onClick={() =>
                          setPresetDrafts(presetDrafts.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1"
                  onClick={() =>
                    setPresetDrafts([
                      ...presetDrafts,
                      { label: "", lengthCm: 0, sleeveCm: 0 },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  行を追加
                </Button>
              </>
            ) : (
              <>
                {presetReadOnly.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-gray-600">
                    {presetReadOnly.map((row) => (
                      <li key={row.label}>
                        <span className="font-medium text-gray-700">{row.label}</span>
                        {" · 着丈 "}
                        {row.lengthCm}cm · 袖 {row.sleeveCm}cm
                      </li>
                    ))}
                  </ul>
                )}
                {!isLoading && product && !canEditMeasures && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    寸法をここで編集するには、開発タブで登録済みの「汎用トップス」データ（genericSymmetricTop）が必要です。未登録の場合は開発タブで編集してください。
                  </p>
                )}
              </>
            )}
            {assetSizeLabelsOnly.length > 0 && (
              <p
                className={cn(
                  "text-xs text-gray-600",
                  (canEditMeasures ? presetDrafts.length > 0 : presetReadOnly.length > 0)
                    ? "mt-3 border-t border-gray-200/80 pt-2"
                    : "mt-2"
                )}
              >
                サイズ別アセット: {assetSizeLabelsOnly.join(", ")}
              </p>
            )}
            {!isLoading &&
              product &&
              !canEditMeasures &&
              presetReadOnly.length === 0 &&
              assetSizeLabelsOnly.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  開発タブのサイズプリセット・採寸、またはサイズ別アセットを登録するとここに表示されます。
                </p>
              )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={updateProduct.isPending}>
              {updateProduct.isPending ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    )}
    <CircularImageCropDialog
      open={cropOpen}
      onOpenChange={(next) => {
        setCropOpen(next);
        if (!next) setThumbnailCropFile(null);
      }}
      file={thumbnailCropFile}
      onConfirm={(blob, fileName) => {
        void handleFileUpload(new File([blob], fileName, { type: "image/png" }));
        setThumbnailCropFile(null);
      }}
    />
    </>
  );
}
