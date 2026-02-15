"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Mail, Shield, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { MemberManagement } from "./MemberManagement";
import { WidgetSettings } from "./WidgetSettings";

export default function SettingsPage() {
  const { user, shopId, userRole } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  
  const isOwner = userRole === "owner";

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent) => {
    e.preventDefault();
    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) return;

    const emails = trimmedEmail.split(",").map(e => e.trim()).filter(e => e.length > 0);

    for (const email of emails) {
      if (!isValidEmail(email)) { toast.error(`無効なメールアドレス: ${email}`); continue; }
      const normalizedEmail = email.toLowerCase();
      if (emailList.includes(normalizedEmail)) { toast.error(`既に追加済み: ${email}`); continue; }
      setEmailList((prev) => [...prev, normalizedEmail]);
    }

    setEmailInput("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmailList((prev) => prev.filter((email) => email !== emailToRemove));
  };

  const handleInviteMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (emailList.length === 0) {
      toast.error("メールアドレスを追加してください");
      return;
    }

    setIsInviting(true);
    
    try {
      const response = await authenticatedFetch("/api/admin/invite-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberEmails: emailList }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "招待に失敗しました");
      }

      const data = await response.json();
      
      if (data.results) {
        const { success, failed, skipped } = data.results;
        if (success.length > 0) toast.success(`${success.length}件の招待を送信しました`);
        if (skipped.length > 0) toast.info(`${skipped.length}件は既に招待済みです`);
        if (failed.length > 0) toast.error(`${failed.length}件の招待に失敗しました`);
      } else {
        toast.success(data.message || "招待を送信しました");
      }

      setEmailList([]);
      setEmailInput("");
    } catch (error) {
      console.error("Invite error:", error);
      const errorMessage = error instanceof Error ? error.message : "招待に失敗しました";
      if (errorMessage.includes("Only owners")) {
        toast.error("メンバーの招待はオーナーのみ実行できます");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">設定</h1>
        <p className="text-sm text-gray-600 mt-1">
          アカウントとショップの設定を管理します
        </p>
      </div>

      {/* アカウント情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            アカウント情報
          </CardTitle>
          <CardDescription>現在ログイン中のアカウント情報</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">メールアドレス</Label>
              <p className="text-sm font-medium mt-1">{user?.email || "-"}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">ショップID</Label>
              <p className="text-sm font-mono mt-1">{shopId || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* メンバー招待（Owner のみ） */}
      {isOwner && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            メンバー招待
          </CardTitle>
          <CardDescription>
            新しいメンバーをこのショップに招待します（オーナーのみ、複数人一括招待可能）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteMembers} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberEmails">招待するメールアドレス</Label>
              
              {emailList.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-gray-50 min-h-[60px]">
                  {emailList.map((email) => (
                      <div key={email} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md text-sm">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{email}</span>
                        <button type="button" onClick={() => handleRemoveEmail(email)} className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors" disabled={isInviting}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="memberEmails"
                  type="text"
                  placeholder="member@example.com と入力して Enter またはカンマ（,）で確定"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAddEmail(e); }
                  }}
                  className="pl-9"
                  disabled={isInviting}
                />
              </div>
                <Button type="submit" disabled={isInviting || emailList.length === 0} className="w-full">
                {isInviting ? "送信中..." : `${emailList.length}件の招待を送信`}
              </Button>
              <p className="text-xs text-gray-500">
                Enter キーまたはカンマ（,）でメールアドレスを確定します。複数人を一度に招待できます。
              </p>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">招待の流れ:</p>
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>メールアドレスを入力して Enter または「追加」ボタンをクリック</li>
                    <li>複数のメールアドレスを追加できます</li>
                    <li>「招待を送信」ボタンで一括送信</li>
                    <li>メンバーがメールのリンクからパスワードを設定</li>
                    <li>ログイン後、このショップにアクセス可能になります</li>
                  </ol>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      {/* メンバー管理 */}
      <MemberManagement currentUserId={user?.id || ""} userRole={userRole} />

      {/* Widget 設定（Owner のみ） */}
      {isOwner && <WidgetSettings shopId={shopId} />}
    </div>
  );
}
