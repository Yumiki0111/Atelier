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
    try {
      await addProduct.mutateAsync({
        shopId,
        name: trimmed,
        category: "トップス",
        garmentSpec,
        ...(thumb !== "" ? { thumbnailUrl: thumb } : {}),
      });
      toast.success("商品データベースに登録しました");
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
    <div className="shrink-0 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-sm ring-1 ring-amber-100">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1 space-y-1">
          <Label htmlFor="dev-product-name" className="text-xs text-amber-950/80">
            商品DB登録名
          </Label>
          <Input
            id="dev-product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: サンプルブラウス A"
            className="h-9 bg-white"
          />
        </div>
        <div className="min-w-[14rem] flex-1 space-y-1">
          <span className="text-xs text-amber-950/80">サムネイル（任意）</span>
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
            <span className="text-xs text-amber-900/60">
              円形に切り取ってから保存されます
            </span>
          </div>
          {thumbnailUrl ? (
            <div className="relative mt-1 inline-block">
              <img
                src={thumbnailUrl}
                alt=""
                className="h-14 w-14 rounded border border-amber-200/80 object-cover"
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
          className="gap-2 bg-amber-900 text-white hover:bg-amber-950"
          disabled={!canRegister || addProduct.isPending}
          onClick={handleRegister}
        >
          <Database className="h-4 w-4" />
          {addProduct.isPending ? "登録中…" : "商品データベースに登録"}
        </Button>
      </div>
      {!canRegister ? (
        <p className="mt-2 text-xs text-amber-900/70">
          カスタム服で SVG を読み込んだ状態でのみ登録できます。試着と同じ着せ方にするため、服 SVG 内のリグ線（debugRigPathDs）も保存されます。
        </p>
      ) : (
        <p className="mt-2 text-xs text-amber-900/70">
          送信内容: SVG path、ランドマーク、採寸、袖丈・着丈の計測頂点、グレーディング、服リグ線（モデル試着と整合するため）
        </p>
      )}
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
