# 複数ショップ展開ガイド

Atelier を複数の会社に展開する際の効率的な管理方法を説明します。

## 📋 目次

1. [基本設計](#基本設計)
2. [管理の負担について](#管理の負担について)
3. [効率的な展開方法](#効率的な展開方法)
4. [推奨ワークフロー](#推奨ワークフロー)

---

## 🏗️ 基本設計

### **重要: 管理者トークンは1つだけ**

```
[Atelier 運営者（あなた）]
  └─ ATELIER_ADMIN_TOKEN: 1つだけ ⭐
     │
     ├─ 会社A のショップを作成
     │   └─ Widget Keys (A専用)
     │
     ├─ 会社B のショップを作成
     │   └─ Widget Keys (B専用)
     │
     ├─ 会社C のショップを作成
     │   └─ Widget Keys (C専用)
     │
     └─ ... （何社でも）

[会社A] → Widget Keys (A) のみ管理
[会社B] → Widget Keys (B) のみ管理
[会社C] → Widget Keys (C) のみ管理
```

### **各社が管理するもの**

各社（顧客）が管理する必要があるのは：
- ✅ `public_key`: クライアント側で使用
- ✅ `secret_key`: サーバー側で使用（オプション）
- ✅ オーナー/メンバーのアカウント

各社は：
- ❌ 他社のデータにアクセス不可（RLS で完全分離）
- ❌ 管理者トークンは不要
- ❌ 他社のショップを見ることも不可

---

## 🎯 管理の負担について

### **Q: 100社、1000社と増えても大丈夫？**

**A: はい！ただし工夫が必要です**

#### **管理トークン: ❌ 負担なし**
- Atelier 運営者のトークンは **1つだけ**
- 会社が増えてもトークンは増えない
- 環境変数は変更不要

#### **ショップ作成: ⚠️ 手動だと大変**
- 1社ずつ `/admin/provision-shop` で作成
- 10社くらいまでは問題なし
- 100社以上は自動化推奨 → **解決策あり！**

#### **Widget Keys 管理: ✅ 各社が自己管理**
- 各社は自分の keys のみ管理
- 運営者は保存不要（画面に一度だけ表示）
- 紛失した場合のみ再発行対応

---

## 🚀 効率的な展開方法

### **方法1: 管理ダッシュボード（実装済み）**

`/admin/shops` にアクセス：
- ✅ 全ショップ一覧を表示
- ✅ ショップ名で検索
- ✅ 作成日・ステータスを確認
- 🔜 今後追加: Widget Keys の再発行

**使い方**:
```bash
# 1. ブラウザで開く
http://localhost:3000/admin/shops

# 2. 管理者トークンを入力
ATELIER_ADMIN_TOKEN を入力 → "ショップを表示"

# 3. 全ショップを確認
```

---

### **方法2: CSV 一括作成スクリプト（推奨）**

10社以上の導入には一括スクリプトを使用。

#### **STEP 1: CSV ファイルを準備**

`shops.csv` を作成：
```csv
shopName,ownerEmail,allowedDomains
株式会社A,owner-a@example.com,"example-a.com,www.example-a.com"
株式会社B,owner-b@example.com,"example-b.com"
株式会社C,owner-c@example.com,"example-c.com"
```

サンプルファイル: `scripts/shops-sample.csv`

#### **STEP 2: スクリプトを実行**

```bash
# ローカル開発サーバーを起動（別のターミナル）
cd apps/console
npm run dev

# スクリプトを実行
cd /path/to/atelier
ATELIER_ADMIN_TOKEN=your-token node scripts/bulk-provision-shops.js shops.csv
```

#### **実行例**

```bash
$ ATELIER_ADMIN_TOKEN=abc123... node scripts/bulk-provision-shops.js shops.csv

🚀 一括ショップ作成を開始します...

📦 [1] 株式会社A (owner-a@example.com) を作成中...
✅ [1] 株式会社A を作成しました
   Shop ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Public Key: pub_live_xxxxxxxxxxxxxxxx
   Secret Key: sec_live_xxxxxxxxxxxxxxxx...

📦 [2] 株式会社B (owner-b@example.com) を作成中...
✅ [2] 株式会社B を作成しました
   ...

========================================
🎉 一括作成が完了しました
========================================
✅ 成功: 3 件
❌ 失敗: 0 件
📄 結果: provision-results-2026-01-28T10-30-00.json
```

#### **STEP 3: 結果ファイルを確認**

```bash
cat provision-results-2026-01-28T10-30-00.json
```

```json
[
  {
    "shopName": "株式会社A",
    "ownerEmail": "owner-a@example.com",
    "shop_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "public_key": "pub_live_xxxxxxxxxxxxxxxx",
    "secret_key": "sec_live_xxxxxxxxxxxxxxxx"
  },
  ...
]
```

#### **STEP 4: 各社に情報を送付**

結果ファイルから各社に以下を送付：
- Shop ID
- Public Key
- Secret Key（⚠️ 安全な方法で）

---

### **方法3: API 直接呼び出し**

独自のスクリプトやシステムから API を呼び出し。

```bash
curl -X POST http://localhost:3000/api/internal/provision-shop \
  -H "Content-Type: application/json" \
  -H "x-atelier-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{
    "shopName": "株式会社サンプル",
    "ownerEmail": "owner@example.com",
    "allowedDomains": ["example.com", "www.example.com"]
  }'
```

**レスポンス**:
```json
{
  "success": true,
  "shop_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "public_key": "pub_live_xxxxxxxxxxxxxxxx",
  "secret_key": "sec_live_xxxxxxxxxxxxxxxx",
  "message": "Shop provisioned successfully..."
}
```

---

## 📊 推奨ワークフロー

### **小規模展開（1〜10社）**

```
1. /admin/provision-shop で手動作成
   ↓
2. 画面に表示される keys をコピー
   ↓
3. 1Password などに保存
   ↓
4. 各社に安全に送付
```

**所要時間**: 約5分/社

---

### **中規模展開（10〜100社）**

```
1. CSV ファイルを準備
   ↓
2. 一括作成スクリプトを実行
   ↓
3. 結果 JSON ファイルを確認
   ↓
4. 各社に一括メール送信（テンプレート化）
```

**所要時間**: 約10分（100社でも）

---

### **大規模展開（100社以上）**

```
1. 既存の顧客管理システムと連携
   ↓
2. API を直接呼び出し
   ↓
3. 結果を DB に保存
   ↓
4. 自動メール送信システムで通知
```

**所要時間**: 完全自動化

---

## 🔐 セキュリティと運用

### **管理者トークンの保護**

- ✅ 1つのトークンで全ショップを管理
- ✅ 環境変数で管理（`.env.local`）
- ✅ 定期的にローテーション（3〜6ヶ月）
- ✅ チーム内で共有する場合はパスワードマネージャー

### **各社の Widget Keys**

- ✅ 画面に一度だけ表示（DB にはハッシュのみ保存）
- ✅ 各社に安全な方法で送付（暗号化メール、1Password 共有など）
- ✅ 紛失した場合は再発行 API を実装（今後）

### **マルチテナンシー**

- ✅ RLS（Row Level Security）で完全分離
- ✅ 各社は自分のデータのみアクセス可能
- ✅ `shop_id` で全データを分離

---

## 📈 スケーラビリティ

### **現在の設計で対応可能な規模**

| ショップ数 | 管理方法 | 管理トークン数 | 推奨手法 |
|---|---|---|---|
| 1〜10社 | 手動 | 1つ | `/admin/provision-shop` |
| 10〜100社 | 半自動 | 1つ | CSV 一括スクリプト |
| 100〜1000社 | 自動化 | 1つ | API 統合 |
| 1000社以上 | 完全自動化 | 1つ | システム連携 |

### **ボトルネックと対策**

#### **1. ショップ作成の速度**
- **問題**: 手動作成は遅い
- **対策**: CSV 一括スクリプト、API 統合

#### **2. Widget Keys の送付**
- **問題**: 1社ずつメール送信は大変
- **対策**: メールテンプレート、自動送信システム

#### **3. サポート対応**
- **問題**: 各社からの問い合わせ増加
- **対策**: FAQ ドキュメント、セルフサービスポータル（今後）

---

## 🛠️ 今後の改善案

### **優先度: 高**

1. **Widget Keys 再発行機能**
   - 各社が紛失した場合の対応
   - `/admin/shops/{shopId}/regenerate-keys`

2. **ショップ詳細ページ**
   - メンバー数、製品数、使用状況を表示
   - `/admin/shops/{shopId}`

### **優先度: 中**

3. **一括メール送信**
   - CSV から自動でオーナーにメール送信
   - Keys の情報を含む

4. **使用状況ダッシュボード**
   - 各社の API 使用量を監視
   - `/admin/analytics`

### **優先度: 低**

5. **セルフサービスポータル**
   - 各社が自分で Keys を再発行
   - オーナーが自分でメンバーを管理（既に実装済み）

---

## ✅ まとめ

### **管理の負担は？**

| 項目 | 複数社展開での負担 | 対策 |
|---|---|---|
| 管理者トークン | ❌ なし（1つだけ） | - |
| ショップ作成 | ⚠️ あり（手動だと大変） | CSV 一括スクリプト |
| Widget Keys 管理 | ✅ なし（各社が自己管理） | - |
| データ分離 | ❌ なし（RLS で自動） | - |
| サポート対応 | ⚠️ あり（問い合わせ増） | ドキュメント整備 |

### **結論**

- ✅ **管理者トークンは1つだけ** → 環境変数の管理は楽
- ✅ **一括作成スクリプトで効率化** → 100社でも10分で完了
- ✅ **各社が自己管理** → Widget Keys は各社が保管
- ✅ **完全なデータ分離** → セキュリティ問題なし

**複数社展開しても、設計上の負担は最小限です！**

---

## 📞 サポート

質問や改善要望がある場合は、開発チームにお問い合わせください。
