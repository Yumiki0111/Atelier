# 開発フィッティング — 正典（Canon）一体版

**単一の正**として、モデル変形・赤リグ・服ワープ・**Garment Grading v4**（`presetId: "gradingV4"` のカスタム SVG）および組み込みデモ（シャツ／ジャケット）・腕 path 前提をここにまとめる。
変更が必要なときは **先に本書を更新**し、PR で「Canon との差分」を明示する。

---

## この文書で「保証できること／できないこと」

| できること | できないこと |
|------------|----------------|
| 意図したアーキテクチャ・定数・データ流れ・禁止事項を **開発者（および AI）が毎回参照**できる | **この文書を見せただけ**で、以後の編集が自動的に安全になる（人間／AIの誤読・未読・リファクタの連鎖は防げない） |
| レビュー時に「Canon 違反では？」と **指摘の共通言語**になる | **依存パッケージ更新・ブラウザ差・未追跡アセット**までカバーする（下記「Canon 外」参照） |
| 手動回帰チェックの **最低限リスト**を固定できる | **自動テストでフィッティングを固定**しているわけではない（現状、本領域の回帰テストは手動前提） |

**実務上:** 本書をプロンプトに貼り、「変更箇所が Canon のどの節に触れるか」を明示させると効果が高い。それでも **最終的な破綻防止はレビュー＋回帰チェック**が必要。

---

## 1. スコープと単一入口

**レイアウト:** 開発用の共有コードは **`(main)/development/fitting/`** 直下の `lib/`・`canvas/`・`customGarment/`・`gradingV4/` 等。体格→スナップショット計算本体はコンソールの **`apps/console/src/lib/fitting-compute/`**（インポートは多く **`@/lib/fitting-compute/...`**）。

| 項目 | 正 |
|------|----|
| 体型→描画の集約 | **`computeFittingCanvasSnapshot`**（`apps/console/src/lib/fitting-compute/fittingCanvasCompute.ts`）。呼び出し例: `fitting/canvas/useFittingCanvasData.ts`・プレビュー |
| ボディテンプレ | viewBox **1505×2852**、`BODY_CX = 752.5`（`lib/constants.ts`） |
| モデル SVG → テンプレ座標 | `lib/modelRigData.ts` の **`scaleModelViewToBodyTemplate`**: 元 viewBox **3391×6431** をテンプレ幅・高さ比でスケール（`BPATHS_RIG_LINES` と同一写像） |
| 赤リグ線ソース | **`MODEL_RIG_LINE_PATH_DS`**（9 本）→ 上記写像後 **`BPATHS_RIG_LINES`** |

**禁止:** 体・服・赤リグの幾何の「真実」を、このパイプライン以外で **二重計算**しない（HUD・採寸注釈の **表示専用** の補助計算は可）。

---

## 2. 基準体型定数（`lib/constants.ts`）

| 定数 | 値 | 意味 |
|------|-----|------|
| `REF_HEIGHT_CM` | **170** | 腕・首・着丈キャリブレーション・基準体比較の基準身長 |
| `REF_WEIGHT_KG` | **60** | 基準体重。**服の横スケールを体重スライダーから切り離す**用途で多用 |

**禁止:** `REF_*` をサイズ表・SVG 設計と無関係に変えること。`buildTopPlacement(..., REF_HEIGHT_CM)` など **別ファイルの魔数**とズレさせないこと。

---

## 3. リグ 9 本の index 契約

`lib/modelRigData.ts` と `fittingCanvasCompute.ts`（`RIG_LINE_SPINE` 等）で **同一の並び**。

| index | 役割 |
|-------|------|
| **0** | 中心軸（脊髄）。`spineDownUnit` の基準 |
| **1** | 左腕線（上腕リグ）。肩近辺が pivot |
| **2** | 右腕線 |
| **3–4** | 脚系 |
| **5–6** | 左右鎖骨 |
| **7–8** | 骨盤↔胸 補助 |

`buildRigRedLineArmDiagram`: 肩 ≈ 鎖骨 path 先端、袖先 ≈ 腕 path 終端。

**禁止:** `MODEL_RIG_LINE_PATH_DS` の **入替・本数変更**を、compute 側 index 更新なしで行わない。

---

## 4. 二系統のワープ後リグ（最重要）

### 4.1 `rigLineWarpedPaths`

- テンプレリグを **`warpRigLine`** = 現在 **`height` + `weight`** の `getBodyParams` でワープ。
- **計算用**（内部幾何）。表示用赤線とは限らない。

