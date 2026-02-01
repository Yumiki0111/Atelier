"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@atelier/shared";
import { createProductSchema, updateProductSchema } from "@atelier/shared";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { extractErrorMessage, translateErrorMessage } from "@/lib/errors/error-handler";

async function fetchProducts(shopId: string): Promise<Product[]> {
  const response = await authenticatedFetch(`/api/products?shopId=${encodeURIComponent(shopId)}`);
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(translateErrorMessage(errorMessage));
  }
  return response.json();
}

async function fetchProduct(id: string): Promise<Product> {
  const response = await authenticatedFetch(`/api/products/${id}`);
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(translateErrorMessage(errorMessage));
  }
  return response.json();
}

async function addProduct(
  product: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<Product> {
  const response = await authenticatedFetch("/api/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(translateErrorMessage(errorMessage));
  }

  return response.json();
}

async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>
): Promise<Product> {
  const response = await authenticatedFetch(`/api/products/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(translateErrorMessage(errorMessage));
  }

  return response.json();
}

export function useProducts() {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["products", shopId],
    queryFn: () => fetchProducts(shopId),
    enabled: !!shopId,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
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

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateProduct>[1] }) =>
      updateProduct(id, updates),
    onSuccess: (_, variables) => {
      // すべてのproductsクエリを無効化（shopIdに関係なく）
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", variables.id] });
      // 明示的にrefetchも実行
      queryClient.refetchQueries({ queryKey: ["products"] });
    },
  });
}

async function deleteProduct(id: string): Promise<void> {
  const response = await authenticatedFetch(`/api/products/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(translateErrorMessage(errorMessage));
  }
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

async function bulkDeleteProducts(productIds: string[]): Promise<{ deletedCount: number }> {
  const response = await authenticatedFetch("/api/products/bulk-delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productIds }),
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(translateErrorMessage(errorMessage));
  }

  return response.json();
}

export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkDeleteProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
