"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { Product, ProductSize } from "@atelier/shared";

interface ViewStats {
  totalViews: number;
  productViews: Record<string, number>;
  lastViewedAt?: Date;
}

interface ProductSelectionContextType {
  selectedProduct: Product | undefined;
  selectedSize: ProductSize | undefined;
  selectProduct: (product: Product, size: ProductSize) => void;
  isPreviewOpen: boolean;
  togglePreview: () => void;
  viewStats: ViewStats;
}

const ProductSelectionContext = createContext<
  ProductSelectionContextType | undefined
>(undefined);

export function ProductSelectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [viewStats, setViewStats] = useState<ViewStats>(() => {
    // ローカルストレージから読み込み
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("productViewStats");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            totalViews: parsed.totalViews || 0,
            productViews: parsed.productViews || {},
            lastViewedAt: parsed.lastViewedAt ? new Date(parsed.lastViewedAt) : undefined,
          };
        } catch {
          return { totalViews: 0, productViews: {} };
        }
      }
    }
    return { totalViews: 0, productViews: {} };
  });

  const selectProduct = (product: Product, size: ProductSize) => {
    // 既に同じ商品とサイズが選択されている場合は何もしない
    if (
      selectedProduct?.id === product.id &&
      selectedSize === size
    ) {
      return;
    }
    setSelectedProduct(product);
    setSelectedSize(size);
  };

  const togglePreview = () => {
    setIsPreviewOpen((prev) => {
      const newState = !prev;
      // プレビューが開かれたときにカウントを増やす
      if (newState && selectedProduct) {
        setViewStats((stats) => {
          const newStats = {
            totalViews: stats.totalViews + 1,
            productViews: {
              ...stats.productViews,
              [selectedProduct.id]: (stats.productViews[selectedProduct.id] || 0) + 1,
            },
            lastViewedAt: new Date(),
          };
          // ローカルストレージに保存
          if (typeof window !== "undefined") {
            localStorage.setItem("productViewStats", JSON.stringify(newStats));
          }
          return newStats;
        });
      }
      return newState;
    });
  };

  return (
    <ProductSelectionContext.Provider
      value={{ selectedProduct, selectedSize, selectProduct, isPreviewOpen, togglePreview, viewStats }}
    >
      {children}
    </ProductSelectionContext.Provider>
  );
}

export function useProductSelection() {
  const context = useContext(ProductSelectionContext);
  if (context === undefined) {
    throw new Error(
      "useProductSelection must be used within a ProductSelectionProvider"
    );
  }
  return context;
}
