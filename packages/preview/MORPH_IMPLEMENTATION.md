# モーフターゲット実装詳細ドキュメント

## 概要

このドキュメントでは、Atelier Preview パッケージにおける **モーフターゲット（Morph Target）** の実装について詳細に説明します。

モーフターゲットは、3Dモデルの形状を滑らかに変形させるための技術で、主に**身長変更**に使用されています。

---

## 1. アーキテクチャ概要

### 1.1 モーフターゲットの適用範囲

**重要な設計原則：モーフターゲットは `baseModel`（体）にのみ適用され、服（`loadedAssets`）には適用されません。**

```
┌─────────────────────────────────────────┐
│ baseModel (THREE.Group)                  │
│  └─ Mesh (morphTargetInfluences あり)    │ ← モーフ適用対象
│  └─ SkinnedMesh                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ loadedAssets (Map<string, Group[]>)     │
│  └─ 服グループ (THREE.Group)             │ ← モーフ適用対象外
│      └─ SkinnedMesh / Mesh              │
└─────────────────────────────────────────┘
```

### 1.2 分離メカニズム

**体と服の分離は、Three.js のシーングラフ構造によって実現されています：**

1. **`baseModel`**: 体のモデル（`THREE.Group`）
   - モーフターゲットを持つメッシュを含む
   - `morphTargetMeshes` 配列で管理

2. **`loadedAssets`**: 服のモデル群（`Map<string, THREE.Group[]>`）
   - `baseModel` とは別のグループとして管理
   - モーフターゲットの影響を受けない

3. **モーフ適用時の処理**:
   ```typescript
   morphTargetMeshes.forEach((mesh) => {
     // baseModel 内のメッシュのみを処理
     mesh.morphTargetInfluences[index] = value;
   });
   ```
   - `loadedAssets` は `morphTargetMeshes` に含まれないため、自動的に除外される

---

## 2. モーフターゲットの収集

### 2.1 収集タイミング

モーフターゲットを持つメッシュは、**ベースモデル読み込み時**に収集されます。

**実装箇所**: `viewer.ts` / `viewer-dev.ts` の `loadBaseModel()` 関数内

```typescript
// モーフターゲットを持つメッシュを収集
morphTargetMeshes.length = 0;
model.traverse((child) => {
  if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
    morphTargetMeshes.push(child);
    console.log("[Atelier Preview] Found mesh with morph targets:", {
      name: child.name,
      morphTargetCount: child.morphTargetInfluences.length,
      morphTargetNames: child.morphTargetDictionary 
        ? Object.keys(child.morphTargetDictionary) 
        : [],
    });
  }
});
```

### 2.2 収集条件

- **型**: `THREE.Mesh` インスタンス
- **条件**: `morphTargetInfluences` プロパティが存在する
- **対象**: `baseModel` を `traverse()` した際に見つかったメッシュのみ
- **除外**: `loadedAssets` 内のメッシュは自動的に除外（別グループのため）

### 2.3 データ構造

```typescript
// モーフターゲット管理
const morphTargetMeshes: THREE.Mesh[] = [];
```

各メッシュには以下のプロパティがあります：
- `morphTargetDictionary`: モーフ名 → インデックスのマッピング
- `morphTargetInfluences`: 各モーフの影響度（0.0 ～ 1.0）の配列

---

## 3. モーフターゲットの適用

### 3.1 汎用モーフ適用関数

**関数名**: `applyMorphTarget(morphTargetName: string, value: number)`

**実装**:
```typescript
function applyMorphTarget(morphTargetName: string, value: number) {
  morphTargetMeshes.forEach((mesh) => {
    if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const index = mesh.morphTargetDictionary[morphTargetName];
      if (index !== undefined && index < mesh.morphTargetInfluences.length) {
        mesh.morphTargetInfluences[index] = value;
      }
    }
  });
  render();
}
```

**動作**:
1. `morphTargetMeshes` 配列内の全メッシュを走査
2. 各メッシュの `morphTargetDictionary` からモーフ名に対応するインデックスを取得
3. `morphTargetInfluences[index]` に値を設定（0.0 ～ 1.0）
4. レンダリングを実行

**公開API**: `ViewerInstance.updateMorphTarget(morphTargetName, value)`

---

### 3.2 身長変更用モーフ適用

**関数名**: `applyHeightChange(newHeight: number, baseHeightValue?: number)`

