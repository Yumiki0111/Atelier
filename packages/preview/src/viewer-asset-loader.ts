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
  
  // unknown形式の場合、URLから形式を判定
  let actualFormat = format;
  if (format === "unknown") {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes(".fbx")) {
      actualFormat = "fbx";
      debugLog.log("Format was unknown, but detected FBX from URL");
    } else if (lowerUrl.includes(".glb") || lowerUrl.includes(".gltf")) {
      actualFormat = "glb";
      debugLog.log("Format was unknown, but detected GLB/GLTF from URL");
    }
  }
  
  const loader = actualFormat === "fbx" ? fbxLoader : gltfLoader;
  debugLog.log("Starting to load asset model:", { url, format: actualFormat, category });
  
  const model = await new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      url,
      (loaded: any) => {
        const resolvedModel = actualFormat === "fbx" ? loaded : (loaded.scene || loaded);
        
        // FBXファイル内のオブジェクトを確認（モデルと服を分離するため）
        if (actualFormat === "fbx" && resolvedModel) {
          const objectNames: string[] = [];
          const objectInfo: Array<{ name: string; type: string; children: number; meshCount: number }> = [];
          
          resolvedModel.traverse((child: any) => {
            if (child.name) {
              objectNames.push(child.name);
              let meshCount = 0;
              if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
                meshCount = 1;
              }
              child.traverse((descendant: any) => {
                if (descendant instanceof THREE.Mesh || descendant instanceof THREE.SkinnedMesh) {
                  meshCount++;
                }
              });
              
              objectInfo.push({
                name: child.name,
                type: child.constructor.name,
                children: child.children?.length || 0,
                meshCount: meshCount,
              });
            }
          });
          
          debugLog.log("FBX file contents:", {
            url,
            category,
            totalObjects: objectNames.length,
            objectNames: objectNames,
            objectInfo: objectInfo,
            rootChildren: resolvedModel.children?.length || 0,
          });
        }
        
        debugLog.log("Asset model loaded successfully:", { url, category, format: actualFormat });
        resolve(resolvedModel);
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

  debugLog.log("Asset transform calculation:", {
    assetSize: { x: assetSize.x, y: assetSize.y, z: assetSize.z },
    assetMaxDim,
    baseOriginalSize: {
      x: baseModelTransform.originalSize.x,
      y: baseModelTransform.originalSize.y,
      z: baseModelTransform.originalSize.z,
    },
    baseMaxDim,
    baseScale: {
      x: baseModelTransform.scale.x,
      y: baseModelTransform.scale.y,
      z: baseModelTransform.scale.z,
    },
  });

  // アセットのスケーリング計算
  // Blenderで同じ位置に配置されている場合、アセットはベースモデルと同じスケールで表示されるべき
  // ただし、元のサイズが大きく異なる場合（単位が異なる場合、例：cm vs m）は補正が必要
  
  let assetScale: number;
  
  if (baseMaxDim > 0 && assetMaxDim > 0) {
    const ratio = assetMaxDim / baseMaxDim;
    debugLog.log("Size ratio calculation:", { ratio, assetMaxDim, baseMaxDim });
    
    // 比率が非常に大きく異なる場合（100倍以上または1/100以下）は単位が異なる可能性がある
    // その場合は単位変換を適用
    if (ratio > 100 || ratio < 0.01) {
      const logRatio = Math.log10(ratio);
      const unitCorrection = 1 / Math.pow(10, Math.round(logRatio));
      assetScale = unitCorrection * baseModelTransform.scale.x;
      debugLog.log("Unit correction applied:", { logRatio, unitCorrection, assetScale });
    } else {
      // 単位が同じ場合（Blenderで同じスケールで配置されている場合）
      // 元サイズが異なっても、ベースモデルと同じスケールを適用する
      // これにより、Blenderで同じスケールで配置されたアセットが正しく表示される
      assetScale = baseModelTransform.scale.x;
      debugLog.log("Using base model scale for asset:", { 
        assetScale, 
        ratio, 
        baseMaxDim, 
        assetMaxDim,
        baseScale: baseModelTransform.scale.x 
      });
    }
  } else {
    // フォールバック：ベースモデルと同じスケールを適用
    assetScale = baseModelTransform.scale.x;
    debugLog.log("Using base model scale as fallback:", { assetScale });
  }

  // トランスフォームの適用
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(assetScale, assetScale, assetScale);

  model.position.copy(baseModelTransform.position);
  model.rotation.copy(baseModelTransform.rotation);
  
  debugLog.log("Asset transform applied:", { 
    position: { x: model.position.x, y: model.position.y, z: model.position.z },
    scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z },
    assetScale,
    baseScaleFactor: baseModelTransform.scale.x,
    baseMaxDim,
    assetMaxDim,
  });
}
