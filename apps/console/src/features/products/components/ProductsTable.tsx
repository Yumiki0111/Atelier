"use client";

import { useState, useCallback } from "react";
import type { Product, ProductSize } from "@Atelier/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductAddDialog } from "./ProductAddDialog";
import { ProductEditDialog } from "./ProductEditDialog";
import { AssetManagementDialog } from "./AssetManagementDialog";
import { ProductImportCsvDialog } from "./ProductImportCsvDialog";
import { Eye, Edit, Trash2, Trash } from "lucide-react";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { Button } from "@/components/ui/button";
import { useDeleteProduct, useBulkDeleteProducts } from "../useProducts";
import { toast } from "sonner";
import { getErrorMessage, translateErrorMessage } from "@/lib/errors/error-handler";

interface ProductsTableProps {
  products: Product[];
  onProductSelect: (product: Product, size: ProductSize) => void;
}

export function ProductsTable({
  products,
  onProductSelect,
}: ProductsTableProps) {
  const { togglePreview, clearProductSelection, selectedProduct } = useProductSelection();
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const deleteProduct = useDeleteProduct();
  const bulkDeleteProducts = useBulkDeleteProducts();

  const handleDelete = async (productId: string) => {
    if (!confirm("この商品を削除してもよろしいですか？")) {
      return;
    }
    try {
      await deleteProduct.mutateAsync(productId);
      if (selectedProduct?.id === productId) {
        clearProductSelection();
      }
      toast.success("商品を削除しました");
    } catch (error) {
      console.error("Failed to delete product:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(translateErrorMessage(errorMessage));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowIds.size === 0) {
      toast.error("削除する商品を選択してください");
      return;
    }

    const count = selectedRowIds.size;
    if (!confirm(`選択した${count}件の商品を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const productIds = Array.from(selectedRowIds);
      const result = await bulkDeleteProducts.mutateAsync(productIds);
      if (selectedProduct && productIds.includes(selectedProduct.id)) {
        clearProductSelection();
      }
      toast.success(`${result.deletedCount}件の商品を削除しました`);
      setSelectedRowIds(new Set()); // 選択をクリア
    } catch (error) {
      console.error("Failed to bulk delete products:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(translateErrorMessage(errorMessage));
    }
  };

  const filteredProducts = products;

  const toggleRowSelection = useCallback((productId: string) => {
    setSelectedRowIds((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(productId)) {
        newSelection.delete(productId);
      } else {
        newSelection.add(productId);
      }
      return newSelection;
    });
  }, []);

  return (
    <div className="flex flex-col space-y-4">
      {/* Header with buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {selectedRowIds.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              disabled={bulkDeleteProducts.isPending}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Trash className="h-4 w-4" />
              {bulkDeleteProducts.isPending ? "削除中..." : `選択した${selectedRowIds.size}件を削除`}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <ProductImportCsvDialog />
          <ProductAddDialog />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="w-12 sticky left-0 bg-gray-100 z-10">
                <Checkbox
                  checked={
                    filteredProducts.length > 0 &&
                    selectedRowIds.size === filteredProducts.length
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRowIds(
                        new Set(filteredProducts.map((p) => p.id))
                      );
                    } else {
                      setSelectedRowIds(new Set());
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-[calc((100%-3rem)/4)]">画像</TableHead>
              <TableHead className="w-[calc((100%-3rem)/4)]">商品名</TableHead>
              <TableHead className="w-[calc((100%-3rem)/4)]">外部商品ID</TableHead>
              <TableHead className="w-[calc((100%-3rem)/4)]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  商品が見つかりませんでした
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const isSelected = selectedRowIds.has(product.id);
                return (
                  <TableRow
                    key={product.id}
                    className={`bg-white hover:bg-white cursor-pointer border-b ${isSelected ? "bg-blue-50 hover:bg-blue-50" : ""}`}
                    style={{ boxSizing: 'border-box', borderWidth: '1px', borderColor: 'inherit' }}
                    onClick={(e) => {
                      // チェックボックス、画像、ボタン（操作セル）をクリックした場合は選択しない
                      const target = e.target as HTMLElement;
                      const isCheckbox = target.closest('[role="checkbox"]') || target.closest('input[type="checkbox"]');
                      const isImage = target.tagName === 'IMG' || target.closest('img');
                      const isButton = target.closest('button') || target.closest('[role="button"]');
                      
                      if (!isCheckbox && !isImage && !isButton) {
                        toggleRowSelection(product.id);
                      }
                    }}
                    onTouchEnd={(e) => {
                      // タッチイベントでも同様の処理
                      const target = e.target as HTMLElement;
                      const isCheckbox = target.closest('[role="checkbox"]') || target.closest('input[type="checkbox"]');
                      const isImage = target.tagName === 'IMG' || target.closest('img');
                      const isButton = target.closest('button') || target.closest('[role="button"]');
                      
                      if (!isCheckbox && !isImage && !isButton) {
                        e.preventDefault();
                        toggleRowSelection(product.id);
                      }
                    }}
                  >
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className={`sticky left-0 z-10 ${isSelected ? "bg-blue-50" : "bg-white"}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRowSelection(product.id)}
                      />
                    </TableCell>
                    <TableCell 
                      className={`py-2 ${isSelected ? "bg-blue-50" : ""}`}
                      onClick={(e) => {
                        // 画像自体をクリックした場合のみ選択を防ぐ
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'IMG' || target.closest('img')) {
                          e.stopPropagation();
                        }
                      }}
                      onTouchEnd={(e) => {
                        // 画像自体をタッチした場合のみ選択を防ぐ
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'IMG' || target.closest('img')) {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {product.thumbnailUrl ? (
                        <div className="relative h-16 w-12 overflow-hidden rounded-md border border-black/5 bg-stone-100 p-0.5 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element -- 外部・可変URLのサムネイル */}
                          <img
                            src={product.thumbnailUrl}
                            alt={product.name}
                            className="h-full w-full object-cover object-center"
                            onClick={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-12 overflow-hidden rounded-md border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-[10px] leading-tight text-center px-0.5">
                          画像なし
                        </div>
                      )}
                    </TableCell>
                    <TableCell className={`font-medium py-2 ${isSelected ? "bg-blue-50" : ""}`}>{product.name}</TableCell>
                    <TableCell className={`py-2 ${isSelected ? "bg-blue-50" : ""} font-mono text-xs`}>
                      {product.externalProductId || (
                        <span className="text-gray-400 italic">未設定</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`py-2 ${isSelected ? "bg-blue-50" : ""}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onProductSelect(product, "M");
                            togglePreview();
                          }}
                          className="h-9 min-w-[120px] justify-start gap-2 px-3"
                        >
                          <Eye className="h-4 w-4" />
                          プレビュー
                        </Button>
                        <AssetManagementDialog
                          productId={product.id}
                          productName={product.name}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProductId(product.id)}
                          className="gap-2 whitespace-nowrap"
                        >
                          <Edit className="h-4 w-4" />
                          編集
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          className="gap-2 whitespace-nowrap text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={deleteProduct.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          削除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 編集ダイアログ */}
      {editingProductId && (
        <ProductEditDialog
          productId={editingProductId}
          open={!!editingProductId}
          onOpenChange={(open) => {
            if (!open) {
              setEditingProductId(null);
            }
          }}
          onProductUpdated={() => {
            setEditingProductId(null);
          }}
        />
      )}
    </div>
  );
}
