"use client";

import { useCallback } from "react";
import type { Product } from "@Atelier/shared";
import { Loader2, Trash2 } from "lucide-react";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteProduct, useProducts } from "../useProducts";
import { getErrorMessage, translateErrorMessage } from "@/lib/errors/error-handler";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CARD_BACKGROUNDS = [
  "bg-stone-100",
  "bg-slate-100",
  "bg-indigo-50",
  "bg-violet-50",
  "bg-amber-50",
] as const;

export function ProductLibraryGrid() {
  const { shopId } = useAuth();
  const { data: products, isLoading, isError, error } = useProducts();
  const { selectProduct, togglePreview, isPreviewOpen, selectedProduct, clearProductSelection } =
    useProductSelection();
  const deleteProduct = useDeleteProduct();

  const handleDelete = useCallback(
    async (productId: string) => {
      if (!confirm("この商品を削除してもよろしいですか？")) {
        return;
      }
      try {
        await deleteProduct.mutateAsync(productId);
        if (selectedProduct?.id === productId) {
          clearProductSelection();
        }
        toast.success("商品を削除しました");
      } catch (err) {
        console.error("Failed to delete product:", err);
        toast.error(translateErrorMessage(getErrorMessage(err)));
      }
    },
    [deleteProduct, selectedProduct?.id, clearProductSelection]
  );

  const handleCardClick = useCallback(
    (product: Product) => {
      selectProduct(product, "M");
      if (!isPreviewOpen) {
        togglePreview();
      }
    },
    [selectProduct, togglePreview, isPreviewOpen]
  );

  const total = products?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">商品ライブラリ</h1>
        <p className="mt-2 text-sm text-gray-600">
          合計: {isLoading ? "…" : total} 件
        </p>
        <p className="mt-3 max-w-2xl text-sm text-gray-600">
          商品の追加は開発タブから行います。SVG と採寸・グレーディングを整えて「商品データベースに登録」すると、ここに表示されます（PoC
          ではお客様と同じ画面を共有する想定です）。
        </p>
      </div>

      {!shopId && (
        <p className="text-center text-sm text-gray-600">ショップ情報を読み込み中です…</p>
      )}
      {shopId && isError && (
        <p className="text-center text-sm text-red-600">
          {translateErrorMessage(getErrorMessage(error))}
        </p>
      )}
      {shopId && isLoading && (
        <div className="flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-gray-300" />
        </div>
      )}
      {shopId && !isLoading && !isError && total === 0 && (
        <p className="text-sm text-gray-600">
          まだ商品がありません。開発タブで SVG を読み込み、登録してください。
        </p>
      )}
      {shopId && !isLoading && !isError && total > 0 && (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {products!.map((product, index) => {
            const label = product.externalProductId?.trim() || product.name;
            const bg = CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length];
            return (
              <li key={product.id} className="group">
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={() => handleCardClick(product)}
                    className="w-full text-left"
                  >
                    <div
                      className={cn(
                        "flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-2xl p-4 transition-transform group-hover:scale-[1.02]",
                        bg
                      )}
                    >
                      {product.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.thumbnailUrl}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain drop-shadow-sm"
                        />
                      ) : (
                        <span className="text-center text-sm text-gray-400">
                          画像なし
                          <br />
                          <span className="text-xs">（SVG のみ登録）</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-1 text-sm text-gray-800">{label}</p>
                  </button>
                  <button
                    type="button"
                    aria-label={`${label}を削除`}
                    disabled={deleteProduct.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      void handleDelete(product.id);
                    }}
                    className={cn(
                      "absolute right-2 top-2 z-10 rounded-full border border-gray-200 bg-white/95 p-2 text-gray-600 shadow-md",
                      "opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600",
                      "focus-visible:opacity-100 group-hover:opacity-100",
                      deleteProduct.isPending && "pointer-events-none opacity-50"
                    )}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
