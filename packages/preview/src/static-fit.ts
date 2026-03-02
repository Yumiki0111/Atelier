/**
 * static-fit.ts
 *
 * 軽量"静的フィット"システム
 *   - 身長変更 / 着せ替え時のみ実行（イベント駆動）
 *   - SkinnedMesh をスキニング結果にベイクした通常 Mesh に差し替え
 *   - 「体メッシュそのもの」の bake 表面から服頂点を押し出す（カプセル不使用）
 *   - 揺れ不要（カメラ回転のみのシーンを対象）
 */

import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// 型定義（後方互換のため Capsule は残す）
// ─────────────────────────────────────────────────────────────────────────────

/** ワールド空間カプセルコライダー（フォールバック用） */
export interface Capsule {
  a: THREE.Vector3;
  b: THREE.Vector3;
  r: number;
}

/**
 * 体表面の代表点群（ワールド空間）
 * BodySurface は buildBodySurface() で生成し、
 * 服SkinnedMesh ごとに pushOutOfBodySurface() を呼ぶ。
 */
export interface BodySurface {
  /** 各代表点のワールド位置 (flat: [x0,y0,z0, x1,y1,z1, ...]) */
  posX: Float32Array;
  posY: Float32Array;
  posZ: Float32Array;
  /** 各代表点の外向き法線 (flat) */
  normX: Float32Array;
  normY: Float32Array;
  normZ: Float32Array;
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ボーンユーティリティ（後方互換）
// ─────────────────────────────────────────────────────────────────────────────

export function findBone(
  bones: Map<string, THREE.Bone> | THREE.Bone[],
  nameSuffix: string
): THREE.Bone | null {
  const iter = Array.isArray(bones) ? bones : Array.from(bones.values());
  for (const bone of iter) {
    if (bone.name === nameSuffix || bone.name.endsWith(nameSuffix)) {
      return bone;
    }
  }
  return null;
}

/** フォールバック用カプセルビルダー（baseModel が無い場合に使用） */
export function makeCapsuleBetweenBones(
  boneA: THREE.Bone,
  boneB: THREE.Bone,
  radius: number
): Capsule {
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  boneA.getWorldPosition(a);
  boneB.getWorldPosition(b);
  return { a, b, r: radius };
}

export function buildBodyCapsules(
  bones: Map<string, THREE.Bone> | THREE.Bone[]
): Capsule[] {
  const CONFIGS = [
    { a: "Hips",          b: "Chest",         r: 0.15 },
    { a: "Spine",         b: "Chest",         r: 0.15 },
    { a: "Hips",          b: "Spine",         r: 0.17 },
    { a: "LeftUpLeg",     b: "LeftLeg",       r: 0.13 },
    { a: "RightUpLeg",    b: "RightLeg",      r: 0.13 },
    { a: "LeftArm",       b: "LeftForeArm",   r: 0.09 },
    { a: "RightArm",      b: "RightForeArm",  r: 0.09 },
    { a: "LeftShoulder",  b: "LeftArm",       r: 0.10 },
    { a: "RightShoulder", b: "RightArm",      r: 0.10 },
  ];
  const capsules: Capsule[] = [];
  for (const cfg of CONFIGS) {
    const bA = findBone(bones, cfg.a);
    const bB = findBone(bones, cfg.b);
    if (bA && bB) capsules.push(makeCapsuleBetweenBones(bA, bB, cfg.r));
  }
  return capsules;
}

// ─────────────────────────────────────────────────────────────────────────────
// SkinnedMesh ベイク
// ─────────────────────────────────────────────────────────────────────────────

const _bv0 = new THREE.Vector3();
const _bv1 = new THREE.Vector3();
const _bm  = new THREE.Matrix4();

function computeSkinnedVertex(
  skinned: THREE.SkinnedMesh,
  index: number,
  target: THREE.Vector3
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (skinned as any).boneTransform === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (skinned as any).boneTransform(index, target);
    return;
  }

  const geo    = skinned.geometry as THREE.BufferGeometry;
  const posA   = geo.attributes.position as THREE.BufferAttribute;
  const siAttr = geo.attributes.skinIndex  as THREE.BufferAttribute;
  const swAttr = geo.attributes.skinWeight as THREE.BufferAttribute;

