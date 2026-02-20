# 測定値からモデル生成・服を着せる機能の実装ガイド

## 概要

ユーザーが入力した測定値を元に、MODEL_DEV_KEYを使用して3Dモデルを生成し、そのモデルに服を着せる機能を実装するための手順書です。

## 前提条件

- Postmanで取得した`MODEL_DEV_KEY`があること
- モデル生成APIのエンドポイントが利用可能であること
- 測定値の入力フォームが必要であること

---

## 1. 環境変数の設定

### 1.1 PoC用：手動トークン方式（最短で進める場合）

**場所**: `apps/console/.env.local`（開発環境）またはデプロイ先の環境変数設定

```bash
# PoC用：UIから取得したトークンをそのまま使用
MESHCAPADE_TOKEN=your_manual_token_from_ui_copy_button
MESHCAPADE_API_URL=https://api.meshcapade.com/v1/models/generate  # 実際のエンドポイント
```

**使い方**:
1. MeshcapadeのUIで「Copy token」ボタンを押してトークンを取得
2. そのトークンを`MESHCAPADE_TOKEN`に設定
3. 有効期限が切れたら再度UIから取得して更新

**セキュリティ注意事項**:
- Gitにコミットしない（`.env.local`は`.gitignore`に含まれていることを確認）
- クライアントサイド（`NEXT_PUBLIC_`プレフィックス）には絶対に出さない
- サーバーサイドでのみ使用する

### 1.2 本番用：OAuth2自動取得方式（推奨・将来対応）

将来的に`CLIENT_ID`と`CLIENT_SECRET`が取得できたら、以下のように設定：

```bash
# OAuth2認証情報（自動トークン取得用）
MESHCAPADE_CLIENT_ID=your_client_id
MESHCAPADE_CLIENT_SECRET=your_client_secret
MESHCAPADE_TOKEN_URL=https://api.meshcapade.com/oauth/token  # デフォルト値あり
MESHCAPADE_API_URL=https://api.meshcapade.com/v1/models/generate
```

**優先順位**:
- `MESHCAPADE_CLIENT_ID`と`MESHCAPADE_CLIENT_SECRET`が設定されていれば、自動取得モード
- なければ`MESHCAPADE_TOKEN`を使用（PoCモード）

**セキュリティ注意事項**:
- Gitにコミットしない
- クライアントサイドには絶対に出さない
- サーバーサイドでのみ使用する
- OAuth2方式ではトークンが自動更新されるため、手動更新が不要

---

## 2. 測定値入力フォームの作成

### 2.1 測定値の型定義

**ファイル**: `packages/shared/src/types.ts` または新規ファイル `packages/shared/src/model-measurements.ts`

```typescript
export interface BodyMeasurements {
  // 必須測定値（例）
  height: number;        // 身長 (cm)
  chest: number;         // 胸囲 (cm)
  waist: number;         // ウエスト (cm)
  hip: number;           // ヒップ (cm)
  shoulder: number;      // 肩幅 (cm)
  armLength: number;    // 腕の長さ (cm)
  legLength: number;     // 脚の長さ (cm)
  
  // オプション測定値
  neck?: number;          // 首周り (cm)
  sleeve?: number;       // 袖丈 (cm)
  inseam?: number;       // 股下 (cm)
}
```

### 2.2 測定値入力フォームコンポーネント

**ファイル**: `apps/console/src/components/model/MeasurementForm.tsx`

