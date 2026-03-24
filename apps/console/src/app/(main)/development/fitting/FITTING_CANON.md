# 開発フィッティング — 正典（Canon）一体版

**単一の正**として、モデル変形・赤リグ・服ワープ・汎用トップ・腕 path 前提をここにまとめる。  
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

**ディレクトリ:** 共有モジュールは `lib/`、スナップショット計算は `compute/`、キャンバス UI・`useFittingCanvasData` は `canvas/`、左パネルは `controls/`。`body/`・`svgPath/`・`customGarment/`・`generic/` は従来どおり fitting 直下。

| 項目 | 正 |
|------|----|
| 体型→描画の集約 | `compute/fittingCanvasCompute.ts` の **`computeFittingCanvasSnapshot`**（呼び出し: `canvas/useFittingCanvasData.ts`） |
| ボディテンプレ | viewBox **1505×2852**、`BODY_CX = 752.5`（`lib/constants.ts`） |
| モデル SVG → テンプレ座標 | `lib/modelRigData.ts` の **`scaleModelViewToBodyTemplate`**: 元 viewBox **3391×6431** をテンプレ幅・高さ比でスケール（`BPATHS_RIG_LINES` と同一写像） |
| 赤リグ線ソース | **`MODEL_RIG_LINE_PATH_DS`**（9 本）→ 上記写像後 **`BPATHS_RIG_LINES`** |

**禁止:** 体・服・赤リグの幾何の「真実」を、このパイプライン以外で **二重計算**しない（採寸オーバーレイ等の **表示専用**の補助計算は可）。

---

## 2. 基準体型定数（`lib/constants.ts`）

| 定数 | 値 | 意味 |
|------|-----|------|
| `REF_HEIGHT_CM` | **170** | 腕・首・着丈キャリブレーション・基準体比較の基準身長 |
| `REF_WEIGHT_KG` | **60** | 基準体重。**服の横スケールを体重スライダーから切り離す**用途で多用 |

**禁止:** `REF_*` をサイズ表・SVG 設計と無関係に変えること。`buildTopPlacement(..., REF_HEIGHT_CM)` など **別ファイルの魔数**とズレさせないこと。

---

## 3. リグ 9 本の index 契約

`lib/modelRigData.ts` と `compute/fittingCanvasCompute.ts`（`RIG_LINE_SPINE` 等）で **同一の並び**。

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

- **場所:** `compute/fittingCanvasCompute.ts`
- 身長が `REF_HEIGHT_CM` から離れるほど **path 1・2 だけ**肩 pivot で追加回転。
- **0 にすると** 非基準身長で **袖が腕に追従しにくくなる**ことがある（リグスキンと `computeSleeveRotations` の関係）。
- **非 0** のとき、脊髄・鎖骨に対する腕線の **見かけの内角**が身長と少し連動する（トレードオフ）。

**禁止:** 「角度表示だけ」のためにここを 0 固定して体・服を無検証で変える。表示補正は図示レイヤで。

---

## 7. 体重の「体」と「服」の分離

| 対象 | 正 |
|------|-----|
| 体のシルエット | `getBodyParams(..., weight)` |
| 服の横・多くのプレース・袖ワープの横 | 多く **`getBodyParams(..., REF_WEIGHT_KG)`** |
| 服用リグワープ | `height` + **`REF_WEIGHT_KG`**（服リグが体重で横に伸びない） |

詳細コメント: `compute/fittingCanvasCompute.ts`（ジャケット分岐前のブロック）。

**禁止:** 全体を `weight` に統一する単純置換。

---

## 8. `buildTopPlacement` と着丈校正

- `lengthCalibrationHeightCm` **未指定** → 着丈の `bodyPxPerCm` は **現在身長 `h`**。
- **カスタム既定** → **`REF_HEIGHT_CM` を渡す**（身長スライダーに着丈スケールを直結させない）。

**禁止:** カスタムだけこの引数を外して着丈を身長に直結させる（オーバーレイ・商品登録と不整合）。

---

## 9. カスタム服 `buildCustomTransformedPaths.ts`

