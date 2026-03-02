# US9754410B2 FIG.7 Garment Deformation API

Python参照実装サーバー。Three.js/TypeScript実装の検証用に、FIG.7の衣服変形アルゴリズムを実装しています。

## セットアップ

```bash
cd server
pip install -r requirements.txt
```

## 起動

```bash
python app.py
```

または

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

サーバーは `http://localhost:8000` で起動します。

## API エンドポイント

### POST /register

メッシュペアを登録し、前計算を実行します。

**リクエスト例（JSON）:**
```json
{
  "body": {
    "btPos": [x1, y1, z1, x2, y2, z2, ...],  // [Nb*3] Float32Array
    "morphPos": [x1, y1, z1, ...],  // [Nb*3] Float32Array
    "morphTargetsRelative": true,  // true=delta, false=absolute
    "bodyIndex": [i1, i2, i3, ...]  // [Ib*3] Int32Array
  },
  "garment": {
    "gtPos": [x1, y1, z1, ...],  // [Ng*3] Float32Array
    "garmentIndex": [i1, i2, i3, ...]  // [Ig*3] Int32Array
  },
  "options": {
    "wBody": 0.8,
    "wGarment": 0.2,
    "distPow": 2.0,
    "minGap": 0.3,  // 自動判定される場合は省略可
    "enlarge": 0.0
  }
}
```

**レスポンス:**
```json
{
  "mesh_id": "uuid-string",
  "debug": {
    "Nb": 1234,
    "Ng": 5678,
    "avgBtMagnitude": 180.5,
    "isCmScale": true,
    "minGap": 0.3,
    "wBody": 0.8,
    "wGarment": 0.2,
    "distPow": 2.0,
    "liAvg": 0.123,
    "liMax": 0.456
  }
}
```

### POST /deform

登録済みメッシュを変形します。

**リクエスト例:**
```json
{
  "mesh_id": "uuid-string",
  "morph_weight": 0.5,  // 0..1
  "iterations": 30
}
```

**レスポンス:**
```json
{
  "g_new_pos": [x1, y1, z1, x2, y2, z2, ...],  // [Ng*3] Float32Array
  "debug": {
    "avgBuBtDiff": 0.123,
    "morphWeight": 0.5,
    "morphTargetsRelative": true,
    "iterations": [
      {"iter": 1, "maxDelta": 0.001, "collisions": 5},
      ...
    ],
    "totalCollisions": 150,
    "noBodyCandsRatio": 0.01,
    "avgBodyDist": 0.045,
    "liAvg": 0.123,
    "liMax": 0.456,
    "maxDelta": 0.0001,
    "avgFinalBodyDist": 0.003
  }
}
```

### GET /health

ヘルスチェック。

**レスポンス:**
```json
{
  "status": "ok",
  "cached_meshes": 1
}
```

## TypeScript側の使用例

`apps/console/src/app/(main)/model-generate/patent9754410/pythonApi.ts` を参照してください。

```typescript
import { registerMesh, deformMesh, updateBufferAttribute } from './pythonApi';

// 1. 登録（初回のみ）
const result = await registerMesh({
  body: {
    btPos: getBodyPositions(bodyMesh),
    morphPos: getMorphPositions(bodyMesh, "morph_height_min"),
    morphTargetsRelative: true,
    bodyIndex: getBodyIndices(bodyMesh),
  },
  garment: {
    gtPos: getGarmentPositions(garmentMesh),
    garmentIndex: getGarmentIndices(garmentMesh),
  },
});

const meshId = result.mesh_id;

// 2. 変形（morphWeight変更時）
const deformResult = await deformMesh({
  mesh_id: meshId,
  morphWeight: 0.5,
  iterations: 30,
});

// 3. BufferAttribute更新
const posAttr = garmentMesh.geometry.attributes.position as THREE.BufferAttribute;
updateBufferAttribute(posAttr, deformResult.g_new_pos);
garmentMesh.geometry.computeVertexNormals();
```

## 実装詳細

### FIG.7 アルゴリズム

1. **Step 702**: BuPos生成（morph targetから）
2. **Step 704**: 入力メッシュ（Bt, Gt）
3. **Step 706**: 候補頂点（body: 最近点の三角形3頂点、garment: 1-ring adjacency）
4. **Step 708**: 重み計算と正規化（Eq.[3][4][5][6][7]）
5. **Step 710**: Li事前計算（Eq.[2]）
6. **Step 712**: one-to-one mapping確認
7. **Step 714**: Jacobi反復（Eq.[1]）
8. **Step 718**: 衝突応答
9. **Step 716**: 長さ調整（Eq.[11], Y方向、top-fixed）

### キャッシュ戦略

`/register`時に以下を前計算:
- garment adjacency（1-ring neighbors）
- body trimesh（closest point queries用）
- body/garment候補リスト
- 正規化済み重み
- Li（Eq.[2]）

`/deform`時は以下だけ実行:
- BuPos生成
- Jacobi反復
- 衝突検出・応答
- 長さ調整

### 単位自動判定

`avg|Bt|`を計測し:
- `avg|Bt| > 10` → cm系: `minGap=0.3`（3mm）
- `avg|Bt| <= 10` → m系: `minGap=0.003`

`options.minGap`で明示的に指定可能。

## デバッグ情報

各レスポンスに含まれる`debug`フィールドには以下が含まれます:

- `avgBuBtDiff`: BuPosとBtPosの平均差（BuPosが正しく生成されているか確認）
- `noBodyCandsRatio`: body候補なし頂点の割合（>0.1なら位置ずれの可能性）
- `avgBodyDist`: 最近点距離の平均
- `liAvg/liMax`: Liの平均/最大値（≈0なら重み計算の問題）
- `maxDelta`: 各反復の最大更新量（≈0なら更新されていない）
- `collisions`: 各反復の衝突数
- `avgFinalBodyDist`: 最終的な服-体距離

## トラブルシューティング

### BuPos == BtPos

- morph targetが全て0の可能性
- `morphTargetsRelative`の設定が間違っている可能性
- glTFエクスポート時にShape Keysが含まれていない

### noBodyCandsRatio > 0.1

- bodyとgarmentの座標系が不一致
- メッシュが離れすぎている
- Blenderでエクスポート前に位置を確認

### maxDelta ≈ 0

- Li ≈ 0（重み計算の問題）
- BuPos == BtPos（morphが適用されていない）
- 候補が空（位置ずれ）
