# 平置き cm ガーメント SVG 構造（標準）

Figma エクスポートの標準レイヤー構成。viewBox は **モデル `model_front` と同一**（現在の契約: `0 0 389 525` → `GARMENT_FLAT_CM_VIEWBOX`）。

**モデルリグ正本:** `apps/console/public/fitting-models/model-front-rig-nine.svg`（`model_front (3).svg` の `#rig` 9 本・BPATHS index 順）。ランタイムは `gridSvgRigData.GRID_RIG_NINE_PATH_DS_SVG` がこれと一致する。

## ルート直下（推奨）

```
<svg viewBox="0 0 389 525">
  <g id="measures"> … 計測線（赤）のみ。試着計算から除外 </g>
  <g id="clothes">
    <g id="body"> … 胴・衿・前面ボタン等（背面線は別扱い、下記） </g>
    <g id="arm_L"> … 左袖 path（ゾーン sleeve_L） </g>
    <g id="arm_R"> … 右袖 path（ゾーン sleeve_R） </g>
  </g>
  <g id="rig"> … 格子リグ 9 本（黒 stroke）。試着のランドマーク・赤オーバーレイ用 </g>
</svg>
```

- ルートに `<g id="FIREMAN JACKET">` などフレーム名のラッパーがあっても可（子に `rig` / `clothes` / `measures` があれば取り込み可）。
- `rig` と `clothes` の **兄弟順序は任意**（FIREMAN 系は `rig` が先でも可）。

## FIREMAN JACKET 系（実ファイルの典型）

`FIREMAN JACKET (1).svg` のようなエクスポート:

```
<svg viewBox="0 0 389 518">   ← モデルが 525 のときは Figma 側で 525 に揃える
  <g id="FIREMAN JACKET">
    <g id="rig"> … 9 本（モデル grid-body-rig と同型・推奨） </g>
    <g id="clothes">
      <g id="arm_L_2"> … 左袖（Figma が rig と id 衝突で _2 付与）→ コードは sleeve_L 扱い </g>
      <g id="arm_R_2"> … 右袖 → sleeve_R </g>
      <g id="body">
        … 胴・ボタン path
        <path id="back-stroke"> … </path>      ← body 内でも path id で背面レイヤ認識
        <path id="back-stroke_2"> … </path>   ← _3〜_5 が無いと背面は 2 本のみ
      </g>
    </g>
    <g id="measures"> measure_* 赤線 </g>
  </g>
</svg>
```

### FIREMAN で直すとよい点（Figma）

| 項目 | 現状 | 推奨 |
|------|------|------|
| viewBox 高さ | 518 | **525**（`model_front` と同じ） |
| 袖グループ名 | `arm_L_2` / `arm_R_2` | `arm_L` / `arm_R`（リグ path と別グループなので衝突しない） |
| 背面線 | `body` 内の path 2 本のみ | 必要なら `back-stroke`〜`back-stroke_5` を追加（試着でボディ裏に描画） |
| 背面線の置き場 | `body` 内 path | そのままで可。または `<g id="back-stroke">` を `clothes` 直下に分離 |

## 平置き cm ゾーン対応

| 祖先 `<g id>` | 変形ゾーン |
|----------------|------------|
| `arm_L`, `arm_L_2`, … | `sleeve_L` |
| `arm_R`, `arm_R_2`, … | `sleeve_R` |
| `body` | `body` |
| path `back-stroke*` | `GARMENT_FLAT_CM_PATH_ZONES`（前面から切り出し時用） |

`clothes` 自体にはゾーンを付けない。子グループで決まる。

## リグ `<g id="rig">`

- **9 本**の黒 stroke path（脊髄 + 脚 + 腕 + 肩）。
- DOM 順は標準テンプレと同型が望ましい: `shaft`, `leg_L`, `hip_L`, `leg_R`, `hip_R`, `arm_R`, `sholder_L`, `sholder_R`, `arm_L`（id 無しでも可。コードは `GARMENT_FLAT_CM_DOM_RIG_PATH_INDICES_FOR_BPATHS_ORDER` で並べ替え）。
- 座標は **格子モデル `grid-body-rig` / `model_front` の `#rig` と一致**させると、モデル赤リグと重なりやすい。

## 旧テンプレ（後方互換）

`<g id="garment">` 配下の `sleeve_L` / `sleeve_R` / `body` / `collar` も引き続き有効。

## フラット export（非推奨）

- `<g>` 無しで先頭 9 path がリグ → 取り込み時に `#rig` へ束ねるが、**服 path と混在しやすい**。
- Figma からは必ず `measures` / `clothes` / `rig` で SVG 出力すること。