**実装**:
```typescript
// モーフターゲットで身長を変更する場合
const heightMorphNames = ['height', 'Height', 'stature', 'Stature', 'tall', 'Tall'];
let morphApplied = false;

for (const morphName of heightMorphNames) {
  morphTargetMeshes.forEach((mesh) => {
    if (mesh.morphTargetDictionary && mesh.morphTargetDictionary[morphName] !== undefined) {
      const index = mesh.morphTargetDictionary[morphName];
      if (mesh.morphTargetInfluences && index < mesh.morphTargetInfluences.length) {
        // モーフターゲットの値は0-1の範囲で、身長の比率に基づいて設定
        const morphValue = Math.max(0, Math.min(1, (heightRatio - 1) * 0.5 + 0.5));
        mesh.morphTargetInfluences[index] = morphValue;
        morphApplied = true;
        console.log("[Atelier Preview] Applied morph target:", { morphName, morphValue });
      }
    }
  });
}
```

**身長比率の計算式**:
```typescript
const heightRatio = newHeight / targetBaseHeightCm;
const morphValue = Math.max(0, Math.min(1, (heightRatio - 1) * 0.5 + 0.5));
```

**説明**:
- `heightRatio = 1.0`（基準身長） → `morphValue = 0.5`
- `heightRatio = 1.2`（120%） → `morphValue = 0.6`
- `heightRatio = 0.8`（80%） → `morphValue = 0.4`

**探索するモーフ名**:
- `height`, `Height`
- `stature`, `Stature`
- `tall`, `Tall`

**フォールバック**: モーフターゲットが見つからない場合、Y軸スケールで身長を変更

---

## 4. 服の位置調整（モーフ適用後の処理）

### 4.1 問題点

モーフターゲットで体の形状が変わるため、服の位置を調整する必要があります。

### 4.2 解決方法

**基準点ベースの位置調整**を実装しています。

**実装箇所**: `applyHeightChange()` 関数内

```typescript
// モデルの現在のバウンディングボックスを取得
const currentBox = new THREE.Box3().setFromObject(baseModel);
const currentModelHeight = currentBox.max.y - currentBox.min.y;

// 現在の基準点を計算（カテゴリ別）
const currentReferencePoints = {
  top: currentBox.min.y + currentModelHeight * 0.82,    // トップス用：肩の位置
  bottom: currentBox.min.y + currentModelHeight * 0.45, // ボトムス用：腰の位置
  center: currentBox.getCenter(new THREE.Vector3()).y,   // その他用：モデルの中心
};
```

**カテゴリ別の基準点**:

| カテゴリ | 基準点 | 計算式 |
|---------|--------|--------|
| トップス系 | `top` | `min.y + height * 0.82` |
| ボトムス系 | `bottom` | `min.y + height * 0.45` |
| その他 | `center` | `Box3.getCenter().y` |

**位置調整の計算**:
```typescript
// 基準点の移動量を計算
const referencePointOffset = currentReferenceY - initialReferenceY;

// 服の位置を調整（基準点の移動に追従）
assetModel.position.set(
  initialPosition.x,
  initialPosition.y + referencePointOffset,
  initialPosition.z
);
```

### 4.3 スケール固定

**重要な設計**: 服は**スケール固定**です。

```typescript
// 服のスケールを初期スケールに完全に固定（拡大縮小させない）
if (initialScale) {
  assetModel.scale.copy(initialScale);
  
  // グループ内のすべての子要素のスケールも初期値に完全にリセット
  assetModel.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      const childInitialScale = assetChildInitialScales.get(child);
      if (childInitialScale) {
        child.scale.copy(childInitialScale);
      }
    }
  });
  
  assetModel.updateMatrixWorld(true);
}
```

**理由**: 服の実寸は固定であり、体の拡大縮小に追従させないため。

---

## 5. 静的フィットとの連携

### 5.1 静的フィットの目的

モーフ適用後、体と服の貫通を解消するために**静的フィット**を実行します。

**実装箇所**: `applyHeightChange()` 関数の末尾

```typescript
// ── 静的フィット（体-服 貫通解消） ───────────────────────────────────
if (loadedAssets.size > 0 && skeletonBones.size > 0) {
  baseModel.updateMatrixWorld(true);
  applyStaticFit({
    bones: skeletonBones,
    loadedAssets,
    iters: 16,   // 身長確定時はしっかり解消
    margin: 0.003,
  });
}
```

### 5.2 モーフパスでの静的フィット

**`viewer.ts`（モーフパス）**:
- モーフで体を変形
- ボーンは初期スケールのまま
- `boneInitialScales` は不要（ボーン拡大縮小なし）

**`viewer-dev.ts`（ボーンパス）**:
- ボーンで体を変形
- ベイク時にボーンを一時的に初期スケールに戻す
- `boneInitialScales` を渡す必要がある

---

## 6. モーフターゲットの探索と適用フロー

### 6.1 完全なフロー図

