"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Mail, Shield, AlertCircle, Key, Globe, Copy, CheckCircle, Eye, EyeOff, Users, Trash2, Crown, User as UserIcon, X } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Member 型定義
interface Member {
  id: string;
  email: string;
  name: string | null;
  role: "owner" | "member";
  created_at: string;
}

// メンバー管理コンポーネント
function MemberManagement({ currentUserId, userRole }: { currentUserId: string; userRole: "owner" | "member" | null }) {
  const isOwner = userRole === "owner";
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch("/api/admin/members");
        if (response.ok) {
          const data = await response.json();
        setMembers(data);
      } else {
        const error = await response.json();
        // メンバーも一覧は見れるので、エラーメッセージを変更
        if (error.error?.includes("Only owners")) {
          // これは権限変更などの操作時のみ表示されるエラー
          console.warn("Members list fetch failed:", error);
        }
        toast.error("メンバー一覧の取得に失敗しました");
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("メンバー一覧の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

  const handleRoleChange = async (memberId: string, newRole: "owner" | "member") => {
    if (memberId === currentUserId) {
      toast.error("自分自身の権限は変更できません");
      return;
    }

    setUpdatingMemberId(memberId);
    try {
      const response = await authenticatedFetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "権限の変更に失敗しました");
      }

      toast.success("権限を変更しました");
      await fetchMembers();
    } catch (error) {
      console.error("Role change error:", error);
      const errorMessage = error instanceof Error ? error.message : "権限の変更に失敗しました";
      toast.error(errorMessage);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleDeleteMember = async (memberId: string, memberEmail: string) => {
    if (memberId === currentUserId) {
      toast.error("自分自身を削除することはできません");
      return;
    }

    if (!confirm(`本当に ${memberEmail} を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setUpdatingMemberId(memberId);
    try {
      const response = await authenticatedFetch(`/api/admin/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "メンバーの削除に失敗しました");
      }

      toast.success("メンバーを削除しました");
      await fetchMembers();
    } catch (error) {
      console.error("Delete member error:", error);
      const errorMessage = error instanceof Error ? error.message : "メンバーの削除に失敗しました";
      toast.error(errorMessage);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            メンバー管理
          </CardTitle>
          <CardDescription>
            ショップメンバーの権限管理と削除
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            メンバー一覧
          </CardTitle>
          <CardDescription>
            {isOwner 
              ? "ショップメンバーの権限管理と削除"
              : "ショップメンバーの一覧（閲覧のみ）"}
          </CardDescription>
        </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>メールアドレス</TableHead>
                <TableHead>名前</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>参加日</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    メンバーが見つかりません
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.email}
                      {member.id === currentUserId && (
                        <span className="ml-2 text-xs text-gray-500">(あなた)</span>
                      )}
                    </TableCell>
                    <TableCell>{member.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.id === currentUserId ? (
                          // 自分自身の場合は変更不可
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-sm">
                            {member.role === "owner" ? (
                              <>
                                <Crown className="h-3.5 w-3.5 text-yellow-600" />
                                <span>オーナー</span>
                              </>
                            ) : (
                              <>
                                <UserIcon className="h-3.5 w-3.5 text-blue-600" />
                                <span>メンバー</span>
                              </>
                            )}
                          </div>
                        ) : isOwner ? (
                          // オーナーの場合のみ変更可能
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleRoleChange(member.id, value as "owner" | "member")
                            }
                            disabled={updatingMemberId === member.id}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">
                                <div className="flex items-center gap-1.5">
                                  <Crown className="h-3.5 w-3.5 text-yellow-600" />
                                  <span>オーナー</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="member">
                                <div className="flex items-center gap-1.5">
                                  <UserIcon className="h-3.5 w-3.5 text-blue-600" />
                                  <span>メンバー</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          // メンバーの場合は表示のみ
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-sm">
                            {member.role === "owner" ? (
                              <>
                                <Crown className="h-3.5 w-3.5 text-yellow-600" />
                                <span>オーナー</span>
                              </>
                            ) : (
                              <>
                                <UserIcon className="h-3.5 w-3.5 text-blue-600" />
                                <span>メンバー</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(member.created_at).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      {isOwner && member.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id, member.email)}
                          disabled={updatingMemberId === member.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">注意事項:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>オーナーは全ての機能にアクセスできます</li>
                <li>メンバーは基本的な機能のみ使用できます</li>
                <li>削除されたメンバーはログインできなくなります</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Widget 設定コンポーネント
function WidgetSettings({ shopId }: { shopId: string }) {
  const [widgetKeys, setWidgetKeys] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchWidgetKeys();
  }, [shopId]);

  const fetchWidgetKeys = async () => {
    if (!shopId) return;
    
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/widget-keys?shopId=${shopId}`);
      if (response.ok) {
        const data = await response.json();
        setWidgetKeys(data[0]); // 最初のキーを取得
      }
    } catch (error) {
      console.error("Failed to fetch widget keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("クリップボードにコピーしました");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("コピーに失敗しました");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Widget 設定
          </CardTitle>
          <CardDescription>
            公開APIキーとドメイン設定
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  if (!widgetKeys) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Widget 設定
          </CardTitle>
          <CardDescription>
            公開APIキーとドメイン設定
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Widget キーが見つかりません</p>
                <p>管理者に連絡して、Widget キーを発行してもらってください。</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Widget 設定
        </CardTitle>
        <CardDescription>
          公開APIキーとドメイン設定
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Public Key */}
          <div className="space-y-2">
          <Label className="text-sm text-gray-600">Public Key（クライアント用）</Label>
          <div className="flex gap-2">
            <Input
              value={showPublicKey ? widgetKeys.public_key : "pub_live_••••••••••••••••"}
              readOnly
              className="font-mono text-sm bg-gray-50"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowPublicKey(!showPublicKey)}
            >
              {showPublicKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(widgetKeys.public_key, "public_key")}
            >
              {copiedField === "public_key" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            このキーをウェブサイトに埋め込んで、Widget APIを使用します
          </p>
        </div>

        {/* Allowed Domains */}
          <div className="space-y-2">
          <Label className="text-sm text-gray-600 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            許可ドメイン
          </Label>
          <div className="p-3 bg-gray-50 border rounded-md">
            {widgetKeys.allowed_domains && widgetKeys.allowed_domains.length > 0 ? (
              <ul className="space-y-1">
                {widgetKeys.allowed_domains.map((domain: string, index: number) => (
                  <li key={index} className="text-sm font-mono">
                    • {domain}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">ドメインが設定されていません</p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            これらのドメインからのみ Widget API を使用できます
          </p>
          </div>

        {/* Status */}
          <div className="space-y-2">
          <Label className="text-sm text-gray-600">ステータス</Label>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                widgetKeys.enabled ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span className="text-sm">
              {widgetKeys.enabled ? "有効" : "無効"}
            </span>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Widget API の使い方:</p>
              <p>
                <code className="bg-blue-100 px-1 rounded text-xs">
                  GET /api/public/widget-config?publicKey={"{PUBLIC_KEY}"}&externalProductId={"{PRODUCT_ID}"}
                </code>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, shopId, userRole } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  
  // オーナーのみアクセス可能な機能
  const isOwner = userRole === "owner";

  // メールアドレスのバリデーション
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // メールアドレスを追加
  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent) => {
    e.preventDefault();
    const trimmedEmail = emailInput.trim();

    if (!trimmedEmail) return;

    // カンマ区切りで複数入力された場合
    const emails = trimmedEmail.split(",").map(e => e.trim()).filter(e => e.length > 0);

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

    // 入力ボックスをクリア（同じボックスに再入力可能）
    setEmailInput("");
  };

  // メールアドレスを削除
  const handleRemoveEmail = (emailToRemove: string) => {
    setEmailList((prev) => prev.filter((email) => email !== emailToRemove));
  };

  // 一括招待
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberEmails: emailList }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "招待に失敗しました");
      }

      const data = await response.json();
      
      // 結果を表示
      if (data.results) {
        const { success, failed, skipped } = data.results;
        if (success.length > 0) {
          toast.success(`${success.length}件の招待を送信しました`);
        }
        if (skipped.length > 0) {
          toast.info(`${skipped.length}件は既に招待済みです`);
        }
        if (failed.length > 0) {
          toast.error(`${failed.length}件の招待に失敗しました`);
        }
      } else {
        toast.success(data.message || "招待を送信しました");
      }

      // リストをクリア
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
          <CardDescription>
            現在ログイン中のアカウント情報
          </CardDescription>
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
              
              {/* メールアドレスチップ表示エリア */}
              {emailList.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-gray-50 min-h-[60px]">
                  {emailList.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md text-sm"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        disabled={isInviting}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 入力ボックス */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="memberEmails"
                  type="text"
                  placeholder="member@example.com と入力して Enter またはカンマ（,）で確定"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmail(e);
                    } else if (e.key === ",") {
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

      {/* メンバー管理（全員閲覧可能、編集はオーナーのみ） */}
      <MemberManagement currentUserId={user?.id || ""} userRole={userRole} />

      {/* Widget 設定（Owner のみ） */}
      {isOwner && <WidgetSettings shopId={shopId} />}
    </div>
  );
}
