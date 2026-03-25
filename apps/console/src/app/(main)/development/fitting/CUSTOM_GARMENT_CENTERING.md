# カスタム服（リグロック時）のテンプレート水平位置

**実装:** `compute/fittingCanvasComputeGarmentCustom.ts`（`templateShiftXLocked` および `designToGarmentCanvas`）

**対象:** `rigGeometryLockedToModel === true`（アップロード SVG の `debugRigPathDs` 本数がモデル `rigLinePaths` と一致するとき）かつ `hasGarmentRig`。

---

## 1. 起きていた問題

- アップロードした服と赤リグを重ねたいが、**服シルエットが体の左右中央からズレる**（特に**若干右**に見えるなど）。
- SVG 上では服とリグが揃っていても、テンプレート座標に載せたあと・ワープ後に**見た目の中心**が体軸と一致しない。

---

## 2. うまくいかなかった理由（要約）

| アプローチ | なぜ不十分か |
|------------|----------------|
| ワープ**後**に X だけ足す | `warpRigLineRefBodyGarment` は**座標非線形**。後段の平行移動では「全体の中央」を脊髄に一致させられない。 |
| 服の頂点 **平均 X** と脊髄の平均 X を合わせる | 片側（例: 前身・片袖）にサンプル点が多いと**平均がその方向に引っ張られる** → シフト量が過大になり、**右（左）に寄せ過ぎ**に見える。 |
| 脊髄 path の**端点の中点**だけをアンカーにする | 曲線・多点の path では幾何上の「中心軸」と一致しないことがある。 |

---

## 3. うまくいった要因（正解）

### 3.1 ワープの**前**でテンプレート X を揃える

- シフトは **`customGarmentFabricRigViewWarp` を path に適用する前**に行う。
- 操作は **平行移動のみ**（`x += templateShiftXLocked`）。**身長による脊髄スケールは服に掛けない**方針は維持する。

### 3.2 水平の基準を「平均」ではなく **バウンディングボックス中心**

- **服:** すべての服 path を結んだ点集合について  
  \((\min X + \max X) / 2\)  
  → 頂点密度に左右されにくい「シルエットの左右の真ん中」に近い。
- **ターゲット（体の軸側）:** モデル **脊髄 line（index 0, `RIG_LINE_SPINE`）** の点集合について同様に  
  \((\min X + \max X) / 2\)。  
- 脊髄 path が取れない場合は **`BODY_CX`**（`lib/constants.ts`）をフォールバック。

### 3.3 計算順序

1. `buildCustomTransformedPathsWithVertexPlots` で服 path をテンプレートへ。
2. `rigAlign`（非ロック時の bbox 合わせ）を適用。
3. **`templateShiftXLocked = targetCx - garmentCx`** を求め、**服 path と `customPoints` だけ**テンプレ上で X シフト。
4. 肩の剛体合わせ（`rigidMapFromShoulderSegmentPair`）では、シフト後の肩テンプレ座標 **`(alx + sx, …)`** で `p0` / `p1` を取る（path と同じ座標系）。
5. `designToGarmentCanvas` では `place` → `rigAlign` のあと **`qx + templateShiftXLocked`** を `customGarmentFabricRigViewWarp` に渡し、オーバーレイと path を一致させる。

---

## 4. 他パイプラインとの関係

- **赤リグ**は `rigLinePaths` 起点で `rigTemplateToRigViewForGarmentPath`。**服**はシフト後テンプレでワープするため、**同じテンプレ空間で脊髄中心に寄せた上で**体に重ねる。
- 服のワープは引き続き **肩剛体 + 脊髄合わせ後の肩線**（`rigSpineAlignFnGarment` 上の `q0`/`q1`）で、**服全体を脊髄スケールで伸ばす**ことはしない（Canon §7・カスタム服の意図と整合）。

---

## 5. 変更するときの注意

- シフト対象から **`customRigPathDs`（赤リグ線）を外す**（モデルリグは元位置のまま表示する）。シフトするのは**服 path**と**それに追従する頂点・オーバーレイ用の `designToGarmentCanvas`**。
- `templateShiftXLocked` を **0.01px 未満**で打ち切るなどの閾値を変える場合は、見た目のジャダーと取りこぼしのトレードオフに注意。