### 4.2 `rigLineWarpedRigViewPaths`

- **170 + 現在体重** でワープした `rigRefWarpedPaths` を、現在脊髄へ **`computeRigSpineAlignFn`** で合わせたあと、path **1・2** だけ **`applyRigArmAngleTiltToWarpedRigPaths`**（係数 `RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM`）。
- **赤リグ表示**、`buildRigRedLineArmDiagram`、**`rigSkinSegments` のワープ後** → 体 **`bodyFollowFn`（リグスキン）**。

**禁止:** 体だけ `rigLineWarpedPaths` 基準に切替える。**腕傾きを体側だけ**かけ、**`rigTemplateToRigViewForGarmentPath`** に同傾きをかけない。

---

## 5. 脊髄合わせ

`computeRigSpineAlignFn`: path0 からスケール・平行移動。頭付近は `RIG_ALIGN_HEAD_SPINE_FRACTION` / `RIG_ALIGN_HEAD_SCALE_BLEND_MIN` でスケールを弱める。

**禁止:** 無断で一律スケールのみに簡略化しない。

---

## 6. `RIG_ARM_TOWARD_VERTICAL_DEG_PER_CM`

- **場所:** `fittingCanvasCompute.ts`
- 身長が `REF_HEIGHT_CM` から離れるほど **path 1・2 だけ**肩 pivot で追加回転。
- **0 にすると** 非基準身長で **袖が腕に追従しにくくなる**ことがある（リグスキンおよび腕ラインとの整合）。
- **非 0** のとき、脊髄・鎖骨に対する腕線の **見かけの内角**が身長と少し連動する（トレードオフ）。

**禁止:** 「角度表示だけ」のためにここを 0 固定して体・服を無検証で変える。表示補正は図示レイヤで。

---

## 7. 体重の「体」と「服」の分離

| 対象 | 正 |
|------|-----|
| 体のシルエット | `getBodyParams(..., weight)` |
| 服の横・多くのプレース・袖ワープの横 | 多く **`getBodyParams(..., REF_WEIGHT_KG)`** |
| 服用リグワープ | `height` + **`REF_WEIGHT_KG`**（服リグが体重で横に伸びない） |

詳細コメント: `fittingCanvasCompute.ts`（ジャケット分岐前のブロック）。

**禁止:** 全体を `weight` に統一する単純置換。

---

## 8. `buildTopPlacement` と着丈校正

- `lengthCalibrationHeightCm` **未指定** → 着丈の `bodyPxPerCm` は **現在身長 `h`**。
- **カスタム既定** → **`REF_HEIGHT_CM` を渡す**（身長スライダーに着丈スケールを直結させない）。

**禁止:** カスタムだけこの引数を外して着丈を身長に直結させる（HUD・商品登録と不整合）。

---

## 9. カスタム服 `buildCustomTransformedPaths.ts`

1. **`placementLockToModelRig`**: `place` = **`scaleModelViewToBodyTemplate` のみ**。`fittingCanvasComputeGarmentCustom.ts` の `transformHeightCmForCustomPaths` / ロックフラグと連動。
2. **通常**: `buildTopPlacement(h, w, …, null, REF_HEIGHT_CM).place`
3. **photoDerived 袖**: `getInterpolatedArmOutline(REF_HEIGHT_CM)` → `warpArmOutline(..., h)`
4. **Grading v4:** `fitting/gradingV4/` の分割 path・マークアップレイヤ変形（`presetId === "gradingV4"` と `fittingCanvasComputeGarmentCustom.ts` が束ねる）。

**禁止:** `getInterpolatedArmOutline` を **`h` 起点**に勝手に変更して compute 本体の肩・袖基準とズラす。

### 9.1 リグロック時のテンプレート水平位置（服の左右中央）

アップロード SVG で服とモデルリグ本数が一致する場合、`fittingCanvasComputeGarmentCustom.ts` が **ワープ前**にテンプレ X をシフトして体軸に寄せる（`templateShiftXLocked`）。**頂点平均ではなく bbox 中心 X** を使う理由・失敗しやすいパターン・処理順は **`CUSTOM_GARMENT_CENTERING.md`** に集約する。

---

## 10. 袖・胴（現行実装の注意）

