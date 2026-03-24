"use client";

import { useState } from "react";
import type { CustomGarmentData, GarmentType } from "./fitting/lib/types";
import { sanitizeCustomGarmentForProductDb } from "./fitting/lib/sanitizeCustomGarmentForProductDb";
import { useAddProduct } from "@/features/products/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage, translateErrorMessage } from "@/lib/errors/error-handler";
import { Database } from "lucide-react";

interface DevelopmentProductRegisterPanelProps {
  garment: GarmentType;
  customGarmentData: CustomGarmentData | null;
}

export function DevelopmentProductRegisterPanel({
  garment,
  customGarmentData,
}: DevelopmentProductRegisterPanelProps) {
  const { shopId } = useAuth();
  const addProduct = useAddProduct();
  const [name, setName] = useState("");

  const canRegister =
    !!shopId &&
    garment === "custom" &&
    customGarmentData != null &&
    customGarmentData.pathDs.length > 0;

  const handleRegister = async () => {
    if (!canRegister || !customGarmentData) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("商品名を入力してください");
      return;
    }

    const garmentSpec = sanitizeCustomGarmentForProductDb(customGarmentData);

    try {
      await addProduct.mutateAsync({
        shopId,
        name: trimmed,
        category: "トップス",
        garmentSpec,
      });
      toast.success("商品データベースに登録しました");
      setName("");
    } catch (e) {
      console.error(e);
      const msg = translateErrorMessage(getErrorMessage(e));
      if (msg.toLowerCase().includes("garment_spec") || msg.includes("column")) {
        toast.error(
          "DB に garment_spec カラムがありません。supabase/add-products-garment-spec.sql を実行してください。"
        );
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <div className="shrink-0 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-sm ring-1 ring-amber-100">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1 space-y-1">
          <Label htmlFor="dev-product-name" className="text-xs text-amber-950/80">
            商品DB登録名
          </Label>
          <Input
            id="dev-product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: サンプルブラウス A"
            className="h-9 bg-white"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-2 bg-amber-900 text-white hover:bg-amber-950"
          disabled={!canRegister || addProduct.isPending}
          onClick={handleRegister}
        >
          <Database className="h-4 w-4" />
          {addProduct.isPending ? "登録中…" : "商品データベースに登録"}
        </Button>
      </div>
      {!canRegister ? (
        <p className="mt-2 text-xs text-amber-900/70">
          カスタム服で SVG を読み込んだ状態でのみ登録できます。リグ・デバッグ用データは送信されません。
        </p>
      ) : (
        <p className="mt-2 text-xs text-amber-900/70">
          送信内容: SVG path、ランドマーク、採寸、袖丈・着丈の計測頂点、グレーディング情報（リグ path・整列デバッグは除く）
        </p>
      )}
    </div>
  );
}
