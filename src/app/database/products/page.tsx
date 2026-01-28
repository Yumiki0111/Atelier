"use client";

import { ProductsTable } from "@/features/products/components/ProductsTable";
import { useProducts } from "@/features/products/useProducts";
import { useProductSelection } from "@/contexts/ProductSelectionContext";

export default function ProductsPage() {
  const { data: products = [], isLoading } = useProducts();
  const { selectProduct, selectedProduct, selectedSize } = useProductSelection();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">商品データベース</h1>
      <ProductsTable
        products={products}
        onProductSelect={selectProduct}
        selectedProductId={selectedProduct?.id}
        selectedSize={selectedSize}
      />
    </div>
  );
}