- **カスタム／Grading v4:** **`buildCustomTransformedPaths`**（プレース、リグロック写像、`photoDerived` 時はモデル腕への袖ヒント）、および **`fitting/gradingV4/`** のマークアップ変形。旧 **`ScalableGarmentSpec` / `sleeveOnlyTransform` / `scalableGarmentArmLogic` は削除済み**。
- **シャツ／ジャケット:** **`shirtUtils` / `jacketUtils`** と `fittingCanvasComputeGarmentShirt` / `Jacket`。袖・胴の幾何はここでは **プレース＋サイズ表ベースの専用ロジック**。
- 多層 path・リグロック・胴ワープの契約を変えるときは **§4–9** と **`CUSTOM_GARMENT_CENTERING.md`** を先に読む。

**禁止:** 座標系混在（SVG 原座標のままボディ `place` 空間と比較する等）。

---

## 11. オーバーレイ・DEBUG（変形の正ではない）

- `MeasureOverlayData` に載る線・ラベルは **注釈**。スナップショット計算本体の経路とは切り離して読む。
- **`sessionStorage`:** `DEBUG_RIG_ARM`, `DEBUG_FITTING_MEASURE`, `DEBUG_NO_SEAM_FLATTEN` 等は **別コードパス**になり得る。正は **フラグ OFF**。

---

## 12. Canon の外だが挙動を壊しやすいもの（見落とし対策）

| 項目 | 内容 |
|------|------|
| **`development/page.tsx`** | `localStorage` キー `fitlook-dev-fitting` で服種・サイズを復元。**身長・体重は保存されない**。リロードで入力が戻ると「コードは同じなのに見え方が違う」になり得る。 |
| **サイズアニメ** | `animProgress` / `fromSize` `toSize` / カスタム from-to で **`interpolatePath`** 等。スナップショット計算の分岐が増える。 |
| **`rigBodyEnabled` / `rigGarmentEnabled`** | UI トグルで **描画・デバッグ用パス**が変わる（計算の芯は同じでも確認対象がずれる）。 |
| **`next` / Turbopack / `node_modules` 更新** | 同一コミットでも環境差で見え方が変わることはあり得る。不具合切り分け時は `npm ci` 等を意識。 |
| **アップロード SVG・商品 DB の path** | Git に含まれないデータ。Canon は **コード上のパイプライン**の正。悪い SVG はどの理論でも破綻し得る。 |
| **自動テスト** | 本領域を固定する **スナップショット／E2E は本書執筆時点では前提にしていない**。 |

---

## 13. 変更時の手動回帰チェック（最低限）

1. 身長: 体・赤リグ・カスタム服の肩・袖が **同時に**破綻なく動く。
2. 体重: **体**が太る／痩せる。**服の横幅**が意図せず大きく変わっていない。
3. リグ ON: `rigLineWarpedRigViewPaths` と **`rigTemplateToRigView*`** で **腕傾きが共有**されている。
4. **170 / 60** 付近で組み込みデモ（シャツ・ジャケット）および **Grading v4 カスタム**の基準見た目が大きく崩れていない。

---

## 14. 変更してよいこと（例）

- Canon と同値のリファクタ、HUD 文言、DEBUG ログ。
- **Canon を更新したうえでの**係数調整（腕鉛直寄せ・脊髄頭ブレンドなど）。

---

## 15. 主要ファイル索引

| 領域 | ファイル |
|------|----------|
| スナップショット | `apps/console/src/lib/fitting-compute/fittingCanvasCompute.ts` |
| カスタム服 compute | `apps/console/src/lib/fitting-compute/fittingCanvasComputeGarmentCustom.ts` |
| React（データ供給例） | `fitting/canvas/useFittingCanvasData.ts` |
| Grading v4 | `fitting/gradingV4/` |
| 定数・ゾーン | `fitting/lib/constants.ts`, `fitting/body/bodyZones.ts`, `fitting/lib/bodyUtils.ts` |
| リグデータ・写像 | `fitting/lib/modelRigData.ts` |
| リグスキン | `fitting/lib/rigSkin2D.ts` |
| プレース | `fitting/lib/garmentBase.ts` |
| カスタム変形 | `fitting/customGarment/buildCustomTransformedPaths.ts` |
| リグロック水平合わせ | `CUSTOM_GARMENT_CENTERING.md` |
| 組み込みシャツ／ジャケット | `fitting/lib/shirtUtils.ts`, `fitting/lib/jacketUtils.ts`, `lib/fitting-compute/fittingCanvasComputeGarmentShirt.ts`, `fittingCanvasComputeGarmentJacket.ts` |
| 開発ページ状態 | `(main)/development/page.tsx` |

---

*実装と矛盾する場合は、意図を決めて **実装バグ**か **本書の未更新**かを切り分ける。*
