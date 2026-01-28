"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "./products.types";
import { mockProducts } from "./products.mock";

// 将来API化する際に使用する型
export interface ProductsResponse {
  products: Product[];
}

// モックデータをクライアント状態で管理するためのストア
let productsStore: Product[] = [...mockProducts];

// 将来API化する際の関数（今はモックを返す）
async function fetchProducts(): Promise<ProductsResponse> {
  // 将来的には: const response = await fetch('/api/products');
  // return response.json();
  return { products: productsStore };
}

async function addProduct(product: Omit<Product, "id">): Promise<Product> {
  // 将来的には: const response = await fetch('/api/products', { method: 'POST', body: JSON.stringify(product) });
  // return response.json();
  const newProduct: Product = {
    ...product,
    id: Date.now().toString(),
  };
  productsStore = [...productsStore, newProduct];
  return newProduct;
}

async function updateProductEnabled(productId: string, enabled: boolean): Promise<Product> {
  // 将来的には: const response = await fetch(`/api/products/${productId}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
  // return response.json();
  const product = productsStore.find((p) => p.id === productId);
  if (!product) {
    throw new Error("Product not found");
  }
  const updatedProduct = { ...product, enabled };
  productsStore = productsStore.map((p) => (p.id === productId ? updatedProduct : p));
  return updatedProduct;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    select: (data) => data.products,
  });
}

export function useAddProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProductEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, enabled }: { productId: string; enabled: boolean }) =>
      updateProductEnabled(productId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
