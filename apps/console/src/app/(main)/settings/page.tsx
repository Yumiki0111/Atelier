"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { PageHeader } from "@/components/page-header/PageHeader";
import { ConsoleSectionPanel } from "@/components/console/ConsoleSectionPanel";
import { consolePageShellClass } from "@/lib/console-ui";
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

    const emails = trimmedEmail.split(",").map((e) => e.trim()).filter((e) => e.length > 0);

    for (const email of emails) {
      if (!isValidEmail(email)) {
        toast.error(`無効なメールアドレス: ${email}`);
        continue;
      }
      const normalizedEmail = email.toLowerCase();
      if (emailList.includes(normalizedEmail)) {
        toast.error(`既に追加済み: ${email}`);
        continue;
      }
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
    <div className={consolePageShellClass}>
      <PageHeader title="アカウント設定" />

      <ConsoleSectionPanel
        title="アカウント情報"
        description="ログイン中のアカウントと、このショップの識別子です。"
        icon={Shield}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm text-muted-foreground">メールアドレス</Label>
            <p className="mt-1 text-sm font-medium">{user?.email || "—"}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">ショップID</Label>
            <p className="mt-1 font-mono text-sm font-medium">{shopId || "—"}</p>
          </div>
        </div>
      </ConsoleSectionPanel>

      {isOwner && (
        <ConsoleSectionPanel
          title="メンバー招待"
          description="ショップに参加してもらうメールアドレスを追加し、一括で招待メールを送ります。"
          icon={UserPlus}
        >
          <form onSubmit={handleInviteMembers} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberEmails">招待するメールアドレス</Label>

              {emailList.length > 0 && (
                <div className="flex min-h-[60px] flex-wrap gap-2 rounded-md border border-[#EEEEEE] bg-muted/30 p-3">
                  {emailList.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-1.5 rounded-md bg-background px-3 py-1.5 text-sm text-foreground shadow-sm"
                    >
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        disabled={isInviting}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="memberEmails"
                  type="text"
                  placeholder="member@example.com と入力して Enter またはカンマ（,）で確定"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      handleAddEmail(e);
                    }
                  }}
                  className="pl-9"
                  disabled={isInviting}
                />
              </div>
              <Button
                type="submit"
                disabled={isInviting || emailList.length === 0}
                className="w-full"
              >
                {isInviting ? "送信中..." : `${emailList.length}件の招待を送信`}
              </Button>
            </div>
          </form>
        </ConsoleSectionPanel>
      )}

      <MemberManagement currentUserId={user?.id || ""} userRole={userRole} />

      {isOwner && <WidgetSettings shopId={shopId} />}
    </div>
  );
}
