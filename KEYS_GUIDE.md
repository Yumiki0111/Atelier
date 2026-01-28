# Atelier キー設計ガイド

Atelier で使用している各種「キー」について、役割・使い方・保存場所・セキュリティをまとめたガイドです。

---

## 1. キーの全体像

Atelier では大きく分けて次の 3 種類のキーを扱います。

- **プラットフォーム運営者向けキー**
  - `ATELIER_ADMIN_TOKEN`
- **暗号化のための内部キー**
  - `SECRET_KEY_SALT`
- **各テナント（ショップ）向けの Widget キー**
  - `widget_keys.public_key`（例: `pub_live_...`）
  - `widget_keys` 生成時に一度だけ返す `secret_key`（例: `sec_live_...`）

それぞれ用途とスコープが異なります。

---

## 2. ATELIER_ADMIN_TOKEN（管理者トークン）

**用途（誰のためのキーか）**

- Atelier プラットフォーム運営者（あなた）が使う「マスターキー」
- **新規ショップ作成など、内部管理 API の認証**に使用

**どこで使うか**

- API: `POST /api/internal/provision-shop`
- ページ: `/admin/provision-shop`（管理者専用 UI）

**値の例**

```text
ATELIER_ADMIN_TOKEN=70f5be8997a591fec126e304e105409149036b26bfdaabf15d8bd06daad4b8a4
```

**保存場所**

- ローカル開発: `apps/console/.env.local`
- 本番環境: デプロイ先の「環境変数設定画面」
- 個人管理: 1Password / LastPass / Bitwarden などのパスワードマネージャー

**セキュリティ上のポイント**

- 絶対に Git にコミットしない
- クライアントサイド（`NEXT_PUBLIC_`）には絶対に出さない
- 3〜6 ヶ月ごと、もしくはメンバーの離脱時などにローテーション推奨

---

## 3. SECRET_KEY_SALT（シークレットキーソルト）

**用途（何に使うキーか）**

- 各ショップの **Widget Secret Key をハッシュ化**するための内部キー
- DB には Secret Key の「ハッシュ値」のみを保存し、平文を保存しないための「塩（salt）」

**どこで使うか**

- `apps/console/src/app/api/internal/provision-shop/route.ts` 内で使用
- `crypto.pbkdf2Sync(secretKey, SECRET_KEY_SALT, ...)` に渡される

**値の例**

```text
SECRET_KEY_SALT=5a9635770cd95b6010c5ba04b708a220
```

**保存場所**

- ローカル開発: `apps/console/.env.local`
- 本番環境: デプロイ先の「環境変数設定画面」

**セキュリティ上のポイント**

- これ自体は外向きには一切使わない「内部用キー」
- `ATELIER_ADMIN_TOKEN` と同様に外部公開は禁止
- 頻繁に変える必要はないが、漏洩した場合は **新しい SALT + 全 Secret Key 再発行** が必要になる

---

## 4. Widget Keys（各ショップ用の公開・秘密キー）

### 4-1. widget_keys テーブルの構造（抜粋）

- `shop_id: uuid`  
- `public_key: text` … 例: `pub_live_030b64caa84e2995672163c125d600bd`
- `secret_key_hash: text` … `sec_live_...` を `SECRET_KEY_SALT` 付きでハッシュ化した値
- `allowed_domains: text[]` … Widget API を許可するドメインのリスト
- `enabled: boolean` … キーが有効かどうか

> **重要:**  
> 平文の `secret_key` は **DB に保存しない**。生成時に一度だけレスポンスとして返す。

### 4-2. Public Key（例: `pub_live_...`）

**用途**

- 顧客（各ショップ）が自分のサイトに埋め込むための **公開キー**
- Widget 公開 API（3D モデル取得）で `shop_id` を特定するために使用

**どこで使うか**

- API: `GET /api/public/widget-config?publicKey=...&externalProductId=...`
- ダッシュボード: `/settings` の「Widget 設定」画面で参照可能

**特徴**

- 公開前提（クライアントサイドに埋め込む）
- ただし **`allowed_domains` によるドメイン制限 + RLS** によって悪用を防止

**使用例**

