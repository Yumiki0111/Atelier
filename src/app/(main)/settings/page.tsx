"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const [name, setName] = useState("山田 太郎");
  const [email, setEmail] = useState("yamada@example.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // フロントのみのため、実際の保存処理は実装しない
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // フロントのみのため、実際の保存処理は実装しない
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">アカウント設定</h1>
        <p className="text-sm text-gray-600 mt-1">
          アカウント情報と設定を管理します
        </p>
      </div>

      {/* プロフィール情報 */}
      <div className="bg-white rounded-md border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">プロフィール情報</h2>
        </div>
        <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田 太郎"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@atelier.com"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "保存中..." : "変更を保存"}
            </Button>
          </div>
        </form>
      </div>

      {/* パスワード変更 */}
      <div className="bg-white rounded-md border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">パスワード変更</h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">現在のパスワード</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">新しいパスワード</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "保存中..." : "パスワードを変更"}
            </Button>
          </div>
        </form>
      </div>

      {/* 通知設定 */}
      <div className="bg-white rounded-md border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">通知設定</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications">メール通知</Label>
              <p className="text-sm text-gray-500">
                重要な更新をメールで受け取る
              </p>
            </div>
            <Switch
              id="emailNotifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pushNotifications">プッシュ通知</Label>
              <p className="text-sm text-gray-500">
                ブラウザのプッシュ通知を受け取る
              </p>
            </div>
            <Switch
              id="pushNotifications"
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
