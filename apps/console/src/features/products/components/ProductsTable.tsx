"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, ProductSize } from "@atelier/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ProductAddDialog } from "./ProductAddDialog";
import { ProductEditDialog } from "./ProductEditDialog";
import { AssetManagementDialog } from "./AssetManagementDialog";
import { ProductImportCsvDialog } from "./ProductImportCsvDialog";
import { Search, Eye, Edit, Trash2 } from "lucide-react";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { Button } from "@/components/ui/button";
import { useDeleteProduct } from "../useProducts";
import { toast } from "sonner";
import { getErrorMessage, translateErrorMessage } from "@/lib/errors/error-handler";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductsTableProps {
  products: Product[];
  onProductSelect: (product: Product, size: ProductSize) => void;
  selectedProductId?: string;
  selectedSize?: ProductSize;
}

export function ProductsTable({
  products,
  onProductSelect,
  selectedProductId,
  selectedSize,
}: ProductsTableProps) {
  const { togglePreview } = useProductSelection();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState<string>("");
  const deleteProduct = useDeleteProduct();

  const handleDelete = async (productId: string) => {
    if (!confirm("この商品を削除してもよろしいですか？")) {
      return;
    }
    try {
      await deleteProduct.mutateAsync(productId);
      toast.success("商品を削除しました");
    } catch (error) {
      console.error("Failed to delete product:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(translateErrorMessage(errorMessage));
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const toggleRowSelection = (productId: string) => {
    const newSelection = new Set(selectedRowIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedRowIds(newSelection);
  };

  const handleProductClick = (product: Product) => {
    // デフォルトでMサイズを選択
    onProductSelect(product, "M");
    // プレビューを開く
    togglePreview();
  };

  const handleDescriptionClick = (description: string) => {
    setSelectedDescription(description);
    setDescriptionModalOpen(true);
  };

  const truncateDescription = (text: string | undefined, maxLength: number = 30) => {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Header with search and add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="商品を検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <ProductImportCsvDialog />
          <ProductAddDialog />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
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
              <TableHead className="w-20">画像</TableHead>
              <TableHead className="w-48">商品名</TableHead>
              <TableHead className="w-32">ブランド</TableHead>
              <TableHead className="w-32">SKU</TableHead>
              <TableHead className="w-48">説明</TableHead>
              <TableHead className="w-32">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500">
                  商品が見つかりませんでした
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const isSelected = selectedRowIds.has(product.id);
                return (
                  <TableRow
                    key={product.id}
                    className={`bg-white hover:bg-white ${isSelected ? "bg-blue-50 hover:bg-blue-50" : ""}`}
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
                    <TableCell className={`py-2 ${isSelected ? "bg-blue-50" : ""}`}>
                      {product.thumbnailUrl ? (
                        <div className="relative h-16 w-16 overflow-hidden rounded flex items-center justify-center">
                          <img
                            src={product.thumbnailUrl}
                            alt={product.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                          画像なし
                        </div>
                      )}
                    </TableCell>
                    <TableCell className={`font-medium py-2 ${isSelected ? "bg-blue-50" : ""}`}>{product.name}</TableCell>
                    <TableCell className={`py-2 ${isSelected ? "bg-blue-50" : ""}`}>{product.brand || "-"}</TableCell>
                    <TableCell className={`py-2 ${isSelected ? "bg-blue-50" : ""}`}>{product.sku || "-"}</TableCell>
                    <TableCell className={`py-2 ${isSelected ? "bg-blue-50" : ""}`}>
                      {product.description ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDescriptionClick(product.description || "");
                          }}
                          className="text-left text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {truncateDescription(product.description)}
                        </button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell
                      className={`py-2 ${isSelected ? "bg-blue-50" : ""}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isSelected ? (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProductId(product.id)}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            編集
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteProduct.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            削除
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onProductSelect(product, "M");
                              togglePreview();
                            }}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            プレビュー
                          </Button>
                          <AssetManagementDialog
                            productId={product.id}
                            productName={product.name}
                          />
                        </div>
                      )}
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

      {/* 説明モーダル */}
      <Dialog open={descriptionModalOpen} onOpenChange={setDescriptionModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>商品説明</DialogTitle>
            <DialogDescription>
              商品の詳細な説明を表示します。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="whitespace-pre-wrap text-sm">{selectedDescription || "説明がありません"}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
