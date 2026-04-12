"use client";

import { useState } from "react";
import type {
  CustomGarmentData,
  GarmentType,
  JacketSize,
  ShirtSize,
} from "@/app/(main)/development/fitting/lib/types";
import { logDevFitPipelineAfterSizePresetChange } from "@/lib/fitting-compute/fittingCanvasDevSizePresetDebug";
import { sanitizeCustomGarmentForProductDb } from "@/app/(main)/development/fitting/lib/sanitizeCustomGarmentForProductDb";
import { validateGarmentSpecForProduction } from "@/lib/products/validateGarmentSpecForProduction";
import { useAddProduct } from "@/features/products/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage, translateErrorMessage } from "@/lib/errors/error-handler";
import { Database, Upload, X } from "lucide-react";
import { CircularImageCropDialog } from "@/features/products/components/CircularImageCropDialog";

interface DevelopmentProductRegisterPanelProps {
  garment: GarmentType;
  customGarmentData: CustomGarmentData | null;
  /** 開発用: DB 登録成功時に `computeFittingCanvasSnapshot` でパイプラインを console へ出す */
  fitDebugContext?: {
    height: number;
    weight: number;
    shirtSize: ShirtSize;
    jacketSize: JacketSize;
  } | null;
}

export function DevelopmentProductRegisterPanel({
  garment,
  customGarmentData,
  fitDebugContext = null,
}: DevelopmentProductRegisterPanelProps) {
  const { shopId } = useAuth();
  const addProduct = useAddProduct();
  const [name, setName] = useState("");
  const [priceYenInput, setPriceYenInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [thumbnailCropFile, setThumbnailCropFile] = useState<File | null>(
    null
  );

  const canRegister =
    !!shopId &&
    garment === "custom" &&
    customGarmentData != null &&
    customGarmentData.pathDs.length > 0;

  const handleThumbnailUpload = async (file: File) => {
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
        const error = (await response.json()) as {
          error?: string;
          details?: string;
          hint?: string;
          availableBuckets?: string[];
        };
        let message = error.details
          ? `${error.error ?? "エラー"}: ${error.details}${error.hint ? `（${error.hint}）` : ""}`
          : error.error ?? "アップロードに失敗しました";
        if (error.availableBuckets?.length) {
          message += ` 利用可能なバケット: ${error.availableBuckets.join(", ")}`;
        }
        throw new Error(message);
      }

      const data = (await response.json()) as { url?: string; warning?: string };
      if (data.warning) {
        toast.warning(data.warning);
      }
      if (data.url) {
        setThumbnailUrl(data.url);
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleRegister = async () => {
    if (!canRegister || !customGarmentData) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("商品名を入力してください");
      return;
    }

    const garmentSpec = sanitizeCustomGarmentForProductDb(customGarmentData);
    const specOk = validateGarmentSpecForProduction(garmentSpec);
    if (!specOk.ok) {
      toast.error(specOk.message);
      return;
    }

    const thumb = thumbnailUrl.trim();
    const priceTrim = priceYenInput.replace(/,/g, "").trim();
    let priceYen: number | undefined;
    if (priceTrim !== "") {
      const n = Math.round(Number(priceTrim));
      if (!Number.isFinite(n) || n < 0) {
        toast.error("金額は0以上の整数（円）で入力してください");
        return;
      }
      priceYen = n;
    }

    try {
      await addProduct.mutateAsync({
        shopId,
        name: trimmed,
        category: "トップス",
        garmentSpec,
        ...(priceYen !== undefined ? { priceYen } : {}),
        ...(thumb !== "" ? { thumbnailUrl: thumb } : {}),
      });
      toast.success("商品ライブラリに登録しました");
      if (
        process.env.NODE_ENV !== "production" &&
        fitDebugContext != null &&
        customGarmentData != null &&
        customGarmentData.presetId === "genericSymmetricTop"
      ) {
        void logDevFitPipelineAfterSizePresetChange({
          action: "productDbRegister",
          height: fitDebugContext.height,
          weight: fitDebugContext.weight,
          shirtSize: fitDebugContext.shirtSize,
          jacketSize: fitDebugContext.jacketSize,
          customGarmentData,
        });
      }
      setName("");
      setPriceYenInput("");
      setThumbnailUrl("");
    } catch (e) {
      console.error(e);
      const msg = translateErrorMessage(getErrorMessage(e));
      if (msg.toLowerCase().includes("garment_spec") || msg.includes("column")) {
        toast.error(
          "DB に garment_spec カラムがありません。supabase/add-products-garment-spec.sql を実行してください。"
        );
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <>
    <div className="shrink-0 border-b border-border/40 py-3 text-sm text-foreground">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1 space-y-1">
          <Label htmlFor="dev-product-name" className="text-xs font-medium text-muted-foreground">
            商品DB登録名
          </Label>
          <Input
            id="dev-product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: サンプルブラウス A"
            className="h-9 bg-background"
          />
        </div>
        <div className="w-[7.5rem] shrink-0 space-y-1">
          <Label htmlFor="dev-product-price-yen" className="text-xs font-medium text-muted-foreground">
            金額（円・任意）
          </Label>
          <Input
            id="dev-product-price-yen"
            inputMode="numeric"
            value={priceYenInput}
            onChange={(e) => setPriceYenInput(e.target.value)}
            placeholder="19800"
            className="h-9 bg-background"
            autoComplete="off"
          />
        </div>
        <div className="min-w-[14rem] flex-1 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">サムネイル（任意）</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="dev-product-register-thumbnail-file"
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
              size="sm"
              className="h-9 shrink-0 gap-1.5 bg-white"
              disabled={uploadingThumbnail || !shopId}
              title={uploadingThumbnail ? "アップロード中…" : "画像をアップロード"}
              onClick={() =>
                document.getElementById("dev-product-register-thumbnail-file")?.click()
              }
            >
              <Upload className="h-4 w-4" />
              画像をアップロード
            </Button>
          </div>
          {thumbnailUrl ? (
            <div className="relative mt-1 inline-block">
              <img
                src={thumbnailUrl}
                alt=""
                className="h-14 w-14 rounded-full border border-border object-cover object-top"
              />
              <button
                type="button"
                onClick={() => setThumbnailUrl("")}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                title="サムネイルをクリア"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="default"
          className="gap-2"
          disabled={!canRegister || addProduct.isPending}
          onClick={handleRegister}
        >
          <Database className="h-4 w-4" />
          {addProduct.isPending ? "登録中…" : "商品ライブラリに登録"}
        </Button>
      </div>
    </div>
    <CircularImageCropDialog
      open={cropOpen}
      onOpenChange={(next) => {
        setCropOpen(next);
        if (!next) setThumbnailCropFile(null);
      }}
      file={thumbnailCropFile}
      onConfirm={(blob, fileName) => {
        void handleThumbnailUpload(
          new File([blob], fileName, { type: "image/png" })
        );
        setThumbnailCropFile(null);
      }}
    />
    </>
  );
}
