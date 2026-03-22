# 開発フィット — カスタム服（汎用トップ）

## スコープ

- **対象**: `presetId === "genericSymmetricTop"`。参照 SVG **アップロード**＋任意で 4 連結区間の手入力と Apply。
- **廃止**: `blousonFixed`、同梱 `BLOUSON_PATH_DS`、ブローゾン専用 `getScalableSpec` / 強制腕ロジック。
- **初期データ**: [`getGenericSymmetricTopPreset`](./generic/getGenericSymmetricTopPreset.ts)（`pathDs: []`、プレースホルダー座標、サイズ表は [`genericDevDefaults.ts`](./generic/genericDevDefaults.ts)）。

## `coatArmLogic.ts`（共有プリミティブ）

ブローゾン専用定数は削除済み。型 **`ArmLogicConfig`** と **`scaleBodyToSpec` / `scaleSleevePathToSpec` / `computeSleeveRotations`** などは、汎用パイプライン（`buildGenericArmConfig` → `sleeveOnlyTransform`）から利用される。

## 変換（`buildCustomTransformedPaths`）

1. **`presetId === "genericSymmetricTop"`**
   - **Apply 済み + 4 シーム**: `runGenericSymmetricTopFitWithTopology` / `runGenericSymmetricTopFitManual`（sleeveOnly）。
   - **measure-only 有効**: `applyGenericMeasureOnlyGrading` → `place`。
2. **`getScalableSpec` / `getArmLogicConfig`**（[`scalableSpec.ts`](./customGarment/scalableSpec.ts)）: レガシー用に常に `null`。胴の旧「ブローゾン固定」スケール経路は使わない。
3. 上記以外: 単純 `tPath` + `place`。

## キャンバス・オーバーレイ

- **`resolveGenericScalableSpec`**: 4 区間が揃っているときのみ spec。袖丈赤線は `sleeveMeasureIndices` 等。
- **ミラー袖丈表示**: `genericSymmetricTop.lockedTopology` があれば利用（ブローゾン固定トポへのフォールバックはなし）。

## 汎用化の方向（メモ）

1. **解析層**: 各 `path` の幾何から役割（外腕・内袖など）を推定
2. **フィット層**: 役割ラベルだけを入力に sleeveOnly 数式を適用

現状は **手入力トポロジー**前提。
