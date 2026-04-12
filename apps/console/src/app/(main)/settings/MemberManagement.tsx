"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, User as UserIcon, Trash2 } from "lucide-react";
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

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: "owner" | "member";
  created_at: string;
}

interface MemberManagementProps {
  currentUserId: string;
  userRole: "owner" | "member" | null;
}

export function MemberManagement({ currentUserId, userRole }: MemberManagementProps) {
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
        if (error.error?.includes("Only owners")) {
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
        headers: { "Content-Type": "application/json" },
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
      toast.error(error instanceof Error ? error.message : "権限の変更に失敗しました");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleDeleteMember = async (memberId: string, memberEmail: string) => {
    if (memberId === currentUserId) {
      toast.error("自分自身を削除することはできません");
      return;
    }

    if (!confirm(`本当に ${memberEmail} を削除しますか？この操作は取り消せません。`)) return;

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
      toast.error(error instanceof Error ? error.message : "メンバーの削除に失敗しました");
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
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">読み込み中...</p>
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
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    メンバーが見つかりません
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.email}
                      {member.id === currentUserId && (
                        <span className="ml-2 text-xs text-muted-foreground">(あなた)</span>
                      )}
                    </TableCell>
                    <TableCell>{member.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.id === currentUserId ? (
                          <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-sm">
                            {member.role === "owner" ? (
                              <><Crown className="h-3.5 w-3.5 text-primary" /><span>オーナー</span></>
                            ) : (
                              <><UserIcon className="h-3.5 w-3.5 text-muted-foreground" /><span>メンバー</span></>
                            )}
                          </div>
                        ) : isOwner ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.id, value as "owner" | "member")}
                            disabled={updatingMemberId === member.id}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">
                                <div className="flex items-center gap-1.5">
                                  <Crown className="h-3.5 w-3.5 text-primary" /><span>オーナー</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="member">
                                <div className="flex items-center gap-1.5">
                                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground" /><span>メンバー</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-sm">
                            {member.role === "owner" ? (
                              <><Crown className="h-3.5 w-3.5 text-primary" /><span>オーナー</span></>
                            ) : (
                              <><UserIcon className="h-3.5 w-3.5 text-muted-foreground" /><span>メンバー</span></>
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
        </div></CardContent>
    </Card>
  );
}
