import { useState } from "react";
import { UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

interface UseAssetUploadOptions {
  setValue: UseFormSetValue<any>;
}

export function useAssetUpload({ setValue }: UseAssetUploadOptions) {
  const [uploadingGlb, setUploadingGlb] = useState(false);

  const handleGlbFileUpload = async (file: File) => {
    setUploadingGlb(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "models");

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
      
      let publicUrl: string;
      
      // 大きなファイルの場合はクライアントサイドから直接アップロード
      if (data.useClientUpload) {
        // クライアント側でSupabaseクライアントを使用してアップロード
        // 注意: バケットが公開設定になっているか、RLSポリシーが適切に設定されている必要があります
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(data.bucketName)
          .upload(data.filePath, file, {
            contentType: data.contentType,
            upsert: false,
          });

        if (uploadError) {
          // RLSポリシー違反の場合は、より詳細なエラーメッセージを表示
          if (uploadError.message?.includes("row-level security") || uploadError.message?.includes("RLS")) {
            throw new Error(
              `アップロードに失敗しました: RLSポリシー違反\n\n` +
              `解決方法:\n` +
              `1. Supabase DashboardでStorageバケット "${data.bucketName}" を公開設定にする\n` +
              `2. または、RLSポリシーを設定してアップロードを許可する\n` +
              `3. または、Supabase Storageのプランをアップグレードしてサーバーサイドでアップロードする`
            );
          }
          throw new Error(`アップロードに失敗しました: ${uploadError.message}`);
        }

        // 公開URLを取得
        const { data: urlData } = supabase.storage
          .from(data.bucketName)
          .getPublicUrl(data.filePath);

        if (!urlData?.publicUrl) {
          throw new Error("公開URLの取得に失敗しました");
        }

        publicUrl = urlData.publicUrl;
      } else {
        // 通常のアップロード（サーバーサイド）
        publicUrl = data.url;
      }
      
      // ファイル拡張子に基づいて、glbUrlまたはmodelUrlを設定
      const fileExtension = file.name.toLowerCase().split('.').pop();
      if (fileExtension === 'fbx') {
        // FBXの場合はmodelUrlに設定
        setValue("modelUrl", publicUrl, { shouldValidate: true });
        // UI表示用にglbUrlにも設定（入力フィールドがglbUrlを表示しているため）
        setValue("glbUrl", publicUrl, { shouldValidate: true });
        toast.success("FBXファイルをアップロードしました");
      } else {
        // GLB/GLTFの場合はglbUrlに設定（後方互換性）
        setValue("glbUrl", publicUrl, { shouldValidate: true });
        // modelUrlにも設定（API側でmodelUrlを優先的に使用するため）
        setValue("modelUrl", publicUrl, { shouldValidate: true });
        toast.success("GLBファイルをアップロードしました");
      }
    } catch (error) {
      console.error("Failed to upload GLB file:", error);
      const errorMessage = error instanceof Error ? error.message : "アップロードに失敗しました";
      toast.error(errorMessage);
    } finally {
      setUploadingGlb(false);
    }
  };

  return {
    uploadingGlb,
    handleGlbFileUpload,
  };
}