1. **`placementLockToModelRig`**: `place` = **`scaleModelViewToBodyTemplate` のみ**。`compute/fittingCanvasCompute` の `transformHeightCmForCustomPaths` / ロックフラグと連動。
2. **通常**: `buildTopPlacement(h, w, …, null, REF_HEIGHT_CM).place`
3. **photoDerived 袖**: `getInterpolatedArmOutline(REF_HEIGHT_CM)` → `warpArmOutline(..., h)`
4. **汎用トップ**: 下記 §10

**禁止:** `getInterpolatedArmOutline` を **`h` 起点**に勝手に変更して compute 本体の肩・袖基準とズラす。

---

## 10. 汎用トップ `genericSymmetricTop`（旧 GARMENT_LOGIC）

### スコープ

- **対象:** `presetId === "genericSymmetricTop"`。SVG アップロード＋（任意）4 連結区間の手入力と Apply。
- **廃止:** `blousonFixed`、同梱 `BLOUSON_PATH_DS`、ブローゾン専用 `getScalableSpec` / 強制腕ロジック。
- **初期:** `getGenericSymmetricTopPreset`（`pathDs: []`）、サイズ表は `genericDevDefaults.ts`。

### 共有プリミティブ

- **`ArmLogicConfig`** と **`scaleBodyToSpec` / `scaleSleevePathToSpec` / `computeSleeveRotations`** は **`buildGenericArmConfig` → `sleeveOnlyTransform`** から利用。

### 変換分岐

1. **Apply 済み + 4 シーム:** `runGenericSymmetricTopFitWithTopology` / `runGenericSymmetricTopFitManual`（sleeveOnly）。
2. **measure-only:** `applyGenericMeasureOnlyGrading` → `place`。
3. **`getScalableSpec` / `getArmLogicConfig`:** レガシー用 **常に `null`**。旧ブローゾン胴スケールは使わない。
4. **それ以外:** `tPath` + `place`。

### キャンバス・オーバーレイ

- **`resolveGenericScalableSpec`:** 4 区間が揃うときのみ spec。袖丈赤線は `sleeveMeasureIndices` 等。
- **ミラー袖丈:** `lockedTopology` があれば利用（ブローゾン固定トポへのフォールバックなし）。

### 汎用 `generic/` の追加注意（path 変形）

- 外腕シームは **`flattenSvgPathToPolyline`**（`pathUtils`）で曲線を L 化してから変換。`DEBUG_NO_SEAM_FLATTEN` で切替可能（開発用）。
- 汎用 spec では **`snapCenterXToBody: false`**（前胴の縦アーティファクト抑制）。
- アップロード時:** 服 path は `garmentPathDs`、リグは **`debugRigPathDs`**（`splitGarmentPathsFromSvg`）。
- Apply 前後で形が変わるのは **`applySleeveOnlyGarmentTransform`** の有無が主因になり得る。

### 将来メモ

解析層で役割推定 → フィット層は sleeveOnly のみ、という方向。**現状は手入力トポロジー前提**。

---

## 11. 腕ロジック path 前提（旧 ARM_LOGIC_PREREQUISITES）

腕ロジックが破綻しないための **服 path 契約**（コート例つき）。

### Path 構成

| 役割 | 説明 | コート例 |
|------|------|----------|
| 袖左 | 肩→袖先の外側。place 後、肩 pivot で剛体回転 | path 1 |
| 袖右 | 同上 | path 4 |
| 脇左 | 袖付け付近。attach からの距離でブレンド | path 2 |
| 脇右 | 同上 | path 5 |

### attach

- **seam path 上に頂点があること**。コート例: path 2 終点 = ATTACH_L。
- ブレンドは attach から **BLEND_MAX_DIST** 以内の seam 頂点のみ。

### `ScalableSpec.sleeve`

- `anchorIdx`: 肩（pivot）
- `cuffIdx`: 袖口（腕角度に使用）
- `lengthStartIdx`～`lengthEndIdx`: 袖丈計測・スケール区間

### `bodyPathIndices`

- 着丈 Y スケール対象。**袖 path を含めない**。コート例: [0, 2, 3, 5]。

### パラメータ

- **`seamBlendMaxDist`:** attach からこの距離内のみ脇ブレンド。attach が seam 上にない場合は小さくして事実上無効化も可。
- **`skinningMaxDist`:** 胴スキニング半径。**220 で統一**（無断で大きくしない）。

### 特殊ガイド

