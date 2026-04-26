"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, LayoutDashboard, Search, Key } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { PageHeader } from "@/components/page-header/PageHeader";
import { ConsoleSectionPanel } from "@/components/console/ConsoleSectionPanel";
import {
  consolePageShellClass,
  consolePanelClass,
  consolePrimaryCtaButtonClass,
  consoleTableBodyRowClass,
  consoleTableFixedClass,
  consoleTableHeadCellClass,
  consoleTableHeaderRowClass,
} from "@/lib/console-ui";
import { cn } from "@/lib/utils";

interface Shop {
  id: string;
  name: string;
  enabled: boolean;
  created_at: string;
}

export default function ShopsListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isProvisionAdmin, setOperatorShopId } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [useAdminToken, setUseAdminToken] = useState(false);
  const [isLoadingShops, setIsLoadingShops] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchShops = async () => {
    if (useAdminToken && !adminToken.trim()) {
      toast.error("管理者トークンを入力してください");
      return;
    }

    setIsLoadingShops(true);
    try {
      const response = useAdminToken
        ? await fetch("/api/internal/shops", {
            headers: {
              "x-admin-token": adminToken,
            },
          })
        : await authenticatedFetch("/api/internal/shops");

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "ショップ一覧の取得に失敗しました");
      }

      const data = await response.json();
      setShops(data);
    } catch (error) {
      console.error("Fetch error:", error);
      const errorMessage = error instanceof Error ? error.message : "ショップ一覧の取得に失敗しました";

      if (errorMessage.includes("Unauthorized")) {
        toast.error("権限がありません。運営アカウントでログインするか、管理者トークンを確認してください");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoadingShops(false);
    }
  };

  const filteredShops = shops.filter((shop) => shop.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) {
    return (
      <div className={consolePageShellClass}>
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isProvisionAdmin) {
    return (
      <div className={consolePageShellClass}>
        <PageHeader title="ショップ一覧" />
        <ConsoleSectionPanel
          title="権限がありません"
          description="このページは FIT&LOOK 発行管理者のみが利用できます。"
          icon={Key}
        >
          <Button type="button" variant="outline" onClick={() => router.push("/database/products")}>
            商品ライブラリへ
          </Button>
        </ConsoleSectionPanel>
      </div>
    );
  }

  return (
    <div className={consolePageShellClass}>
      <PageHeader title="ショップ一覧" />
      <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
        登録されている全ショップを確認できます。「管理画面」で各ブランドのコンソール（商品・ウィジェット等）を代理表示します。
      </p>

      <ConsoleSectionPanel
        title="認証"
        description="通常はログイン中の発行管理者で一覧を取得します。CLI 用に ADMIN_TOKEN を使う場合はチェックをオンにします。"
        icon={Key}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Checkbox
              id="shopsUseAdminToken"
              checked={useAdminToken}
              onCheckedChange={(v) => setUseAdminToken(v === true)}
            />
            <Label htmlFor="shopsUseAdminToken" className="cursor-pointer text-sm font-normal leading-none">
              ADMIN_TOKEN で取得する
            </Label>
          </div>
          {useAdminToken ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="password"
                placeholder="ADMIN_TOKEN"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                autoComplete="off"
                className="sm:min-w-0 sm:flex-1"
              />
              <Button type="button" onClick={fetchShops} disabled={isLoadingShops} className={cn("shrink-0", consolePrimaryCtaButtonClass)}>
                {isLoadingShops ? "読込中..." : "ショップを表示"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="flex-1 text-xs text-muted-foreground">ログインセッションで取得します。</p>
              <Button type="button" onClick={fetchShops} disabled={isLoadingShops} className={cn("sm:shrink-0", consolePrimaryCtaButtonClass)}>
                {isLoadingShops ? "読込中..." : "ショップを表示"}
              </Button>
            </div>
          )}
        </div>
      </ConsoleSectionPanel>

      {shops.length > 0 ? (
        <ConsoleSectionPanel
          title={`ショップ一覧（${filteredShops.length}件）`}
          description="ショップ名で絞り込みできます。"
          icon={Building2}
          contentClassName="space-y-4"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              placeholder="ショップ名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              aria-label="ショップ名で検索"
            />
          </div>

          <div className={consolePanelClass}>
            <Table className={consoleTableFixedClass}>
              <TableHeader>
                <TableRow className={consoleTableHeaderRowClass}>
                  <TableHead scope="col" className={cn(consoleTableHeadCellClass, "py-3 pl-4 pr-2")}>
                    ショップ名
                  </TableHead>
                  <TableHead scope="col" className={cn(consoleTableHeadCellClass, "py-3 px-2")}>
                    Shop ID
                  </TableHead>
                  <TableHead scope="col" className={cn(consoleTableHeadCellClass, "py-3 px-2")}>
                    ステータス
                  </TableHead>
                  <TableHead scope="col" className={cn(consoleTableHeadCellClass, "py-3 px-2")}>
                    作成日
                  </TableHead>
                  <TableHead scope="col" className={cn(consoleTableHeadCellClass, "py-3 pr-4 pl-2 text-right")}>
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShops.length === 0 ? (
                  <TableRow className={consoleTableBodyRowClass}>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      検索結果がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShops.map((shop) => (
                    <TableRow key={shop.id} className={consoleTableBodyRowClass}>
                      <TableCell className="py-3 pl-4 pr-2 font-medium">{shop.name}</TableCell>
                      <TableCell className="py-3 px-2 font-mono text-xs text-muted-foreground">{shop.id}</TableCell>
                      <TableCell className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn("h-2 w-2 rounded-full", shop.enabled ? "bg-emerald-500" : "bg-muted-foreground/30")}
                          />
                          <span className="text-sm">{shop.enabled ? "有効" : "無効"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-2 text-sm text-muted-foreground">
                        {new Date(shop.created_at).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="py-3 pr-4 pl-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          className="gap-1.5"
                          onClick={() => {
                            setOperatorShopId(shop.id);
                            toast.success(`「${shop.name}」の管理画面を開きます`);
                            router.push("/database/products");
                          }}
                        >
                          <LayoutDashboard className="h-4 w-4" aria-hidden />
                          管理画面
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ConsoleSectionPanel>
      ) : null}
    </div>
  );
}