```
┌─────────────────────────────────────────────────────────┐
│ 1. ベースモデル読み込み                                  │
│    └─ model.traverse() で morphTargetMeshes を収集      │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 2. applyHeightChange(newHeight, baseHeightValue)        │
│    ├─ heightRatio = newHeight / baseHeightValue         │
│    └─ morphValue = (heightRatio - 1) * 0.5 + 0.5       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 3. モーフ名探索                                          │
│    └─ ['height', 'Height', 'stature', 'Stature', ...]   │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 4. モーフ適用（baseModel のみ）                         │
│    └─ morphTargetMeshes.forEach()                       │
│       └─ mesh.morphTargetInfluences[index] = morphValue│
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 5. 服の位置調整（loadedAssets）                         │
│    ├─ 基準点計算（top / bottom / center）               │
│    ├─ referencePointOffset 計算                        │
│    └─ assetModel.position.y += referencePointOffset    │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 6. 服のスケール固定                                      │
│    └─ assetModel.scale.copy(initialScale)              │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 7. 静的フィット（体-服 貫通解消）                       │
│    └─ applyStaticFit()                                  │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 8. レンダリング                                         │
│    └─ render()                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 7. 実装ファイル一覧

| ファイル | 役割 |
|---------|------|
| `viewer.ts` | モーフパス実装（本番用） |
| `viewer-dev.ts` | ボーンパス実装（開発用、モーフも使用可能） |
| `static-fit.ts` | 静的フィット（モーフ適用後の貫通解消） |

---

## 8. 重要な設計原則

### 8.1 体と服の分離

- **体（baseModel）**: モーフターゲット適用対象
- **服（loadedAssets）**: モーフターゲット適用対象外
- **分離方法**: Three.js のシーングラフ構造（別グループ）

### 8.2 服のスケール固定

- 服は**常に初期スケールを維持**
- 体の拡大縮小に追従しない
- 位置のみ調整（基準点ベース）

### 8.3 モーフ値の範囲

- **範囲**: 0.0 ～ 1.0
- **基準身長**: `morphValue = 0.5`
- **計算式**: `(heightRatio - 1) * 0.5 + 0.5`

---

## 9. デバッグとログ

### 9.1 モーフターゲット収集時のログ

```typescript
console.log("[Atelier Preview] Found mesh with morph targets:", {
  name: child.name,
  morphTargetCount: child.morphTargetInfluences.length,
  morphTargetNames: child.morphTargetDictionary 
    ? Object.keys(child.morphTargetDictionary) 
    : [],
});
```

### 9.2 モーフ適用時のログ

```typescript
console.log("[Atelier Preview] Applied morph target:", { 
  morphName, 
  morphValue 
});
```

### 9.3 身長変更時のログ

```typescript
console.log("[Atelier Preview] Height change:", {
  newHeight,
  targetBaseHeightCm,
  heightRatio,
  baseHeight,
  baseHeightValue,
  currentScale: { x, y, z },
  initialScale: { x, y, z },
});
```

---

## 10. トラブルシューティング

### 10.1 モーフターゲットが見つからない場合

**症状**: `morphApplied = false` となり、Y軸スケールでフォールバック

**原因**:
- モデルにモーフターゲットが含まれていない
- モーフ名が探索リストにない

**解決策**:
1. モデルファイル（GLB/GLTF）にモーフターゲットが含まれているか確認
2. `morphTargetDictionary` のキーを確認
3. 必要に応じて `heightMorphNames` 配列にモーフ名を追加

### 10.2 服が体とずれる場合

**原因**:
- 基準点の計算が不正確
- 初期基準点が保存されていない

**解決策**:
1. `baseModelInitialReferencePoints` が正しく保存されているか確認
2. カテゴリ判定が正しいか確認（`categoryLower.includes()`）

### 10.3 服が拡大縮小してしまう場合

**原因**:
- スケール固定処理が実行されていない
- `assetInitialScales` が保存されていない

**解決策**:
1. `applyHeightChange()` 内のスケール固定処理を確認
2. アセット読み込み時に `assetInitialScales` が保存されているか確認

---

## 11. 将来の拡張可能性

### 11.1 複数モーフターゲットの同時適用

現在は身長変更のみですが、以下の拡張が可能：
- 体型変更（太り/痩せ）
- 顔の形状変更
- その他の身体的特徴

### 11.2 モーフターゲットのアニメーション

スムーズな遷移を実現するために、補間処理を追加可能。

### 11.3 服へのモーフ適用（オプション）

将来的に服にもモーフを適用する場合は、`loadedAssets` 内のメッシュも `morphTargetMeshes` に追加する必要があります。

---

## 12. まとめ

- **モーフターゲットは `baseModel` にのみ適用**され、`loadedAssets`（服）には適用されない
- **分離は Three.js のシーングラフ構造**によって自動的に実現される
- **服は位置のみ調整**され、スケールは固定
- **静的フィット**でモーフ適用後の貫通を解消

この設計により、体と服を独立して制御しつつ、自然な着せ替えを実現しています。
