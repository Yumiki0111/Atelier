"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import type { Asset, ProductSize } from "@Atelier/shared";

interface AssetListProps {
  assets: Asset[];
  isLoading: boolean;
  editingAssetId: string | null;
  deletingAssetId: string | null;
  onEdit: (assetId: string) => void;
  onCancelEdit: () => void;
  onUpdate: (assetId: string, glbUrl: string) => void;
  onDelete: (assetId: string) => void;
}

export function AssetList({
  assets,
  isLoading,
  editingAssetId,
  deletingAssetId,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: AssetListProps) {
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

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        アセットが登録されていません
      </div>
    );
  }

  return (
    <>
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
                            onUpdate(asset.id, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                          if (e.key === "Escape") {
                            onCancelEdit();
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
                            onCancelEdit();
                          } else {
                            onEdit(asset.id);
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
                        onClick={() => onDelete(asset.id)}
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
    </>
  );
}
