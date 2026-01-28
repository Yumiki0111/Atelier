"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAddProduct } from "../useProducts";
import { ProductCategory, ProductSize } from "../products.types";
import { Plus } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "商品名は必須です"),
  category: z.enum(["ジャケット", "コート", "トップス", "ボトムス"]),
  sizes: z.array(z.enum(["S", "M", "L"])).min(1, "サイズを1つ以上選択してください"),
  thumbnailUrl: z.string().optional(),
  previewImageUrl: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductAddDialogProps {
  onProductAdded?: () => void;
}

export function ProductAddDialog({ onProductAdded }: ProductAddDialogProps) {
  const [open, setOpen] = useState(false);
  const addProduct = useAddProduct();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sizes: [],
    },
  });

  const selectedSizes = watch("sizes") || [];
  const selectedCategory = watch("category");

  const toggleSize = (size: ProductSize) => {
    const currentSizes = selectedSizes;
    if (currentSizes.includes(size)) {
      setValue(
        "sizes",
        currentSizes.filter((s) => s !== size),
        { shouldValidate: true }
      );
    } else {
      setValue("sizes", [...currentSizes, size], { shouldValidate: true });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      await addProduct.mutateAsync({
        name: data.name,
        category: data.category,
        sizes: data.sizes,
        thumbnailUrl: data.thumbnailUrl || "https://placehold.co/100x100",
        previewImageUrl: data.previewImageUrl || "https://placehold.co/400x600",
      });
      reset();
      setOpen(false);
      onProductAdded?.();
    } catch (error) {
      console.error("Failed to add product:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          商品を追加
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>商品を追加</DialogTitle>
          <DialogDescription>
            新しい商品の情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">商品名</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="商品名を入力"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value: ProductCategory) =>
                setValue("category", value, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ジャケット">ジャケット</SelectItem>
                <SelectItem value="コート">コート</SelectItem>
                <SelectItem value="トップス">トップス</SelectItem>
                <SelectItem value="ボトムス">ボトムス</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>サイズ</Label>
            <div className="flex gap-4">
              {(["S", "M", "L"] as ProductSize[]).map((size) => (
                <div key={size} className="flex items-center space-x-2">
                  <Checkbox
                    id={`size-${size}`}
                    checked={selectedSizes.includes(size)}
                    onCheckedChange={() => toggleSize(size)}
                  />
                  <Label
                    htmlFor={`size-${size}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {size}
                  </Label>
                </div>
              ))}
            </div>
            {errors.sizes && (
              <p className="text-sm text-red-500">{errors.sizes.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">サムネイル画像URL（任意）</Label>
            <Input
              id="thumbnailUrl"
              {...register("thumbnailUrl")}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="previewImageUrl">プレビュー画像URL（任意）</Label>
            <Input
              id="previewImageUrl"
              {...register("previewImageUrl")}
              placeholder="https://..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={addProduct.isPending}>
              {addProduct.isPending ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
