"use client";

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Upload, FileUp, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth/api-client";

interface ImportResult {
  success: boolean;
  addedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
}

export function ProductImportCsvDialog({ onImportComplete }: { onImportComplete?: () => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // CSVファイルのみ許可
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("CSVファイルを選択してください");
        return;
      }
      setFile(selectedFile);
      setResult(null); // 前回の結果をクリア
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("ファイルを選択してください");
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await authenticatedFetch("/api/products/import-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "インポートに失敗しました");
      }

      const data: ImportResult = await response.json();
      setResult(data);

      if (data.addedCount > 0) {
        toast.success(`${data.addedCount}件の商品を追加しました`);
        // 商品一覧を更新
        queryClient.invalidateQueries({ queryKey: ["products"] });
        onImportComplete?.();
      }

      if (data.skippedCount > 0) {
        toast.info(`${data.skippedCount}件の商品は既に存在するためスキップしました`);
      }

      if (data.failedCount > 0) {
        toast.error(`${data.failedCount}件の商品の追加に失敗しました`);
      }
    } catch (error) {
      console.error("CSV import error:", error);
      toast.error(error instanceof Error ? error.message : "インポートに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadSampleCsv = () => {
    const sample = `external_product_id,name,thumbnail_url,brand,category
SKU-001,サンプル商品A,https://example.com/image1.jpg,ブランドA,ジャケット
SKU-002,サンプル商品B,https://example.com/image2.jpg,ブランドB,コート
SKU-003,サンプル商品C,https://example.com/image3.jpg,ブランドC,トップス`;

    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sample_products.csv";
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileUp className="h-4 w-4" />
          CSVインポート
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>商品CSVインポート</DialogTitle>
          <DialogDescription>
            CSVファイルから商品データを一括インポートします
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* CSV形式の説明 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 font-medium mb-2">📋 CSVファイルの形式</p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>UTF-8エンコーディング</li>
              <li>ヘッダー行が必須</li>
              <li>最大5000行まで</li>
            </ul>
            <div className="mt-3">
              <p className="text-sm text-blue-800 font-medium mb-1">必須カラム:</p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside ml-4">
                <li><code className="bg-blue-100 px-1 rounded">external_product_id</code> - 外部商品ID（必須）</li>
              </ul>
              <p className="text-sm text-blue-800 font-medium mb-1 mt-2">任意カラム:</p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside ml-4">
                <li><code className="bg-blue-100 px-1 rounded">name</code> - 商品名</li>
                <li><code className="bg-blue-100 px-1 rounded">thumbnail_url</code> - サムネイル画像URL</li>
                <li><code className="bg-blue-100 px-1 rounded">brand</code> - ブランド名</li>
                <li><code className="bg-blue-100 px-1 rounded">category</code> - カテゴリ（ジャケット、コート、トップス、ボトムス）</li>
              </ul>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={downloadSampleCsv}
              className="mt-2 p-0 h-auto text-blue-600"
            >
              サンプルCSVをダウンロード
            </Button>
          </div>

          {/* ファイル選択 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">CSVファイルを選択</label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                ファイルを選択
              </Button>
              {file && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {file.name}
                </div>
              )}
            </div>
          </div>

          {/* インポート結果 */}
          {result && (
            <div className="p-4 border rounded-md space-y-2">
              <p className="text-sm font-medium">インポート結果</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">✓ 追加:</span>
                  <span className="font-medium">{result.addedCount}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">○ スキップ:</span>
                  <span className="font-medium">{result.skippedCount}件</span>
                </div>
                {result.failedCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-red-600">✗ 失敗:</span>
                    <span className="font-medium">{result.failedCount}件</span>
                  </div>
                )}
              </div>

              {/* エラー詳細 */}
              {result.errors.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 mb-1">
                        エラー詳細（最大10件）
                      </p>
                      <ul className="text-xs text-red-700 space-y-1">
                        {result.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 注意事項 */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">注意事項:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>既に存在する商品（同じ external_product_id）は更新されません</li>
                  <li>インポート後、商品に3Dモデルを追加できます</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            キャンセル
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "インポート中..." : "インポート"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
