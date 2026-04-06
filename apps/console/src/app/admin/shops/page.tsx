"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Search, Eye, Key } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Shop {
  id: string;
  name: string;
  enabled: boolean;
  created_at: string;
}

export default function ShopsListPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchShops = async () => {
    if (!adminToken) {
      toast.error("管理者トークンを入力してください");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/internal/shops", {
        headers: {
          "x-Atelier-admin-token": adminToken,
        },
      });

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
        toast.error("管理者トークンが無効です");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ショップ一覧（管理者専用）</h1>
        <p className="text-sm text-gray-600 mt-1">
          登録されている全ショップを確認できます
        </p>
      </div>

      {/* 認証 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            管理者認証
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Atelier_ADMIN_TOKEN"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
            />
            <Button onClick={fetchShops} disabled={isLoading}>
              {isLoading ? "読込中..." : "ショップを表示"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ショップ一覧 */}
      {shops.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                ショップ一覧（{filteredShops.length}件）
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="ショップ名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ショップ名</TableHead>
                    <TableHead>Shop ID</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShops.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        検索結果がありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShops.map((shop) => (
                      <TableRow key={shop.id}>
                        <TableCell className="font-medium">{shop.name}</TableCell>
                        <TableCell className="font-mono text-sm text-gray-600">
                          {shop.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                shop.enabled ? "bg-green-500" : "bg-gray-300"
                              }`}
                            />
                            <span className="text-sm">
                              {shop.enabled ? "有効" : "無効"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(shop.created_at).toLocaleDateString("ja-JP")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: ショップ詳細ページへ遷移
                              toast.info("詳細ページは開発中です");
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
