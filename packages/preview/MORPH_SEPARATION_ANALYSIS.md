# モーフターゲットと体・服の分離についての分析

## 質問

**現在の実装では体（baseModel）と服（loadedAssets）を分離しているが、この分離は本当に必要か？分離しなくてもできる可能性はあるか？**

---

## Three.js のモーフターゲットの仕組み

### 重要な事実

**モーフターゲットは geometry 単位で定義される**

```typescript
// モーフターゲットは Mesh の geometry に定義される
mesh.geometry.morphAttributes.position = [morphTarget0, morphTarget1, ...];
mesh.morphTargetInfluences = [0.0, 0.0, ...];  // 各モーフの影響度
mesh.morphTargetDictionary = { "height": 0, "stature": 1, ... };
```

**異なる geometry を持つメッシュは、互いに独立したモーフターゲットを持つ**

- 体の geometry → 体のモーフターゲット（height, stature など）
- 服の geometry → 服のモーフターゲット（別のモーフ、またはモーフなし）

**モーフターゲットの適用は geometry 単位で行われる**

```typescript
mesh.morphTargetInfluences[index] = value;
// この操作は、その mesh の geometry にのみ影響する
// 他のメッシュの geometry には影響しない
```

---

## 現在の実装

### シーングラフ構造

```
scene
├── baseModel (THREE.Group)
│   ├── Mesh (morphTargetInfluences あり) ← モーフ適用対象
│   └── SkinnedMesh
└── loadedAssets (Map<string, THREE.Group[]>)
    └── 服グループ (THREE.Group)
        └── SkinnedMesh / Mesh ← モーフ適用対象外
```

### モーフ適用の実装

```typescript
// 1. ベースモデル読み込み時に、モーフターゲットを持つメッシュを収集
morphTargetMeshes.length = 0;
model.traverse((child) => {
  if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
    morphTargetMeshes.push(child);  // baseModel 内のメッシュのみ
  }
});

// 2. モーフ適用時
morphTargetMeshes.forEach((mesh) => {
  mesh.morphTargetInfluences[index] = value;  // 体のメッシュのみに適用
});
```

### 現在の「分離」の理由

1. **効率的な走査**: `morphTargetMeshes` 配列に体のメッシュのみを保存することで、モーフ適用時の走査を効率化
2. **管理のしやすさ**: 体と服を別々に管理することで、コードが明確になる
3. **意図の明確化**: 「体にのみモーフを適用する」という意図が明確になる

---

## 分離しない場合の可能性

### オプション 1: すべてを1つのグループに統合

```typescript
// すべてを1つのグループに統合
const unifiedModel = new THREE.Group();
unifiedModel.add(baseModel);
loadedAssets.forEach((modelArray) => {
  modelArray.forEach((asset) => {
    unifiedModel.add(asset);
  });
});
scene.add(unifiedModel);
```

**モーフ適用時の処理**:

```typescript
// 方法 A: メッシュ名で識別
unifiedModel.traverse((child) => {
  if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
    // 体のメッシュかどうかを名前で判定
    if (isBodyMesh(child)) {
      child.morphTargetInfluences[index] = value;
    }
  }
});

// 方法 B: userData で識別
// 読み込み時に userData.isBody = true を設定
unifiedModel.traverse((child) => {
  if (child instanceof THREE.Mesh && 
      child.morphTargetInfluences && 
      child.userData.isBody) {
    child.morphTargetInfluences[index] = value;
  }
});

// 方法 C: すべてのメッシュを走査（現在の実装とほぼ同じ）
unifiedModel.traverse((child) => {
  if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
    // モーフターゲットが定義されているメッシュのみに適用
    // 服のメッシュにはモーフが定義されていないので、自動的に除外される
    child.morphTargetInfluences[index] = value;
  }
});
```

### オプション 2: メッシュの識別方法

**方法 A: メッシュ名で識別**
```typescript
function isBodyMesh(mesh: THREE.Mesh): boolean {
  const bodyNames = ['body', 'Body', 'base', 'Base', 'character', 'Character'];
  return bodyNames.some(name => mesh.name.includes(name));
}
```

**方法 B: userData で識別**
```typescript
// 読み込み時に設定
mesh.userData.isBody = true;
mesh.userData.isClothing = false;
```

**方法 C: モーフターゲットの存在で識別**
```typescript
// 体のメッシュには height, stature などのモーフが定義されている
// 服のメッシュにはモーフが定義されていない（または別のモーフ）
if (mesh.morphTargetDictionary && 
    (mesh.morphTargetDictionary['height'] !== undefined ||
     mesh.morphTargetDictionary['stature'] !== undefined)) {
  // 体のメッシュ
}
```

---

## 結論

### 分離は必須ではない

**Three.js のモーフターゲットの仕組み上、geometry 単位で独立しているため、シーングラフの構造（分離）は必須ではない。**

- 体の geometry のモーフは、体の geometry にのみ影響する
- 服の geometry にはモーフが定義されていない（または別のモーフ）ため、影響を受けない
- したがって、体と服が同じグループにいても、モーフは体にのみ影響する

### 現在の実装の利点

1. **効率性**: `morphTargetMeshes` 配列に体のメッシュのみを保存することで、モーフ適用時の走査を効率化
2. **明確性**: 体と服を別々に管理することで、コードの意図が明確になる
3. **保守性**: 体と服の処理を分離することで、コードの保守が容易になる

### 分離しない場合の実装

分離しない場合でも実装可能だが、以下の点に注意が必要：

1. **メッシュの識別**: モーフ適用時に、体のメッシュを識別する必要がある
2. **走査の効率**: すべてのメッシュを走査する必要がある（ただし、モーフが定義されていないメッシュは自動的に除外される）
3. **コードの複雑性**: メッシュの識別ロジックが追加される

### 推奨

**現在の実装（分離）を維持することを推奨**

理由：
- モーフターゲットの仕組み上、分離は必須ではないが、実装の効率性と明確性の観点から、現在の実装が最適
- 分離しない場合でも実装可能だが、コードの複雑性が増す
- 現在の実装は、Three.js のモーフターゲットの仕組みを正しく理解した上での最適化

---

## 補足：モーフターゲットとスケールの関係

**重要な点**: モーフターゲットは geometry の頂点位置を変更するだけで、スケールには影響しない。

- モーフ適用 → geometry の頂点位置が変わる
- スケール変更 → Object3D の scale プロパティが変わる（geometry には影響しない）

したがって、体と服が同じグループにいても、`baseModel.scale` の変更は服にも影響する可能性がある。これは、モーフターゲットとは別の問題（スケールの継承）である。

**現在の実装では、この問題を以下の方法で解決している**：

1. 体と服を別々のグループとして管理（スケールの継承を防ぐ）
2. 服のスケールを常に初期値に固定
3. 静的フィットでベイクする前に、`baseModel.scale` を一時的に初期値に戻す

---

## まとめ

- **分離は必須ではない**（モーフターゲットの仕組み上）
- **現在の実装（分離）が最適**（効率性と明確性の観点から）
- **分離しない場合でも実装可能**（メッシュの識別が必要）

現在の実装は、Three.js のモーフターゲットの仕組みを正しく理解した上での最適化であり、変更する必要はない。