  if (!siAttr || !swAttr) {
    target.set(posA.getX(index), posA.getY(index), posA.getZ(index));
    return;
  }

  const skeleton = skinned.skeleton;
  const bones    = skeleton.bones;
  const bInvs    = skeleton.boneInverses;
  const bind     = skinned.bindMatrix;
  const bindInv  = skinned.bindMatrixInverse;

  _bv0.set(posA.getX(index), posA.getY(index), posA.getZ(index));
  _bv0.applyMatrix4(bind);
  target.set(0, 0, 0);

  const siArr  = siAttr.array as ArrayLike<number>;
  const swArr  = swAttr.array as ArrayLike<number>;
  const siSize = siAttr.itemSize;
  const swSize = swAttr.itemSize;
  const siOff  = index * siSize;
  const swOff  = index * swSize;

  for (let j = 0; j < 4; j++) {
    const w  = swArr[swOff + j];
    if (!w) continue;
    const bi = Math.floor(siArr[siOff + j]);
    if (bi < 0 || bi >= bones.length) continue;
    _bm.multiplyMatrices(bones[bi].matrixWorld, bInvs[bi]);
    _bv1.copy(_bv0).applyMatrix4(_bm);
    target.addScaledVector(_bv1, w);
  }
  target.applyMatrix4(bindInv);
}

export function bakeSkinnedMeshGeometry(
  skinned: THREE.SkinnedMesh
): THREE.BufferGeometry {
  const srcGeo = skinned.geometry as THREE.BufferGeometry;
  const count  = srcGeo.attributes.position.count;
  const baked  = srcGeo.clone();
  const arr    = new Float32Array(count * 3);
  const tmp    = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    computeSkinnedVertex(skinned, i, tmp);
    arr[i * 3]     = tmp.x;
    arr[i * 3 + 1] = tmp.y;
    arr[i * 3 + 2] = tmp.z;
  }
  baked.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  baked.computeVertexNormals();
  return baked;
}

// ─────────────────────────────────────────────────────────────────────────────
// 体表面の構築（カプセルの代替 – 実際の体ジオメトリを使用）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * baseModel の中から体メッシュ（"body" を含む名前）を見つけ、
 * SkinnedMesh なら bake してワールド座標に変換し、
 * 均一間引きで代表点群（BodySurface）を構築する。
 *
 * @param maxPoints 代表点の上限（増やすほど精度 UP、速度 DOWN）
 */
