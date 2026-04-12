"use client";

import { useCallback, useMemo, useState } from "react";
import type { Product } from "@Atelier/shared";
import Link from "next/link";
import { Loader2, Package, Pencil, Trash2, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBulkDeleteProducts, useDeleteProduct, useProducts } from "../useProducts";
import { getErrorMessage, translateErrorMessage } from "@/lib/errors/error-handler";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProductEditDialog } from "./ProductEditDialog";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";

const EditIcon = Pencil;

/** アクティブな 3D アセットまたは着せ替え用 garmentSpec があるときだけプレビュー可能 */
function isProductPreviewable(product: Product): boolean {
  if ((product.assetSizes?.length ?? 0) > 0) return true;
  return isGarmentSpecRenderable(product.garmentSpec);
}

/** 商品ライブラリのチェック（primary #E86F4C と統一） */
const libraryCheckboxClassName =
  "border-primary/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:border-primary/55 dark:data-[state=checked]:border-primary dark:data-[state=checked]:bg-primary";

function formatPriceYen(yen: number | null | undefined): string {
  if (yen == null) return "—";
  return `¥${yen.toLocaleString("ja-JP")}`;
}

type SortKey =
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "price_asc"
  | "price_desc"
  | "category_asc"
  | "external_asc";

function sortProducts(products: Product[], sortKey: SortKey): Product[] {
  const copy = [...products];
  switch (sortKey) {
    case "created_desc":
      return copy.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "created_asc":
      return copy.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    case "name_asc":
      return copy.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ja"));
    case "name_desc":
      return copy.sort((a, b) => (b.name || "").localeCompare(a.name || "", "ja"));
    case "price_asc":
      return copy.sort((a, b) => {
        const pa = a.priceYen;
        const pb = b.priceYen;
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pa - pb;
      });
    case "price_desc":
      return copy.sort((a, b) => {
        const pa = a.priceYen;
        const pb = b.priceYen;
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pb - pa;
      });
    case "category_asc":
      return copy.sort((a, b) =>
        (a.category ?? "").localeCompare(b.category ?? "", "ja")
      );
    case "external_asc":
      return copy.sort((a, b) =>
        (a.externalProductId || "").localeCompare(b.externalProductId || "", "ja")
      );
    default:
      return copy;
  }
}