```http
GET /api/public/widget-config?publicKey=pub_live_030b64caa84e2995672163c125d600bd&externalProductId=SKU-123
```

### 4-3. Secret Key（例: `sec_live_...`）

**用途**

- 将来的に「サーバー間通信での認証」などに使うことを想定した **秘密キー**
- 現状は発行と保存（ハッシュ化）のみ実装済みで、認証 API での利用は今後拡張予定

**どこで生成されるか**

- `POST /api/internal/provision-shop` 実行時に自動生成
- レスポンスボディに **一度だけ** 含まれる

**レスポンス例**

```json
{
  "success": true,
  "shop_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "public_key": "pub_live_030b64caa84e2995672163c125d600bd",
  "secret_key": "sec_live_4fee6b315ef0fa90d05c254031194ea973ad21406cd51d729d2268e4a4d0f677",
  "message": "Shop provisioned successfully. Save the secret_key now, it will not be shown again."
}
```

**セキュリティ上のポイント**

- **絶対にクライアントサイドで使わない**
- Git / 公開リポジトリ / フロントエンドコードに埋め込まない
- 顧客ごとに 1Password などで安全に共有・保管する
- Atelier 側の DB には `secret_key_hash` のみ保存される

---

## 5. 役割のまとめ

| 種類 | 例 | 誰が使うか | 用途 | 保存場所 |
|------|----|-----------|------|----------|
| **ATELIER_ADMIN_TOKEN** | `70f5...` | Atelier 運営者 | 内部管理 API 認証（ショップ作成など） | `.env.local` / 環境変数 |
| **SECRET_KEY_SALT** | `5a96...` | システム内部 | Secret Key ハッシュ化 | `.env.local` / 環境変数 |
| **Public Key** | `pub_live_...` | 各ショップ（顧客） | Widget 公開 API 呼び出し（クライアント側） | `widget_keys.public_key` |
| **Secret Key** | `sec_live_...` | 各ショップ（顧客） | サーバー間 API 認証（将来拡張） | 顧客側の安全なストレージ（Atelier DB にはハッシュのみ） |

---

## 6. 運用・ローテーションの方針

### 6-1. ATELIER_ADMIN_TOKEN

- ローテーションタイミング:
  - 運営メンバーの入れ替わり時
  - 半年〜1年ごとの定期ローテーション
- ローテーション手順:
  1. 新しいトークンを生成
  2. ローカル / 本番双方の環境変数を更新
  3. サーバーを再起動
  4. `/admin/provision-shop` の動作確認

### 6-2. SECRET_KEY_SALT

- 通常はめったに変更しない
- 漏洩が疑われる場合のみローテーションを検討
  - 新しい SALT を設定
  - 既存 Secret Key / widget_keys の再発行戦略が別途必要

### 6-3. Widget Keys（public / secret）

- 公開 API キー（Public Key）は、問題が起きたショップ単位で無効化・再発行すればよい
- Secret Key 紛失時は、そのショップ用に新しいキーを再発行する設計を今後追加予定

---

## 7. 実装済みの関連エンドポイント

- **内部管理系**
  - `POST /api/internal/provision-shop`  
    - Admin Token で保護されたショップ作成 + Widget Keys 発行 API

- **公開 API**
  - `GET /api/public/widget-config?publicKey=...&externalProductId=...`  
    - Public Key + external_product_id から 3D モデル URL を返す
    - `allowed_domains` によるホスト名チェックを実施

- **ダッシュボード UI**
  - `/admin/provision-shop` … ショップ作成（運営者用）
  - `/settings` … Widget 設定（public_key / allowed_domains の閲覧）

---

## 8. 今後の拡張アイデア

- Secret Key を使った「サーバー間認証 API」の追加  
  例: 顧客サーバーから Atelier API へ商品メタ情報を同期する際の認可
- Widget Keys の再発行・無効化 UI（運営者 / オーナー向け）の追加
- 各ショップごとのキー使用状況モニタリング（管理者ダッシュボード）

---

このドキュメントは、`ATELIER_ADMIN_TOKEN` や Widget Keys を扱う際のリファレンスとして利用してください。運用ルールやローテーションポリシーを決める際のベースラインにもなります。

