"use client";

import Image from "next/image";
import { useState } from "react";
import { Product, ProductSize, ProductStatus } from "../products.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductAddDialog } from "./ProductAddDialog";
import { Search } from "lucide-react";
import { ProductCategory } from "../products.types";
import { Switch } from "@/components/ui/switch";
import { useUpdateProductEnabled } from "../useProducts";

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
  const updateProductEnabled = useUpdateProductEnabled();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const categories: ProductCategory[] = ["ジャケット", "コート", "トップス", "ボトムス"];
  
  // シーズンの一覧を取得
  const seasons = Array.from(
    new Set(products.map((p) => p.season).filter((s): s is string => !!s))
  ).sort();

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    const matchesSeason =
      selectedSeason === "all" || product.season === selectedSeason;
    return matchesSearch && matchesCategory && matchesSeason;
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

  const handleSizeClick = (
    e: React.MouseEvent,
    product: Product,
    size: ProductSize
  ) => {
    e.stopPropagation();
    onProductSelect(product, size);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Header with search, filter, and add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="商品を検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="シーズン" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {seasons.map((season) => (
                <SelectItem key={season} value={season}>
                  {season}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ProductAddDialog />
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
              <TableHead>画像</TableHead>
              <TableHead>商品名</TableHead>
              <TableHead>サイズ</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="w-24">有効/無効</TableHead>
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
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className="sticky left-0 bg-white z-10"
                  >
                    <Checkbox
                      checked={selectedRowIds.has(product.id)}
                      onCheckedChange={() => toggleRowSelection(product.id)}
                    />
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="relative h-32 w-32 overflow-hidden rounded">
                      <Image
                        src={product.thumbnailUrl}
                        alt={product.name}
                        fill
                        className="object-contain"
                        sizes="128px"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium py-6">{product.name}</TableCell>
                  <TableCell className="py-6">
                    <div className="flex gap-2">
                      {product.sizes.map((size) => (
                        <Badge
                          key={size}
                          variant={
                            selectedProductId === product.id &&
                            selectedSize === size
                              ? "default"
                              : "outline"
                          }
                          className="flex h-9 w-9 cursor-pointer items-center justify-center p-0 text-sm"
                          onClick={(e) => handleSizeClick(e, product, size)}
                        >
                          {size}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell
                    className="py-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Select
                      value={product.status || "未発注"}
                      onValueChange={(value: ProductStatus) => {
                        // ステータス更新処理（将来的にAPI呼び出し）
                        console.log("Status updated:", value);
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="未発注">未発注</SelectItem>
                        <SelectItem value="制作中">制作中</SelectItem>
                        <SelectItem value="レビュー待ち">レビュー待ち</SelectItem>
                        <SelectItem value="修正中">修正中</SelectItem>
                        <SelectItem value="公開可">公開可</SelectItem>
                        <SelectItem value="公開中">公開中</SelectItem>
                        <SelectItem value="差し替え中">差し替え中</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-6" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={product.enabled ?? true}
                      onCheckedChange={(checked: boolean) => {
                        updateProductEnabled.mutate({
                          productId: product.id,
                          enabled: checked,
                        });
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