export function buildBodySurface(
  baseModel: THREE.Group,
  maxPoints = 600
): BodySurface | null {
  const rawPos: number[] = [];
  const rawNorm: number[] = [];

  const tmpWorld = new THREE.Matrix4();
  const tmpVec   = new THREE.Vector3();
  const tmpNorm  = new THREE.Vector3();

  baseModel.traverse((obj) => {
    const lname = obj.name.toLowerCase();
    // 体メッシュのみ対象（mask_ は除外）
    if (!lname.includes("body")) return;
    if (lname.includes("mask_")) return;

    let posAttr:  THREE.BufferAttribute | undefined;
    let normAttr: THREE.BufferAttribute | undefined;
    let worldMat: THREE.Matrix4;

    if (obj instanceof THREE.SkinnedMesh) {
      obj.updateMatrixWorld(true);
      // bake してからワールド座標に変換
      const bakedGeo = bakeSkinnedMeshGeometry(obj);
      posAttr  = bakedGeo.attributes.position as THREE.BufferAttribute;
      normAttr = bakedGeo.attributes.normal   as THREE.BufferAttribute | undefined;
      // bake 結果はメッシュローカル空間なので matrixWorld を掛ける
      worldMat = obj.matrixWorld;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        tmpVec.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(worldMat);
        rawPos.push(tmpVec.x, tmpVec.y, tmpVec.z);
        if (normAttr) {
          tmpNorm.set(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
            .transformDirection(worldMat);
          rawNorm.push(tmpNorm.x, tmpNorm.y, tmpNorm.z);
        } else {
          rawNorm.push(0, 1, 0);
        }
      }
      bakedGeo.dispose();
    } else if (obj instanceof THREE.Mesh) {
      obj.updateMatrixWorld(true);
      posAttr  = obj.geometry.attributes.position as THREE.BufferAttribute;
      normAttr = obj.geometry.attributes.normal   as THREE.BufferAttribute | undefined;
      worldMat = obj.matrixWorld;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        tmpVec.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(worldMat);
        rawPos.push(tmpVec.x, tmpVec.y, tmpVec.z);
        if (normAttr) {
          tmpNorm.set(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
            .transformDirection(worldMat);
          rawNorm.push(tmpNorm.x, tmpNorm.y, tmpNorm.z);
        } else {
          rawNorm.push(0, 1, 0);
        }
      }
    }
  });

  tmpWorld; // suppress unused
  const totalVerts = rawPos.length / 3;
  if (totalVerts === 0) {
    console.warn("[StaticFit] buildBodySurface: no body vertices found");
    return null;
  }

  // 均一間引き
  const step  = Math.max(1, Math.floor(totalVerts / maxPoints));
  const count = Math.ceil(totalVerts / step);

  const posX = new Float32Array(count);
  const posY = new Float32Array(count);
  const posZ = new Float32Array(count);
  const normX = new Float32Array(count);
  const normY = new Float32Array(count);
  const normZ = new Float32Array(count);

  for (let k = 0; k < count; k++) {
    const i = k * step;
    posX[k]  = rawPos[i * 3];
    posY[k]  = rawPos[i * 3 + 1];
    posZ[k]  = rawPos[i * 3 + 2];
    normX[k] = rawNorm[i * 3];
    normY[k] = rawNorm[i * 3 + 1];
    normZ[k] = rawNorm[i * 3 + 2];
  }

  console.log(`[StaticFit] buildBodySurface: ${totalVerts} → ${count} representative points`);
  return { posX, posY, posZ, normX, normY, normZ, count };
}

// ─────────────────────────────────────────────────────────────────────────────
// 体表面からの押し出し
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ワールド座標の服頂点 (px,py,pz) が体表面の内側にあれば
 * 最近傍体表面点の法線方向に押し出す。
 * 移動後の座標を pOut に書き込み、移動した場合は true を返す。
 */
function pushOutOfBodySurface(
  px: number, py: number, pz: number,
  surface: BodySurface,
  margin: number,
  pOut: { x: number; y: number; z: number }
): boolean {
  const { posX, posY, posZ, normX, normY, normZ, count } = surface;

  let nearestDistSq = Infinity;
  let nearestIdx    = -1;

  for (let i = 0; i < count; i++) {
    const dx = px - posX[i];
    const dy = py - posY[i];
    const dz = pz - posZ[i];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < nearestDistSq) {
      nearestDistSq = d2;
      nearestIdx    = i;
    }
  }

  if (nearestIdx < 0) return false;

  // (clothVertex - bodyPoint) · bodyNormal
  // < margin → 内側（貫通）、または外側でも margin 以内
  const dx  = px - posX[nearestIdx];
  const dy  = py - posY[nearestIdx];
  const dz  = pz - posZ[nearestIdx];
  const dot = dx * normX[nearestIdx] + dy * normY[nearestIdx] + dz * normZ[nearestIdx];

  if (dot < margin) {
    // 体表面点 + 外向き法線 * margin の位置に押し出す
    pOut.x = posX[nearestIdx] + normX[nearestIdx] * margin;
    pOut.y = posY[nearestIdx] + normY[nearestIdx] * margin;
    pOut.z = posZ[nearestIdx] + normZ[nearestIdx] * margin;
    return true;
  }

  return false;
}

// フォールバック用カプセル押し出し
function pointToSegmentSq(
  p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, closest: THREE.Vector3
): number {
  const ab   = b.clone().sub(a);
  const ap   = p.clone().sub(a);
  const lenSq = ab.lengthSq();
  const t    = lenSq < 1e-12 ? 0 : Math.max(0, Math.min(1, ap.dot(ab) / lenSq));
  closest.copy(ab).multiplyScalar(t).add(a);
  return p.distanceToSquared(closest);
}