```typescript
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BodyMeasurements } from "@atelier/shared";

interface MeasurementFormProps {
  onSubmit: (measurements: BodyMeasurements) => Promise<void>;
  isLoading?: boolean;
}

export function MeasurementForm({ onSubmit, isLoading }: MeasurementFormProps) {
  const [measurements, setMeasurements] = useState<BodyMeasurements>({
    height: 170,
    chest: 90,
    waist: 80,
    hip: 90,
    shoulder: 40,
    armLength: 60,
    legLength: 80,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(measurements);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>身体測定値入力</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>身長 (cm)</Label>
              <Input
                type="number"
                value={measurements.height}
                onChange={(e) => setMeasurements({ ...measurements, height: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>胸囲 (cm)</Label>
              <Input
                type="number"
                value={measurements.chest}
                onChange={(e) => setMeasurements({ ...measurements, chest: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>ウエスト (cm)</Label>
              <Input
                type="number"
                value={measurements.waist}
                onChange={(e) => setMeasurements({ ...measurements, waist: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>ヒップ (cm)</Label>
              <Input
                type="number"
                value={measurements.hip}
                onChange={(e) => setMeasurements({ ...measurements, hip: Number(e.target.value) })}
                required
              />
            </div>
            {/* 他の測定値も同様に追加 */}
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "モデル生成中..." : "モデルを生成"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

## 3. モデル生成APIエンドポイントの作成

### 3.1 APIルートの作成

**ファイル**: `apps/console/src/app/api/model/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { measurements } = body;

    if (!measurements) {
      return NextResponse.json(
        { error: "Measurements are required" },
        { status: 400 }
      );
    }

    // Meshcapadeトークンを取得（OAuth2自動取得）
    const { getMeshcapadeHeaders } = await import("@/lib/meshcapade/token-manager");
    const headers = await getMeshcapadeHeaders();

    // モデル生成APIを呼び出す
    // TODO: 実際のAPIエンドポイントURLに置き換える
    const modelApiUrl = process.env.MESHCAPADE_API_URL || "https://api.meshcapade.com/v1/models/generate";
    
    const response = await fetch(modelApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        measurements,
        // その他の必要なパラメータ
        format: "glb", // または "fbx"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Model Generation] API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to generate model", details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // モデルURLを返す（APIのレスポンス形式に応じて調整）
    return NextResponse.json({
      modelUrl: result.modelUrl || result.url || result.downloadUrl,
      modelId: result.modelId || result.id,
    });

  } catch (error) {
    console.error("[Model Generation] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 3.2 環境変数の追加

**ファイル**: `apps/console/.env.local`

```bash
MODEL_DEV_KEY=your_api_key_from_postman
MODEL_API_URL=https://api.example.com/v1/models/generate  # 実際のAPIエンドポイント
```

---

## 4. フロントエンドでのモデル生成呼び出し

### 4.1 モデル生成フックの作成

**ファイル**: `apps/console/src/hooks/useModelGeneration.ts`

```typescript
import { useState } from "react";
import { authenticatedFetch } from "@/lib/auth/api-client";
import type { BodyMeasurements } from "@atelier/shared";

export function useModelGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);

  const generateModel = async (measurements: BodyMeasurements) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedModelUrl(null);

    try {
      const response = await authenticatedFetch("/api/model/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ measurements }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate model");
      }

      const data = await response.json();
      setGeneratedModelUrl(data.modelUrl);
      return data.modelUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateModel,
    isGenerating,
    error,
    generatedModelUrl,
  };
}
```

---

## 5. 3Dビューアへの統合

### 5.1 PreviewPanelの拡張

**ファイル**: `apps/console/src/features/preview/PreviewPanel.tsx`

既存の`PreviewPanel`に、生成されたモデルURLを設定する機能を追加：

```typescript
// 既存のコードに追加
const [customModelUrl, setCustomModelUrl] = useState<string | undefined>(undefined);

// モデル生成後に呼び出す
useEffect(() => {
  if (customModelUrl && previewInstanceRef.current) {
    previewInstanceRef.current.updateModelUrl(customModelUrl);
  }
}, [customModelUrl]);
```

### 5.2 モデル生成ページの作成

**ファイル**: `apps/console/src/app/(main)/model-generate/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { MeasurementForm } from "@/components/model/MeasurementForm";
import { PreviewPanel } from "@/features/preview/PreviewPanel";
import { useModelGeneration } from "@/hooks/useModelGeneration";
import { toast } from "sonner";
import type { BodyMeasurements } from "@atelier/shared";

export default function ModelGeneratePage() {
  const { generateModel, isGenerating, error, generatedModelUrl } = useModelGeneration();
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleGenerate = async (measurements: BodyMeasurements) => {
    try {
      const modelUrl = await generateModel(measurements);
      toast.success("モデルが生成されました");
    } catch (err) {
      toast.error(error || "モデル生成に失敗しました");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h1 className="text-2xl font-semibold mb-6">カスタムモデル生成</h1>
        <MeasurementForm onSubmit={handleGenerate} isLoading={isGenerating} />
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
      <div>
        {generatedModelUrl && (
          <PreviewPanel
            selectedProduct={selectedProduct}
            customModelUrl={generatedModelUrl}
          />
        )}
      </div>
    </div>
  );
}
```

---

## 6. 既存の3Dビューアへの統合

### 6.1 ViewerInstanceの拡張確認

**ファイル**: `packages/preview/src/viewer.ts`

既存の`updateModelUrl`メソッドが利用可能であることを確認：

```typescript
// 既に実装されているはず
updateModelUrl(modelUrl: string | undefined): void {
  if (modelUrl) {
    baseModelLoadPromise = loadBaseModel(modelUrl);
    baseModelLoadPromise
      .then(() => {
        onLoad?.();
        render();
      })
      .catch((error) => {
        console.error("[Atelier Preview] Error loading model:", error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      });
  }
}
```

### 6.2 生成されたモデルに服を着せる

既存の`updateAssets`メソッドを使用して、生成されたモデルに服を着せることができます：

```typescript
// 生成されたモデルに服を着せる例
previewInstance.updateModelUrl(generatedModelUrl);
previewInstance.updateAssets([
  { url: "/assets/shirt.glb", category: "トップス" },
  { url: "/assets/pants.glb", category: "ボトムス" },
]);
```

---

## 7. 実装チェックリスト

### 7.1 環境変数設定
- [ ] `MESHCAPADE_CLIENT_ID`を`.env.local`に設定
- [ ] `MESHCAPADE_CLIENT_SECRET`を`.env.local`に設定
- [ ] `MESHCAPADE_TOKEN_URL`を設定（デフォルト値あり、必要に応じて）
- [ ] `MESHCAPADE_API_URL`を設定（モデル生成APIのエンドポイント）
- [ ] 環境変数がGitにコミットされていないことを確認

### 7.2 バックエンド実装
- [ ] `/api/model/generate`エンドポイントを作成
- [ ] 認証チェックを実装
- [ ] `getMeshcapadeHeaders()`を使用してトークンを自動取得
- [ ] Meshcapade APIを呼び出す
- [ ] エラーハンドリングを実装
- [ ] トークンの自動更新が動作することを確認

### 7.3 フロントエンド実装
- [ ] `BodyMeasurements`型を定義
- [ ] `MeasurementForm`コンポーネントを作成
- [ ] `useModelGeneration`フックを作成
- [ ] モデル生成ページを作成
- [ ] 生成されたモデルを3Dビューアに表示

### 7.4 統合テスト
- [ ] 測定値入力からモデル生成までのフローをテスト
- [ ] 生成されたモデルに服を着せる機能をテスト
- [ ] エラーケースのテスト

---

## 8. 注意事項

### 8.1 APIキーのセキュリティ
- `MODEL_DEV_KEY`はサーバーサイドでのみ使用する
- クライアントサイドに露出しない
- 環境変数として適切に管理する

### 8.2 モデル生成のパフォーマンス
- モデル生成は時間がかかる可能性があるため、ローディング状態を適切に表示する
- 必要に応じて非同期処理やWebSocketを使用して進捗を表示する

### 8.3 エラーハンドリング
- API呼び出しの失敗を適切に処理する
- ユーザーに分かりやすいエラーメッセージを表示する
- ログを適切に記録する

### 8.4 モデルURLの保存
- 生成されたモデルURLをデータベースに保存するか検討する
- ユーザーごとにモデルを保存する場合は、適切なテーブル設計が必要

---

## 9. 次のステップ

1. **モデル生成APIの詳細確認**
   - 実際のAPIエンドポイントURLを確認
   - リクエスト/レスポンス形式を確認
   - 認証方式を確認（Bearer Token / API Key など）

2. **測定値のバリデーション**
   - 入力値の範囲チェック
   - 必須項目の確認
   - 単位の統一（cm / inch など）

3. **モデルのキャッシュ**
   - 同じ測定値の場合は再生成を避ける
   - 生成されたモデルを一時的に保存

4. **UI/UXの改善**
   - モデル生成の進捗表示
   - プレビュー機能の追加
   - 測定値の保存機能

---

## 10. 参考資料

- [Three.js Documentation](https://threejs.org/docs/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- 既存の実装:
  - `packages/preview/src/viewer.ts` - 3Dビューアの実装
  - `apps/console/src/app/api/` - APIエンドポイントの例
  - `apps/console/src/features/preview/PreviewPanel.tsx` - プレビューパネルの実装
