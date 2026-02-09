"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createAssetSchemaBase, type ProductSize } from "@atelier/shared";
import { Plus, Upload, Loader2 } from "lucide-react";
import { z } from "zod";
import { useAssetUpload } from "../hooks/useAssetUpload";

// versionは自動設定されるため、フォームから除外
// createAssetSchemaBaseからversionを除外（refinementなしのベーススキーマを使用）
const assetFormSchema = createAssetSchemaBase.omit({ 
  version: true,
}).refine(
  (data) => data.modelUrl || data.glbUrl,
  { message: "modelUrl or glbUrl is required" }
);

type AssetFormData = z.infer<typeof assetFormSchema>;

interface AssetUploadFormProps {
  productId: string;
  onSubmit: (data: AssetFormData) => Promise<boolean>;
  isSubmitting: boolean;
}

export function AssetUploadForm({
  productId,
  onSubmit,
  isSubmitting,
}: AssetUploadFormProps) {
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
      modelUrl: "",
      isActive: true,
    } as AssetFormData,
  });

  const selectedSize = watch("size");
  const glbUrl = watch("glbUrl");
  const modelUrl = watch("modelUrl");
  // 表示用：modelUrlを優先、なければglbUrlを使用
  const displayUrl = modelUrl || glbUrl;

  const { uploadingGlb, handleGlbFileUpload } = useAssetUpload({ setValue });

  const handleFormSubmit = async (data: AssetFormData) => {
    const success = await onSubmit(data);
    if (success) {
      reset();
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold text-sm">新しいアセットを追加</h3>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
            <Label htmlFor="glbUrl">3DモデルURL（GLB/FBX）</Label>
            <div className="flex gap-2">
              <Input
                id="glbUrl"
                placeholder="https://example.com/model.glb または https://example.com/model.fbx またはファイルをアップロード"
                {...register("glbUrl")}
                className="flex-1"
              />
              {/* modelUrlも登録（非表示） */}
              <input type="hidden" {...register("modelUrl")} />
              <div className="flex-shrink-0">
                <input
                  id="glbFile"
                  type="file"
                  accept=".glb,.gltf,.fbx,model/gltf-binary,application/octet-stream"
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
                  title={uploadingGlb ? "アップロード中..." : "3Dモデルファイル（GLB/FBX）をアップロード"}
                  onClick={() => {
                    document.getElementById("glbFile")?.click();
                  }}
                >
                  {uploadingGlb ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {errors.glbUrl && (
              <p className="text-sm text-red-500">
                {errors.glbUrl.message}
              </p>
            )}
            {uploadingGlb && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>アップロード中...</span>
              </div>
            )}
            {displayUrl && !uploadingGlb && (
              <p className="text-xs text-gray-500 truncate">
                アップロード済み: {displayUrl}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-start">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Plus className="h-4 w-4" />
            {isSubmitting ? "追加中..." : "アセットを追加"}
          </Button>
        </div>
      </form>
    </div>
  );
}
