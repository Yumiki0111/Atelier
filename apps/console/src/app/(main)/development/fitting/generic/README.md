# 汎用フィット（`generic/`）

開発フィットの **カスタム服**は `presetId: "genericSymmetricTop"` のみ。同梱ブローゾン SVG・`blousonFixed` 経路は廃止済み。初期状態は **path 空**（[`getGenericSymmetricTopPreset`](./getGenericSymmetricTopPreset.ts)）で、**参照 SVG アップロード**で `pathDs` とランドマークが入る。サイズ表 3/4/5 の数値は [`genericDevDefaults.ts`](./genericDevDefaults.ts) の `GENERIC_TOP_SIZE_BY_KEY`。

## 流れ（自動判定なし）

1. **連結頂点インデックスの範囲を 4 つ手入力**（全 `<path>` の頂点を SVG 上から順につないだ 0 起算。単一 `42` または `10-50` / `10〜50`）—「汎用フィット · Apply」で確定。
2. **`buildSymmetricTopTopologyFromGlobalVertices`** — 頂点範囲から path の包含範囲を導出し、attach 点などを組み立てる。
3. **`buildGenericScalableSpec` / `buildGenericArmConfig`** — トポロジーとランドマーク・採寸から `ScalableGarmentSpec` と `ArmLogicConfig` を組み立てる（外腕は `seamOuter*Vertices` で点列をクリップ）。
4. **`runGenericSymmetricTopFitManual`** / **`runGenericSymmetricTopFitWithTopology`** — `buildTopPlacement` + **`applySleeveOnlyGarmentTransform`** で腕ブレンド・着丈スケールを実行。

`buildSymmetricTopTopologyFromIndices`（path インデックス）は **推定・検証用** に残す。本番 UI は頂点入力のみ。

`runGenericSymmetricTopFit`（自動推定版）は **プレースメントのみ** を返すスタブ（推定しない）。

## `resolveGenericScalableSpec`（キャンバス・オーバーレイ用）

`presetId === "genericSymmetricTop"` のとき、**4 つの頂点範囲がすべて `genericSymmetricTop` に入っている場合だけ** `ScalableGarmentSpec` を構築する。`inferSymmetricTopTopology` は使わない。

- **足りない / `buildSymmetricTopTopologyFromGlobalVertices` 失敗** → `null`。

## 既存コードとの共有

- **`sleeveOnlyTransform.ts`**（親ディレクトリ）: sleeveOnly の実体。汎用 Apply 後パイプラインから呼ばれる。
  - 以前、胴 bbox 中心 X スナップが常時有効で前胴が縦線に潰れることがあった。**汎用**の `buildGenericScalableSpec` では **`snapCenterXToBody: false`**（前中心の縦アーティファクト抑制）。

## アップロードと measure-only

- **フィット計算に使う `pathDs`**: `splitGarmentPathsFromSvg` で **モデル rig 線を除いた `garmentPathDs` のみ**。リグ線は **`debugRigPathDs`**。
- **4 シームなしでも胴グレード**: `applyGenericMeasureOnlyGrading` と `gradingBaselineLengthCm` 等（`FittingControls` の layout effect / アップロード時シード）で baseline を付与。
- **Apply 後に形が変わる理由**: `applied: true` のときは **`applySleeveOnlyGarmentTransform`** が入る。未 Apply は主に `place` に近い挙動になり得る。
- **ギザ塗り・脇の変な線**: 外腕シームは **`flattenSvgPathToPolyline`**（`pathUtils`）で C/Q を L に分割してから変換。`sessionStorage.setItem("DEBUG_NO_SEAM_FLATTEN","1")` で無効化可能。
- **Apply 直後の伸縮**: `bodyLengthCm` は **`gradingBaselineLengthCm`**（Apply 時の `size.length`）と揃える。プリセット 3/4/5 変更時は `size.length / 基準` でグレーディング。

## 限界・今後

- 左右対称・長袖前提。
- 改善するなら: 手入力補助（クリックでインデックス取得）など UI 側。
