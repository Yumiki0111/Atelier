# 腕ロジック 前提条件（コートと揃える）

腕ロジックが正しく動作するため、服の path 構造は以下を満たすこと。

## 1. Path 構成

| 役割 | 説明 | コート |
|------|------|--------|
| 袖左 | 肩→袖先の外側輪郭。place 後、肩 pivot で剛体回転 | path 1 |
| 袖右 | 同上 | path 4 |
| 脇左 | 袖付け付近のパス。attach からの距離でブレンド | path 2 |
| 脇右 | 同上 | path 5 |

## 2. 袖付け接合点 (attach)

- **seam path 上に頂点が存在すること**
- コート: path 2 の終点 (999, 1150) = ATTACH_L
- ブレンドは attach から BLEND_MAX_DIST 以内の seam 頂点に適用

## 3. ScalableSpec.sleeve

- `anchorIdx`: 肩の点（回転 pivot）。袖 path の前方
- `cuffIdx`: 袖口の点。腕角度計算に使用
- `lengthStartIdx`～`lengthEndIdx`: 袖丈計測・スケールの対象区間

## 4. bodyPathIndices

- 着丈 Y スケールをかける path。**袖 path は含めない**
- コート: [0, 2, 3, 5]（袖 1,4 を除く）

## 5. パラメータ

- `seamBlendMaxDist`: 着丈に応じて調整。**attach からこの距離内の seam 頂点のみ**ブレンド。attach が seam 上にない場合は小さくして脇ブレンドを事実上無効化
- `skinningMaxDist`: 胴体スキニング半径。220 で統一

## 6. ブローゾン・カーフヘアの制約

1. **脇ブレンド**: seam path に attach と同位置の頂点がなく、肩頂点が blend 範囲に入る
   → `seamBlendMaxDist` を 180 に抑える

2. **袖スケール**: `innerIndices` がないため、`scaleSleevePathToSpec` のラジアルスケールで袖幅まで伸びフレアする
   → `innerIndices` がない服は袖スケールをスキップ。placement＋回転のみ。