export function ProductLibraryGrid() {
  const { shopId } = useAuth();
  const { data: products, isLoading, isError, error } = useProducts();
  const { selectProduct, togglePreview, isPreviewOpen, selectedProduct, clearProductSelection } =
    useProductSelection();
  const deleteProduct = useDeleteProduct();
  const bulkDeleteProducts = useBulkDeleteProducts();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("created_desc");

  const sortedProducts = useMemo(() => {
    if (!products?.length) return [];
    return sortProducts(products, sortKey);
  }, [products, sortKey]);

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
        setSelectedRowIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        toast.success("商品を削除しました");
      } catch (err) {
        console.error("Failed to delete product:", err);
        toast.error(translateErrorMessage(getErrorMessage(err)));
      }
    },
    [deleteProduct, selectedProduct, clearProductSelection]
  );

  const handleBulkDelete = useCallback(async () => {
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
      setSelectedRowIds(new Set());
    } catch (err) {
      console.error("Failed to bulk delete products:", err);
      toast.error(translateErrorMessage(getErrorMessage(err)));
    }
  }, [bulkDeleteProducts, selectedProduct, clearProductSelection]);

  const toggleRowSelection = useCallback((productId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  /** 同じ行をもう一度タップでプレビューを閉じる */
  const handleRowPreviewToggle = useCallback(
    (product: Product) => {
      if (!isProductPreviewable(product)) return;

      if (selectedProduct?.id === product.id && isPreviewOpen) {
        togglePreview();
        return;
      }

      if (selectedProduct?.id !== product.id) {
        selectProduct(product, "M");
      }
      if (!isPreviewOpen) {
        togglePreview();
      }
    },
    [selectedProduct?.id, isPreviewOpen, selectProduct, togglePreview]
  );

  const total = products?.length ?? 0;
  const allSelected = sortedProducts.length > 0 && selectedRowIds.size === sortedProducts.length;
  const someSelected = selectedRowIds.size > 0 && !allSelected;

  const showToolbar = Boolean(shopId && !isLoading && !isError && total > 0);

  return (
    <div className="w-full space-y-6">
      <header className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            商品ライブラリ
          </h1>
          {!isLoading ? (
            <span className="text-sm tabular-nums text-muted-foreground">{total} 件</span>
          ) : (
            <span className="text-sm text-muted-foreground">…</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          並び替えと一括削除は、下の表のすぐ上の「一覧の操作」にあります（一括削除はチェック選択時のみ表示）。
        </p>
      </header>

      {!shopId && (
        <p className="text-sm text-muted-foreground">ショップ情報を読み込み中です…</p>
      )}
      {shopId && isError && (
        <p className="text-sm text-destructive">
          {translateErrorMessage(getErrorMessage(error))}
        </p>
      )}
      {shopId && isLoading && (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" aria-hidden />
        </div>
      )}
      {shopId && !isLoading && !isError && total === 0 && (
        <div className="space-y-5 py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden />
          <p className="text-sm font-medium text-foreground">商品がまだありません</p>
          <Button asChild variant="outline">
            <Link href="/development">開発メニューを開く</Link>
          </Button>
        </div>
      )}
      {shopId && !isLoading && !isError && total > 0 && (
        <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
          {showToolbar && (
            <div
              className="border-b border-border/60 bg-muted/25 px-3 py-3 sm:px-4"
              aria-live="polite"
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  一覧の操作
                </span>
                <div className="flex w-full min-w-0 flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
                  {selectedRowIds.size > 0 && (
                    <Button
                      type="button"
                      className="h-10 w-full shrink-0 gap-2 border-0 bg-primary text-primary-foreground hover:brightness-95 focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-auto"
                      disabled={bulkDeleteProducts.isPending}
                      onClick={() => void handleBulkDelete()}
                    >
                      <Trash className="h-4 w-4" aria-hidden />
                      {bulkDeleteProducts.isPending
                        ? "削除中…"
                        : `${selectedRowIds.size}件を削除`}
                    </Button>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2 sm:min-w-[12rem] sm:max-w-[min(100%,14rem)] sm:flex-none">
                    <label
                      htmlFor="product-library-sort"
                      className="shrink-0 text-sm text-muted-foreground"
                    >
                      並び替え
                    </label>
                    <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                      <SelectTrigger className="h-10 w-full" id="product-library-sort">
                        <SelectValue placeholder="並び替え" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_desc">作成日（新しい順）</SelectItem>
                        <SelectItem value="created_asc">作成日（古い順）</SelectItem>
                        <SelectItem value="name_asc">商品名（あいうえお順）</SelectItem>
                        <SelectItem value="name_desc">商品名（逆順）</SelectItem>
                        <SelectItem value="price_asc">価格（安い順）</SelectItem>
                        <SelectItem value="price_desc">価格（高い順）</SelectItem>
                        <SelectItem value="category_asc">カテゴリ順</SelectItem>
                        <SelectItem value="external_asc">外部ID順</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
          <Table className="min-w-[48rem] table-fixed border-0 text-sm">
            <colgroup>
              {/* チェック列・画像列の幅を固定。sticky は画像列と重なるため使わない */}
              <col className="w-[3.25rem]" />
              <col className="w-[4.5rem]" />
              <col span={5} />
            </colgroup>
            <TableHeader>
              <TableRow className="whitespace-nowrap border-border/50 hover:bg-transparent">
                <TableHead scope="col" className="box-border bg-background pl-3 pr-2 align-middle">
                  <span className="sr-only">選択</span>
                  <Checkbox
                    className={libraryCheckboxClassName}
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        setSelectedRowIds(new Set(sortedProducts.map((p) => p.id)));
                      } else {
                        setSelectedRowIds(new Set());
                      }
                    }}
                    aria-label="すべて選択"
                  />
                </TableHead>
                <TableHead scope="col" className="pl-0 pr-6 font-medium text-muted-foreground">
                  画像
                </TableHead>
                <TableHead className="w-[28%] min-w-[11rem] px-6 font-medium text-muted-foreground">
                  商品名
                </TableHead>
                <TableHead className="hidden w-[22%] px-6 font-medium text-muted-foreground md:table-cell">
                  カテゴリ
                </TableHead>
                <TableHead className="hidden w-[14%] px-6 font-medium text-muted-foreground lg:table-cell">
                  外部ID
                </TableHead>
                <TableHead className="w-[7rem] px-6 text-left font-medium text-muted-foreground">
                  価格
                </TableHead>
                <TableHead
                  scope="col"
                  className="w-[8.5rem] pl-6 pr-0 text-left font-medium text-muted-foreground"
                >
                  <span className="sr-only">操作</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map((product) => {
                const displayName = product.name?.trim() || "（名称未設定）";
                const categoryLine = product.category?.trim() || "—";
                const extId = product.externalProductId?.trim() || "—";
                const previewSelected = selectedProduct?.id === product.id;
                const bulkSelected = selectedRowIds.has(product.id);
                const previewable = isProductPreviewable(product);
                // tr だけに背景を付けると td（特に sticky）と塗りがズレるため、全セルに同一の背景を付ける
                const cellBg = bulkSelected
                  ? "bg-primary/10 dark:bg-primary/15 group-hover:bg-primary/[0.14] dark:group-hover:bg-primary/25"
                  : previewSelected
                    ? "bg-primary/[0.08] group-hover:bg-primary/[0.12]"
                    : previewable
                      ? "bg-background group-hover:bg-muted/25"
                      : "bg-background";
                return (
                  <TableRow
                    key={product.id}
                    className={cn(
                      "whitespace-nowrap border-border/40 transition-colors hover:bg-transparent",
                      (bulkSelected || previewable) && "group",
                      previewable && "cursor-pointer",
                      !previewable && !bulkSelected && "cursor-default"
                    )}
                    onClick={(e) => {
                      const t = e.target as HTMLElement;
                      if (t.closest("button,a,[role='checkbox']")) return;
                      if (!previewable) return;
                      handleRowPreviewToggle(product);
                    }}
                  >
                    <TableCell
                      className={cn(
                        "box-border border-l-2 border-l-transparent py-3.5 pl-3 pr-2 align-middle",
                        bulkSelected && "border-l-primary",
                        cellBg
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        className={libraryCheckboxClassName}
                        checked={bulkSelected}
                        onCheckedChange={() => toggleRowSelection(product.id)}
                        aria-label={`${displayName}を選択`}
                      />
                    </TableCell>
                    <TableCell className={cn("py-3.5 pl-0 pr-6 align-middle", cellBg)}>
                      {product.thumbnailUrl ? (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted/50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover object-top"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/40 text-[10px] text-muted-foreground">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "max-w-0 overflow-hidden text-ellipsis px-6 py-3.5 align-middle font-medium",
                        cellBg
                      )}
                      title={displayName}
                    >
                      {displayName}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "hidden max-w-0 overflow-hidden text-ellipsis px-6 py-3.5 align-middle text-muted-foreground md:table-cell",
                        cellBg
                      )}
                      title={categoryLine === "—" ? undefined : categoryLine}
                    >
                      {categoryLine}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "hidden max-w-0 overflow-hidden text-ellipsis px-6 py-3.5 align-middle font-mono text-xs text-muted-foreground lg:table-cell",
                        cellBg
                      )}
                      title={extId === "—" ? undefined : extId}
                    >
                      {extId}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "overflow-hidden text-ellipsis px-6 py-3.5 text-left align-middle tabular-nums",
                        cellBg
                      )}
                    >
                      <span
                        className={cn(
                          product.priceYen == null && "text-muted-foreground"
                        )}
                      >
                        {formatPriceYen(product.priceYen)}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn("py-3.5 pl-6 pr-0 text-left align-middle", cellBg)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-start gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-foreground"
                          title="編集"
                          onClick={() => setEditingProductId(product.id)}
                        >
                          <EditIcon className="h-4 w-4" aria-hidden />
                          <span className="sr-only">編集</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-destructive"
                          title="削除"
                          disabled={deleteProduct.isPending}
                          onClick={() => void handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          <span className="sr-only">削除</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {editingProductId && (
        <ProductEditDialog
          productId={editingProductId}
          open
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