- 脇ブレンドで肩頂が範囲に入る等 → `seamBlendMaxDist` を **180** 程度に抑える例あり。
- **`innerIndices` なし** → `scaleSleevePathToSpec` で袖幅まで伸びる → **袖スケールをスキップ**し placement＋回転のみ、が安全なことがある。

---

## 12. 袖・腕の追従（`coatArmLogic` / `sleeveOnlyTransform`）

- **`computeSleeveRotations`:** プレース後シーム方向 vs **渡された腕ポリライン** → 肩周り回転。
- **`sleeveOnlyTransform`:** 外腕へブレンド（袖付け weight 0 等は実装準拠）。

**禁止:** 座標系混在（プレース空間と SVG 原座標のまま比較）。§11 のパラメータを無断で大変更。

---

## 13. オーバーレイ・DEBUG（変形の正ではない）

- **`canvas/FittingCanvasMeasureOverlay`:** 注釈のみ。変形に影響しない。
- **`sessionStorage`:** `DEBUG_RIG_ARM`, `DEBUG_FITTING`, `DEBUG_NO_SEAM_FLATTEN` 等は **別コードパス**になり得る。正は **フラグ OFF**。

---

## 14. Canon の外だが挙動を壊しやすいもの（見落とし対策）

| 項目 | 内容 |
|------|------|
| **`apps/console/.../development/page.tsx`** | `localStorage` キー `atelier-dev-fitting` で服種・サイズを復元。**身長・体重は保存されない**。リロードで入力が戻ると「コードは同じなのに見え方が違う」になり得る。 |
| **サイズアニメ** | `animProgress` / `fromSize` `toSize` / カスタム from-to で **`interpolatePath`** 等。スナップショット計算の分岐が増える。 |
| **`rigBodyEnabled` / `rigGarmentEnabled`** | UI トグルで **描画・デバッグ用パス**が変わる（計算の芯は同じでも確認対象がずれる）。 |
| **`next` / Turbopack / `node_modules` 更新** | 同一コミットでも環境差で見え方が変わることはあり得る。不具合切り分け時は `npm ci` 等を意識。 |
| **アップロード SVG・商品 DB の path** | Git に含まれないデータ。Canon は **コード上のパイプライン**の正。悪い SVG はどの理論でも破綻し得る。 |
| **自動テスト** | 本領域を固定する **スナップショット／E2E は本書執筆時点では前提にしていない**。 |

---

## 15. 変更時の手動回帰チェック（最低限）

1. 身長: 体・赤リグ・カスタム服の肩・袖が **同時に**破綻なく動く。
2. 体重: **体**が太る／痩せる。**服の横幅**が意図せず大きく変わっていない。
3. リグ ON: `rigLineWarpedRigViewPaths` と **`rigTemplateToRigView*`** で **腕傾きが共有**されている。
4. **170 / 60** 付近でシャツ・ジャケット・汎用トップの基準見た目が大きく崩れていない。

---

## 16. 変更してよいこと（例）

- Canon と同値のリファクタ、オーバーレイ文言、DEBUG ログ。
- **Canon を更新したうえでの**係数調整（腕鉛直寄せ・脊髄頭ブレンドなど）。

---

## 17. 主要ファイル索引

| 領域 | ファイル |
|------|----------|
| スナップショット | `compute/fittingCanvasCompute.ts` |
| React 供給 | `canvas/useFittingCanvasData.ts` |
| 定数・ゾーン | `lib/constants.ts`, `body/bodyZones.ts`, `lib/bodyUtils.ts` |
| リグデータ・写像 | `lib/modelRigData.ts` |
| リグスキン | `lib/rigSkin2D.ts` |
| プレース | `lib/garmentBase.ts` |
| カスタム変換 | `customGarment/buildCustomTransformedPaths.ts` |
| 袖 | `lib/sleeveOnlyTransform.ts`, `lib/coatArmLogic.ts` |
| 汎用 fit | `generic/runGenericTopFit.ts`, `applyGenericMeasureOnlyGrading.ts` |
| 肩角度図（表示） | `canvas/FittingCanvasRigAngleDiagram.tsx` |
| 開発ページ状態 | `../page.tsx` |

---

*実装と矛盾する場合は、意図を決めて **実装バグ**か **本書の未更新**かを切り分ける。*
