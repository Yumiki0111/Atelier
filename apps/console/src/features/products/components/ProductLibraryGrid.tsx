"use client";

import { useCallback, useMemo, useState } from "react";
import type { Product } from "@Atelier/shared";
import Link from "next/link";
import { Loader2, Package, Pencil, Trash2, Trash } from "lucide-react";
import { PageHeader } from "@/components/page-header/PageHeader";
import { ConsoleSearchField } from "@/components/console/ConsoleSearchField";
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
import {
  consoleAccentCheckboxClassName,
  consoleControlSelectTriggerClass,
  consolePageShellClass,
  consolePanelClass,
  consolePrimaryCtaButtonClass,
  consoleTableBodyRowClass,
  consoleTableFixedClass,
  consoleTableHeadCellClass,
  consoleTableHeaderRowClass,
  consoleTableRowCellBgClass,
} from "@/lib/console-ui";

const EditIcon = Pencil;

/** アクティブなアセット行または garmentSpec があるときだけプレビュー可能 */
function isProductPreviewable(product: Product): boolean {
  if ((product.assetSizes?.length ?? 0) > 0) return true;
  return isGarmentSpecRenderable(product.garmentSpec);
}

function formatPriceYen(yen: number | null | undefined): string {
  if (yen == null) return "—";
  return `¥ ${yen.toLocaleString("ja-JP")}`;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const sortedProducts = useMemo(() => {
    if (!products?.length) return [];
    return sortProducts(products, sortKey);
  }, [products, sortKey]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products ?? []) {
      const c = p.category?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = sortedProducts;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const cat = (p.category || "").toLowerCase();
        return name.includes(q) || cat.includes(q);
      });
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => (p.category ?? "").trim() === categoryFilter);
    }
    return list;
  }, [sortedProducts, searchQuery, categoryFilter]);

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
    if (
      !confirm(
        "選択した商品を一括削除してもよろしいですか？\nこの操作は取り消せません。"
      )
    ) {
      return;
    }
    try {
      const productIds = Array.from(selectedRowIds);
      await bulkDeleteProducts.mutateAsync(productIds);
      if (selectedProduct && productIds.includes(selectedProduct.id)) {
        clearProductSelection();
      }
      toast.success("一括削除しました");
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

  /** 同じ行をもう一度タップで選択解除（右プレビューを閉じる） */
  const handleRowPreviewToggle = useCallback(
    (product: Product) => {
      if (!isProductPreviewable(product)) return;

      if (selectedProduct?.id === product.id) {
        clearProductSelection();
        return;
      }

      selectProduct(product, "M");
      if (!isPreviewOpen) {
        togglePreview();
      }
    },
    [selectedProduct?.id, isPreviewOpen, selectProduct, togglePreview, clearProductSelection]
  );

  const total = products?.length ?? 0;
  const allSelected =
    filteredProducts.length > 0 && filteredProducts.every((p) => selectedRowIds.has(p.id));
  const someSelected =
    selectedRowIds.size > 0 &&
    filteredProducts.some((p) => selectedRowIds.has(p.id)) &&
    !allSelected;

  const showToolbar = Boolean(shopId && !isLoading && !isError && total > 0);

  return (
    <div className={consolePageShellClass}>
      <PageHeader title="商品ライブラリ" />

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
        <div className="w-full min-w-0 space-y-3">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
            <ConsoleSearchField
              wrapperClassName="flex-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="商品を検索"
              aria-label="商品を検索"
            />
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger
                className={cn(
                  consoleControlSelectTriggerClass,
                  "min-w-[11rem] text-sm lg:w-[min(100%,13rem)] lg:shrink-0"
                )}
                id="product-library-sort"
                aria-label="並び替え"
              >
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger
                className={cn(
                  consoleControlSelectTriggerClass,
                  "min-w-[10.5rem] lg:w-[min(100%,12rem)] lg:shrink-0"
                )}
                aria-label="カテゴリで絞り込み"
              >
                <SelectValue placeholder="カテゴリ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのカテゴリ</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showToolbar && selectedRowIds.size > 0 && (
            <div className="flex justify-end">
              <Button
                type="button"
                className={consolePrimaryCtaButtonClass}
                disabled={bulkDeleteProducts.isPending}
                aria-label="選択した商品を一括削除"
                onClick={() => void handleBulkDelete()}
              >
                <Trash className="h-4 w-4" aria-hidden />
                {bulkDeleteProducts.isPending ? "削除中…" : "一括削除"}
              </Button>
            </div>
          )}

          <div className={consolePanelClass}>
          <Table className={consoleTableFixedClass}>
            <colgroup>
              <col className="w-12" />
              <col className="w-[3.75rem]" />
              <col />
              <col className="min-w-[6.5rem] w-[18%]" />
              <col className="w-[6.5rem]" />
              <col className="w-[5.5rem]" />
            </colgroup>
            <TableHeader>
              <TableRow className={consoleTableHeaderRowClass}>
                <TableHead
                  scope="col"
                  className={cn(
                    consoleTableHeadCellClass,
                    "box-border py-3 pl-4 pr-2 align-middle"
                  )}
                >
                  <span className="sr-only">選択</span>
                  <Checkbox
                    className={consoleAccentCheckboxClassName}
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        setSelectedRowIds(new Set(filteredProducts.map((p) => p.id)));
                      } else {
                        setSelectedRowIds(new Set());
                      }
                    }}
                    aria-label="表示中の商品をすべて選択"
                  />
                </TableHead>
                <TableHead
                  scope="col"
                  className={cn(consoleTableHeadCellClass, "py-3 pl-0 pr-3")}
                >
                  画像
                </TableHead>
                <TableHead className={cn(consoleTableHeadCellClass, "px-4 py-3")}>
                  商品名
                </TableHead>
                <TableHead className={cn(consoleTableHeadCellClass, "px-4 py-3")}>
                  カテゴリ
                </TableHead>
                <TableHead className={cn(consoleTableHeadCellClass, "px-4 py-3")}>
                  価格
                </TableHead>
                <TableHead
                  scope="col"
                  className={cn(consoleTableHeadCellClass, "py-3 pl-3 pr-4 text-right")}
                >
                  <span className="sr-only">操作</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-28 text-center text-sm text-muted-foreground"
                  >
                    条件に一致する商品がありません
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredProducts.map((product) => {
                const displayName = product.name?.trim() || "（名称未設定）";
                const categoryLine = product.category?.trim() || "—";
                const previewSelected = selectedProduct?.id === product.id;
                const bulkSelected = selectedRowIds.has(product.id);
                const previewable = isProductPreviewable(product);
                // tr だけに背景を付けると td（特に sticky）と塗りがズレるため、全セルに同一の背景を付ける
                const cellBg = consoleTableRowCellBgClass({
                  bulkSelected,
                  previewSelected,
                  previewable,
                });
                return (
                  <TableRow
                    key={product.id}
                    className={cn(
                      consoleTableBodyRowClass,
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
                        "box-border py-4 pl-4 pr-2 align-middle",
                        cellBg
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        className={consoleAccentCheckboxClassName}
                        checked={bulkSelected}
                        onCheckedChange={() => toggleRowSelection(product.id)}
                        aria-label={`${displayName}を選択`}
                      />
                    </TableCell>
                    <TableCell className={cn("py-4 pl-0 pr-3 align-middle", cellBg)}>
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
                        "max-w-0 overflow-hidden text-ellipsis px-4 py-4 align-middle text-sm font-medium text-foreground",
                        cellBg
                      )}
                      title={displayName}
                    >
                      {displayName}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "max-w-0 overflow-hidden text-ellipsis px-4 py-4 align-middle text-sm text-muted-foreground",
                        cellBg
                      )}
                      title={categoryLine === "—" ? undefined : categoryLine}
                    >
                      {categoryLine}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "overflow-hidden text-ellipsis px-4 py-4 text-left align-middle text-sm tabular-nums text-foreground",
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
                      className={cn("py-4 pl-3 pr-4 text-right align-middle", cellBg)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground/90 hover:bg-transparent hover:text-foreground"
                          title="編集"
                          onClick={() => setEditingProductId(product.id)}
                        >
                          <EditIcon className="h-4 w-4 stroke-[1.25]" aria-hidden />
                          <span className="sr-only">編集</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground/90 hover:bg-transparent hover:text-destructive"
                          title="削除"
                          disabled={deleteProduct.isPending}
                          onClick={() => void handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4 stroke-[1.25]" aria-hidden />
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