export function pushOutOfCapsule(
  pWorld: THREE.Vector3, cap: Capsule, margin: number
): boolean {
  const closest = new THREE.Vector3();
  const distSq  = pointToSegmentSq(pWorld, cap.a, cap.b, closest);
  const thresh  = cap.r + margin;
  if (distSq < thresh * thresh) {
    const dist = Math.sqrt(distSq);
    const dir  = dist > 1e-6
        ? pWorld.clone().sub(closest).divideScalar(dist)
      : new THREE.Vector3(0, 0, 1);
    pWorld.copy(closest).addScaledVector(dir, thresh);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// エッジ距離拘束（PBD-lite / 圧縮のみ有効）
// ─────────────────────────────────────────────────────────────────────────────

interface SoftFitData {
  edges: Uint32Array;
  restLengths: Float32Array;
  vertexCount: number;
}
const SOFT_FIT_KEY = "__softFitData";

function getOrBuildSoftFitData(geo: THREE.BufferGeometry): SoftFitData | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyGeo = geo as any;
  if (anyGeo.userData[SOFT_FIT_KEY]) return anyGeo.userData[SOFT_FIT_KEY];

  const posAttr = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!posAttr) return null;

  const indexAttr = geo.getIndex();
  const vertexCount = posAttr.count;
  let indices: Uint32Array;
  if (indexAttr) {
    const src = indexAttr.array as ArrayLike<number>;
    indices = new Uint32Array(indexAttr.count);
    for (let i = 0; i < indexAttr.count; i++) indices[i] = src[i];
  } else {
    const tc = Math.floor(vertexCount / 3);
    indices = new Uint32Array(tc * 3);
    for (let i = 0; i < tc * 3; i++) indices[i] = i;
  }

  const edgeSet = new Set<string>();
  const edgesArr: number[] = [];
  const addEdge = (a: number, b: number) => {
    const i = Math.min(a, b), j = Math.max(a, b);
    const key = `${i}_${j}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edgesArr.push(i, j);
  };
  for (let i = 0; i < indices.length; i += 3) {
    addEdge(indices[i], indices[i + 1]);
    addEdge(indices[i + 1], indices[i + 2]);
    addEdge(indices[i + 2], indices[i]);
  }

  const edges       = new Uint32Array(edgesArr);
  const restLengths = new Float32Array(edges.length / 2);
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3();
  for (let e = 0; e < edges.length; e += 2) {
    v0.set(posAttr.getX(edges[e]),     posAttr.getY(edges[e]),     posAttr.getZ(edges[e]));
    v1.set(posAttr.getX(edges[e + 1]), posAttr.getY(edges[e + 1]), posAttr.getZ(edges[e + 1]));
    restLengths[e / 2] = v0.distanceTo(v1);
  }

  const data: SoftFitData = { edges, restLengths, vertexCount };
  anyGeo.userData[SOFT_FIT_KEY] = data;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// メインソルバ
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ミニ布シミュレーション (Verlet + PBD 拘束 + ボディコリジョン)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * アンカー比率: 服の頂点を Y 座標の高い順に上位 TOP_ANCHOR_RATIO の割合だけピン固定。
 * 衿・肩・袖付け根エリアが固定され、残りは重力でドレープする。
 * （距離ベースの旧アプローチは全頂点をピンしてしまい機能しなかった）
 */
const TOP_ANCHOR_RATIO = 0.15; // 上位 15%（衿・肩ライン）

/** シミュレーション定数 */
const SIM_DT        = 0.016;  // タイムステップ (s)
const SIM_GRAVITY   = -4.0;   // 重力加速度 (m/s²) — 自然なドレープ感
const SIM_DAMPING   = 0.97;   // 速度減衰
const SIM_STIFFNESS = 0.65;   // エッジ拘束剛性

/**
 * ミニ布シミュレーションエンジン
 *
 * 処理の流れ:
 *   0. ベイク済み Mesh からワールド座標を取り出し cur/prev 配列を初期化
 *   1. アンカー検出: Y 座標上位 15% の頂点（衿・肩）をピン固定
 *      → 骨に追従したベイク位置をそのまま維持
 *   2. step × N:
 *      a. Verlet 積分 + 重力（非ピン頂点のみ）
 *      b. エッジ距離拘束 PBD（形状維持）
 *      c. ボディコリジョン（ピン含む全頂点に適用）
 *   3. ローカル座標に書き戻し
 *
 * これにより:
 *   - 衿・肩がスケルトン位置に固定されたまま、裾・袖が自然に垂れる
 *   - 体型変化時も貫通を解消
 *   - 服メッシュのモーフ不要
 *
 * @param steps シミュレーションステップ数 (iters として渡される)
 */
export function resolveBodyCollisionOnBakedMesh(
  bakedMesh: THREE.Mesh,
  capsulesOrSurface: Capsule[] | BodySurface,
  steps: number,
  margin = 0.003
): void {
  bakedMesh.updateMatrixWorld(true);
  const worldMat    = bakedMesh.matrixWorld;
  const invWorldMat = worldMat.clone().invert();

  const geo     = bakedMesh.geometry as THREE.BufferGeometry;
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const count   = posAttr.count;
  if (count === 0) return;

  const isSurface = (v: Capsule[] | BodySurface): v is BodySurface =>
    !Array.isArray(v) && "posX" in v;
  const useSurface = isSurface(capsulesOrSurface);
  const surface    = useSurface ? (capsulesOrSurface as BodySurface) : null;
  const capsules   = useSurface ? [] : (capsulesOrSurface as Capsule[]);
  if (!useSurface && capsules.length === 0) return;

  // ── ワールド座標で cur / prev 配列を初期化 ──
  const cur  = new Float32Array(count * 3);
  const prev = new Float32Array(count * 3);
  const tmp  = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    tmp.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    tmp.applyMatrix4(worldMat);
    const k = i * 3;
    cur[k] = prev[k] = tmp.x;
    cur[k + 1] = prev[k + 1] = tmp.y;
    cur[k + 2] = prev[k + 2] = tmp.z;
  }

  // ── Y 座標上位アンカー検出 ──
  // 服の最上部 TOP_ANCHOR_RATIO の頂点（衿・肩）をピン固定する。
  // ベイク時点（SkinnedMesh 骨追従）の位置を保持し、
  // 残りの頂点に重力とボディコリジョンを適用してドレープを生成する。
  const pinned = new Uint8Array(count);
  {
    let maxY = -Infinity, minY = Infinity;
    for (let i = 0; i < count; i++) {
      const y = cur[i * 3 + 1];
      if (y > maxY) maxY = y;
      if (y < minY) minY = y;
    }
    const yRange = maxY - minY;
    if (yRange > 1e-4) {
      const anchorYMin = maxY - yRange * TOP_ANCHOR_RATIO;
      let pinnedCount = 0;
      for (let i = 0; i < count; i++) {
        if (cur[i * 3 + 1] >= anchorYMin) { pinned[i] = 1; pinnedCount++; }
      }
      console.log(`[StaticFit] Anchored ${pinnedCount}/${count} vertices (top ${(TOP_ANCHOR_RATIO * 100).toFixed(0)}% by Y)`);
    }
  }

  // ── エッジ拘束データ取得 (rest length = ベイク時の形状) ──
  const softFit = getOrBuildSoftFitData(geo);

  // ── シミュレーションループ ──────────────────────────────────────────────
  const dt2 = SIM_DT * SIM_DT;

  for (let step = 0; step < steps; step++) {

    // a) Verlet 積分 + 重力 (非ピン頂点)
    for (let i = 0; i < count; i++) {
      if (pinned[i]) continue;
      const k = i * 3;
      const vx = (cur[k]     - prev[k])     * SIM_DAMPING;
      const vy = (cur[k + 1] - prev[k + 1]) * SIM_DAMPING;
      const vz = (cur[k + 2] - prev[k + 2]) * SIM_DAMPING;
      prev[k]     = cur[k];
      prev[k + 1] = cur[k + 1];
      prev[k + 2] = cur[k + 2];
      cur[k]     += vx;
      cur[k + 1] += vy + SIM_GRAVITY * dt2;  // 重力
      cur[k + 2] += vz;
    }

    // b) エッジ距離拘束 PBD (双方向)
    if (softFit) {
      const { edges, restLengths } = softFit;
      for (let e = 0, eCount = edges.length; e < eCount; e += 2) {
        const i = edges[e]; const j = edges[e + 1];
        const pi = i * 3;  const pj = j * 3;
        const dx = cur[pj]     - cur[pi];
        const dy = cur[pj + 1] - cur[pi + 1];
        const dz = cur[pj + 2] - cur[pi + 2];
        const len2 = dx * dx + dy * dy + dz * dz;
        if (len2 < 1e-10) continue;
        const len  = Math.sqrt(len2);
        const rest = restLengths[e >> 1];
        if (rest <= 0) continue;
        const diff = (len - rest) / len;
        const corr = SIM_STIFFNESS * diff * 0.5;
        const wi = pinned[i] ? 0.0 : 1.0;
        const wj = pinned[j] ? 0.0 : 1.0;
        const tot = wi + wj;
        if (tot < 1e-6) continue;
        if (!pinned[i]) {
          const si = wi / tot;
          cur[pi]     += dx * corr * si;
          cur[pi + 1] += dy * corr * si;
          cur[pi + 2] += dz * corr * si;
        }
        if (!pinned[j]) {
          const sj = wj / tot;
          cur[pj]     -= dx * corr * sj;
          cur[pj + 1] -= dy * corr * sj;
          cur[pj + 2] -= dz * corr * sj;
        }
      }
    }

    // c) ボディコリジョン (2step 毎) ── ピン済み頂点も含む全頂点に適用
    if (step % 2 === 0) {
      if (surface) {
        const { posX, posY, posZ, normX, normY, normZ, count: sc } = surface;
        for (let i = 0; i < count; i++) {
          const k = i * 3;
          const cx = cur[k]; const cy = cur[k + 1]; const cz = cur[k + 2];
          let nearDistSq = Infinity; let nearIdx = -1;
          for (let j = 0; j < sc; j++) {
            const dx = cx - posX[j]; const dy = cy - posY[j]; const dz = cz - posZ[j];
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < nearDistSq) { nearDistSq = d2; nearIdx = j; }
          }
          if (nearIdx < 0) continue;
          const bx = posX[nearIdx]; const by = posY[nearIdx]; const bz = posZ[nearIdx];
          const nx = normX[nearIdx]; const ny = normY[nearIdx]; const nz = normZ[nearIdx];
          const dot = (cx - bx) * nx + (cy - by) * ny + (cz - bz) * nz;
          if (dot < margin) {
            cur[k]     = bx + nx * margin;
            cur[k + 1] = by + ny * margin;
            cur[k + 2] = bz + nz * margin;
            // 速度をリセット（ピン・非ピン共通。跳ね返り防止）
            prev[k]     = cur[k];
            prev[k + 1] = cur[k + 1];
            prev[k + 2] = cur[k + 2];
          }
        }
      } else {
        // カプセルフォールバック: ピン済みはスキップ
        for (let i = 0; i < count; i++) {
          if (pinned[i]) continue;
          const k = i * 3;
          tmp.set(cur[k], cur[k + 1], cur[k + 2]);
          for (const cap of capsules) pushOutOfCapsule(tmp, cap, margin);
          cur[k] = tmp.x; cur[k + 1] = tmp.y; cur[k + 2] = tmp.z;
        }
      }
    }
  }

  // ── ローカル座標に書き戻し ──
  for (let i = 0; i < count; i++) {
    tmp.set(cur[i * 3], cur[i * 3 + 1], cur[i * 3 + 2]);
    tmp.applyMatrix4(invWorldMat);
    posAttr.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  posAttr.needsUpdate = true;
  geo.computeVertexNormals();
}

// ─────────────────────────────────────────────────────────────────────────────
// 高レベル オーケストレーター
// ─────────────────────────────────────────────────────────────────────────────

const BAKED_MESH_KEY    = "__staticFitBaked";
const INITIAL_SCALE_KEY = "__staticFitInitialScale";

function getOrCreateBakedMesh(source: THREE.SkinnedMesh): THREE.Mesh {
  if (source.userData[BAKED_MESH_KEY]) {
    return source.userData[BAKED_MESH_KEY] as THREE.Mesh;
  }
  const bakedGeo  = bakeSkinnedMeshGeometry(source);
  const bakedMesh = new THREE.Mesh(bakedGeo, source.material);
  bakedMesh.name = `${source.name}__baked`;
  bakedMesh.castShadow    = source.castShadow;
  bakedMesh.receiveShadow = source.receiveShadow;

  const initialScale = source.scale.clone();
  source.userData[INITIAL_SCALE_KEY] = initialScale;
  bakedMesh.scale.copy(initialScale);

  if (source.parent) source.parent.add(bakedMesh);
  source.userData[BAKED_MESH_KEY] = bakedMesh;
  return bakedMesh;
}

function refreshBakedGeometry(source: THREE.SkinnedMesh, bakedMesh: THREE.Mesh): void {
  const srcGeo  = source.geometry as THREE.BufferGeometry;
  const count   = srcGeo.attributes.position.count;
  const posAttr = bakedMesh.geometry.attributes.position as THREE.BufferAttribute;

  if (posAttr.count !== count) {
    bakedMesh.geometry.dispose();
    bakedMesh.geometry = bakeSkinnedMeshGeometry(source);
    return;
  }

  const tmp = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    computeSkinnedVertex(source, i, tmp);
    posAttr.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  posAttr.needsUpdate = true;
  bakedMesh.geometry.computeVertexNormals();

  // ── シミュレーションのエッジ rest length キャッシュを無効化 ──
  // 頂点位置が変わったので前回の rest length は無効
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (bakedMesh.geometry as any).userData[SOFT_FIT_KEY];
}

/**
 * 静的フィットのメインエントリポイント
 *
 * baseModel が渡された場合は体メッシュを bake して
 * 実際の表面から押し出す（推奨）。
 * baseModel が無い場合はカプセルコライダーにフォールバックする。
 */
export function applyStaticFit(opts: {
  bones: Map<string, THREE.Bone> | THREE.Bone[];
  loadedAssets: Map<string, THREE.Group[]>;
  boneInitialScales?: Map<THREE.Bone, THREE.Vector3>;
  baseModel?: THREE.Group;
  baseModelInitialScale?: THREE.Vector3;
  iters?: number;
  margin?: number;
  /** 体型モーフ用カプセル半径スケール（baseModel 無し時のフォールバックに使用） */
  capsuleRadiusScale?: number;
}): void {
  const {
    bones,
    loadedAssets,
    boneInitialScales,
    baseModel,
    baseModelInitialScale,
    iters  = 60, // シミュレーションステップ数（Verlet + PBD）
    margin = 0.003,
  } = opts;

  // ── 1. コリジョン対象を決定 ──────────────────────────────────────────────
  // 優先: 体メッシュ表面（baseModel あり）
  // フォールバック: カプセル（baseModel なし）

  let collision: BodySurface | Capsule[] | null = null;

  if (baseModel) {
    baseModel.updateMatrixWorld(true);
    const surface = buildBodySurface(baseModel, 600);
    if (surface && surface.count > 0) {
      collision = surface;
    }
  }

  if (!collision) {
    // フォールバック: capsules
  const capsules = buildBodyCapsules(bones);
  if (capsules.length === 0) {
      console.warn("[StaticFit] No body surface or capsules available");
    return;
    }
    collision = capsules;
    console.log("[StaticFit] Using capsule fallback (no baseModel)");
  } else {
    console.log("[StaticFit] Using body mesh surface collision");
  }

  // ── 2. baseModel スケール退避
  //    body mesh surface 方式では baseModel と服を同じスケールでベイクする必要があるため
  //    baseModel が渡された場合はスケールを触らない。
  //    フォールバック（capsule）時のみ初期スケールに戻す。
  let baseModelScaleBackup: THREE.Vector3 | null = null;
  const useSurfaceCollision = !Array.isArray(collision); // BodySurface か Capsule[] か
  if (!useSurfaceCollision && baseModel && baseModelInitialScale && !baseModel.scale.equals(baseModelInitialScale)) {
    baseModelScaleBackup = baseModel.scale.clone();
    baseModel.scale.copy(baseModelInitialScale);
    baseModel.updateMatrixWorld(true);
  }

  // ── 3. ボーンスケール退避 ────────────────────────────────────────────────
  const boneScaleBackup = new Map<THREE.Bone, THREE.Vector3>();
  let sharedSkeleton: THREE.Skeleton | null = null;
  if (boneInitialScales) {
    const boneArray = Array.isArray(bones) ? bones : Array.from(bones.values());
    for (const bone of boneArray) {
      const initS = boneInitialScales.get(bone);
      if (initS && !bone.scale.equals(initS)) {
        boneScaleBackup.set(bone, bone.scale.clone());
        bone.scale.copy(initS);
      }
    }
    if (boneScaleBackup.size > 0) {
      for (const modelArray of loadedAssets.values()) {
        for (const assetGroup of modelArray) {
          assetGroup.traverse((child) => {
            if (child instanceof THREE.SkinnedMesh && child.skeleton && !sharedSkeleton) {
              sharedSkeleton = child.skeleton;
            }
          });
          if (sharedSkeleton) break;
        }
        if (sharedSkeleton) break;
      }
      if (sharedSkeleton) (sharedSkeleton as THREE.Skeleton).update();
    }
  }

  // ── 4. 服 SkinnedMesh ごとにベイク＋押し出し ─────────────────────────────
  loadedAssets.forEach((modelArray) => {
    modelArray.forEach((assetGroup) => {
      assetGroup.traverse((child) => {
        if (!(child instanceof THREE.SkinnedMesh)) return;

        const source = child as THREE.SkinnedMesh;
        source.skeleton.update();
        source.updateMatrixWorld(true);

        source.visible = false;
        const bakedMesh = getOrCreateBakedMesh(source);

        bakedMesh.position.copy(source.position);
        bakedMesh.rotation.copy(source.rotation);
        
        const initScale = (source.userData[INITIAL_SCALE_KEY] as THREE.Vector3 | undefined)
          ?? source.scale.clone();
        if (!source.userData[INITIAL_SCALE_KEY]) {
          source.userData[INITIAL_SCALE_KEY] = initScale.clone();
        }
        bakedMesh.scale.copy(initScale);
        bakedMesh.updateMatrixWorld(true);

        refreshBakedGeometry(source, bakedMesh);

        // collision は BodySurface か Capsule[] のどちらか
        resolveBodyCollisionOnBakedMesh(
          bakedMesh,
          collision as BodySurface | Capsule[],
          iters,
          margin
        );

        bakedMesh.visible = true;
      });
    });
  });

  // ── 5. 退避したボーン/スケールを復元 ──────────────────────────────────────
  if (boneScaleBackup.size > 0) {
    for (const [bone, scale] of boneScaleBackup.entries()) bone.scale.copy(scale);
    if (sharedSkeleton) (sharedSkeleton as THREE.Skeleton).update();
  }
  if (baseModel && baseModelScaleBackup) {
    baseModel.scale.copy(baseModelScaleBackup);
    baseModel.updateMatrixWorld(true);
  }
}

/**
 * 静的フィットをリセット（ベイク済みメッシュを削除してソースを再表示）
 */
export function cleanupStaticFit(loadedAssets: Map<string, THREE.Group[]>): void {
  loadedAssets.forEach((modelArray) => {
    modelArray.forEach((assetGroup) => {
      assetGroup.traverse((child) => {
        if (!(child instanceof THREE.SkinnedMesh)) return;
        child.visible = true;
        const baked = child.userData[BAKED_MESH_KEY] as THREE.Mesh | undefined;
        if (baked) {
          baked.geometry.dispose();
          baked.parent?.remove(baked);
          delete child.userData[BAKED_MESH_KEY];
        }
      });
    });
  });
}
