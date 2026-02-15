/**
 * アセット読み込み処理を分離
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { getModelFormat } from "./viewer-helpers";
import { debugLog } from "./viewer-debug";

export interface BaseModelTransform {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  originalSize: THREE.Vector3;
  originalCenter: THREE.Vector3;
}

/**
 * アセットモデルを読み込む
 */
export async function loadAssetModel(
  url: string,
  category: string | undefined,
  gltfLoader: GLTFLoader,
  fbxLoader: FBXLoader,
  baseModelTransform: BaseModelTransform | null,
  isBaseModelLoaded: boolean,
  baseModelLoadPromise: Promise<void> | null
): Promise<THREE.Group> {
  debugLog.log("loadAsset called:", { url, category, baseModelLoaded: isBaseModelLoaded, hasBaseModelTransform: !!baseModelTransform });
  
  // ベースモデルが読み込まれるまで待つ（既に読み込まれている場合はスキップ）
  if (baseModelLoadPromise && !isBaseModelLoaded) {
    debugLog.log("Waiting for base model load promise...");
    await baseModelLoadPromise;
    debugLog.log("Base model load promise resolved");
  } else if (isBaseModelLoaded) {
    debugLog.log("Base model already loaded, skipping promise wait");
  }

  // ベースモデルのトランスフォームが設定されていない場合はエラー
  if (!baseModelTransform) {
    debugLog.error("Base model transform not set");
    throw new Error("Base model transform is not set. Base model must be loaded before assets.");
  }

  const format = getModelFormat(url);
  const loader = format === "fbx" ? fbxLoader : gltfLoader;
  debugLog.log("Starting to load asset model:", { url, format, category });
  
  const model = await new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      url,
      (loaded: any) => {
        debugLog.log("Asset model loaded successfully:", { url, category });
        resolve(format === "fbx" ? loaded : (loaded.scene || loaded));
      },
      (progress) => {
        if (progress.lengthComputable && progress.total > 0) {
          const percent = (progress.loaded / progress.total) * 100;
          if (percent % 25 === 0 || percent === 100) {
            debugLog.log(`Asset loading progress: ${percent.toFixed(0)}%`, { url, category });
          }
        }
      },
      (error) => {
        debugLog.error("Failed to load asset:", { url, category, error });
        reject(error);
      }
    );
  });
  
  return model;
}

/**
 * アセットのトランスフォームを計算して適用
 */
export function applyAssetTransform(
  model: THREE.Group,
  baseModelTransform: BaseModelTransform
): void {
  // アセットのスケール補正を計算（ベースモデルとの座標系・単位の違いに自動対応）
  const assetBox = new THREE.Box3().setFromObject(model);
  const assetSize = assetBox.getSize(new THREE.Vector3());
  const assetMaxDim = Math.max(assetSize.x, assetSize.y, assetSize.z);
  const baseMaxDim = Math.max(
    baseModelTransform.originalSize.x,
    baseModelTransform.originalSize.y,
    baseModelTransform.originalSize.z
  );

  // 単位変換係数の計算
  let unitCorrection = 1;
  if (baseMaxDim > 0 && assetMaxDim > 0) {
    const ratio = assetMaxDim / baseMaxDim;
    if (ratio > 5 || ratio < 0.2) {
      const logRatio = Math.log10(ratio);
      unitCorrection = 1 / Math.pow(10, Math.round(logRatio));
    }
  }

  // トランスフォームの適用
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  
  const baseScaleFactor = baseModelTransform.scale.x;
  const combinedScale = unitCorrection * baseScaleFactor;
  model.scale.set(combinedScale, combinedScale, combinedScale);

  model.position.copy(baseModelTransform.position);
  model.rotation.copy(baseModelTransform.rotation);
  
  debugLog.log("Asset transform applied:", { 
    position: { x: model.position.x, y: model.position.y, z: model.position.z },
    scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z }
  });
}
