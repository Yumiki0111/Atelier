import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { DEFAULT_MODEL_URL, getCategoryLayerOrder } from "./layering";
import {
  calculateAndSetModelTransform,
  enableShadow,
  getModelFormat,
  setupOrbitControls,
  setupLights,
  createGround,
} from "./viewer-helpers";
import { debugLog } from "./viewer-debug";
import { loadAssetModel, applyAssetTransform, type BaseModelTransform } from "./viewer-asset-loader";

/**
 * アセット情報（着せ替え用）
 * category は ProductCategory に限定せず string で受け付ける（API互換性のため）
 */
export interface AssetInfo {
  url: string;
  category?: string;
}

/**
 * 3Dビューアの初期化オプション
 */
export interface ViewerOptions {
  glbUrl?: string;
  modelUrl?: string;
  assets?: AssetInfo[];
  textureUrl?: string;
  backgroundImageUrl?: string;
  apiBaseUrl?: string;
  targetSize?: number; // モデルのスケーリングターゲットサイズ（デフォルト: 2.6）
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 3Dビューアのインスタンス
 */
export interface ViewerInstance {
  updateGlbUrl(glbUrl: string | undefined): void;
  updateModelUrl(modelUrl: string | undefined): void;
  updateAssets(assets: AssetInfo[]): void;
  updateMorphTarget?(morphTargetName: string, value: number): void;
  updateHeight?(height: number, baseHeight?: number): void;
  toggleAsset?(category: string, visible?: boolean): void; // アセットの表示/非表示を切り替え
  destroy(): void;
}

/**
 * 3Dビューアの初期化
 */
export function init3DViewer(
  container: HTMLElement,
  options: ViewerOptions
): ViewerInstance {
  const { glbUrl, modelUrl, assets, apiBaseUrl, targetSize = 2.6, onLoad, onError } = options;

  // 内部状態
  // 同じカテゴリーのアセットを複数表示できるように、配列で管理
  const loadedAssets = new Map<string, THREE.Group[]>();
  let baseModel: THREE.Group | null = null; // ベースモデル（人型モデル）
  let isBaseModelLoaded = false;

  // ベースモデルのトランスフォーム（アセットを配置する際に使用）
  let baseModelTransform: BaseModelTransform | null = null;
  
  // ベースモデルの読み込み完了を待つためのPromise
  let baseModelLoadPromise: Promise<void> | null = null;

  // モーフターゲット管理
  const morphTargetMeshes: THREE.Mesh[] = [];
  let baseHeight: number = 1.0; // ベースの身長（メートル単位）
  let currentHeight: number | null = null; // 現在の身長（センチメートル単位、nullの場合は初期身長）
  let currentBaseHeight: number | null = null; // 現在の基準身長（センチメートル単位）
  let baseModelInitialScale: THREE.Vector3 | null = null; // ベースモデルの初期スケール
  let baseModelInitialPosition: THREE.Vector3 | null = null; // ベースモデルの初期位置
  let baseModelInitialCenter: THREE.Vector3 | null = null; // ベースモデルの初期中心位置（スケール適用後）
  
  // スケルトン管理（身長変更用）
  const skeletonBones = new Map<string, THREE.Bone>(); // ボーン名 -> ボーンオブジェクト
  const boneInitialScales = new Map<THREE.Bone, THREE.Vector3>(); // ボーンの初期スケール
  const boneInitialPositions = new Map<THREE.Bone, THREE.Vector3>(); // ボーンの初期位置（子ボーンの相対位置）
  
  // アセットの初期位置を保存（身長変更時の位置調整用）
  const assetInitialPositions = new Map<THREE.Group, THREE.Vector3>();
  // アセットの初期スケールを保存（身長変更時にスケールを固定するため）
  const assetInitialScales = new Map<THREE.Group, THREE.Vector3>();
  // アセット内の子要素（Mesh/SkinnedMesh）の初期スケールを保存
  const assetChildInitialScales = new Map<THREE.Object3D, THREE.Vector3>();
  // アセットのカテゴリを保存（位置調整の基準点を決定するため）
  const assetCategories = new Map<THREE.Group, string>();
  // 初期状態でのモデルの基準点を保存（カテゴリ別）
  let baseModelInitialReferencePoints: {
    top: number; // トップス用の基準点（上半身の中心）
    bottom: number; // ボトムス用の基準点（腰の位置）
    center: number; // その他用の基準点（モデルの中心）
  } | null = null;

  // コンテナサイズ
  const getContainerSize = () => ({
    width: container.clientWidth || 800,
    height: container.clientHeight || 600,
  });
  const { width: initialWidth, height: initialHeight } = getContainerSize();

  // Scene
  const scene = new THREE.Scene();
  scene.background = null;

  // Camera
  const camera = new THREE.PerspectiveCamera(50, initialWidth / initialHeight, 0.1, 1000);
  const initialRadius = 3.5;
  camera.position.set(0, 0, initialRadius);

  // Renderer
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      precision: "highp",
    });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(initialWidth, initialHeight);
  } catch (error) {
    console.error("[Atelier Preview] Failed to create WebGL renderer:", error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return {
      updateGlbUrl: () => {},
      updateModelUrl: () => {},
      updateAssets: () => {},
      destroy: () => {},
    };
  }

  // Renderer設定
  if ('outputColorSpace' in renderer) {
    (renderer as any).outputColorSpace = 'srgb';
  } else if ('outputEncoding' in renderer && (THREE as any).sRGBEncoding !== undefined) {
    (renderer as any).outputEncoding = (THREE as any).sRGBEncoding;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.0; // より明るく、彩度を上げる
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.setClearColor(0x000000, 0);

  // Canvas設定
  const canvasElement = renderer.domElement;
  canvasElement.style.touchAction = "none";
  canvasElement.style.pointerEvents = "auto";
  canvasElement.style.position = "relative";
  canvasElement.style.zIndex = "1";
  container.appendChild(canvasElement);

  // ライト・地面
  setupLights(scene);
  const { ground, groundGeometry, groundMaterial } = createGround(scene);

  // レンダリング関数
  function render() {
    if (!scene || !camera) {
      console.warn("[Atelier Preview] Scene or camera is not initialized");
      return;
    }
    try {
      // レンダリング前に、すべての服のスケールを強制的にリセット
      // baseModelのスケール変更の影響を完全に排除
      loadedAssets.forEach((assetGroups, category) => {
        assetGroups.forEach((assetModel) => {
          const initialScale = assetInitialScales.get(assetModel);
          if (initialScale) {
            // 服のスケールを常に初期スケールに固定
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
          }
        });
      });
      
      renderer.render(scene, camera);
    } catch (error) {
      console.error("[Atelier Preview] Error rendering:", error);
    }
  }

  // カメラ制御
  const initialSpherical = new THREE.Spherical();
  initialSpherical.setFromVector3(camera.position);
  setupOrbitControls(canvasElement, camera, initialSpherical.phi, initialRadius, render);

  // ローダー
  const gltfLoader = new GLTFLoader();
  const fbxLoader = new FBXLoader();

  // ベースモデル（人型モデル）読み込み
  async function loadBaseModel(modelUrl: string): Promise<void> {
    if (isBaseModelLoaded && baseModel) return;

    try {
      const format = getModelFormat(modelUrl);
      
      // unknown形式の場合、URLにfbxが含まれているか確認してフォールバック
      let actualFormat = format;
      if (format === "unknown") {
        const lowerUrl = modelUrl.toLowerCase();
        // URLパス、クエリパラメータ、filenameパラメータをチェック
        if (lowerUrl.includes(".fbx") || 
            (lowerUrl.includes("filename") && lowerUrl.includes("fbx")) ||
            lowerUrl.includes("content-disposition") && lowerUrl.includes("fbx")) {
          actualFormat = "fbx";
          // デバッグログのみ（警告は出さない）
          console.log("[Atelier Preview] Format was unknown, but detected FBX from URL");
        } else if (lowerUrl.includes(".glb") || lowerUrl.includes(".gltf")) {
          actualFormat = "glb";
          console.log("[Atelier Preview] Format was unknown, but detected GLB/GLTF from URL");
        }
      }
      
      const loader = actualFormat === "fbx" ? fbxLoader : gltfLoader;

      console.log("[Atelier Preview] Loading base model:", { modelUrl, format: actualFormat });

      const model = await new Promise<THREE.Group>((resolve, reject) => {
        loader.load(
          modelUrl,
          (loaded: any) => {
      // まずresolvedModelを取得（GLTFの場合はsceneプロパティから取得）
      const resolvedModel = actualFormat === "fbx" ? loaded : (loaded.scene || loaded);
      
      // FBXファイル内のオブジェクトを確認（モデルと服を分離するため）
      if (actualFormat === "fbx" && resolvedModel) {
        const objectNames: string[] = [];
        const objectInfo: Array<{ name: string; type: string; children: number; size?: { x: number; y: number; z: number } }> = [];
        const clothingObjects: THREE.Object3D[] = [];
        const modelObjects: THREE.Object3D[] = [];
        
        resolvedModel.traverse((child: any) => {
          if (child.name) {
            objectNames.push(child.name);
            
            // バウンディングボックスを計算してサイズを取得
            let size: { x: number; y: number; z: number } | undefined;
            try {
              const box = new THREE.Box3().setFromObject(child);
              const boxSize = box.getSize(new THREE.Vector3());
              size = { x: boxSize.x, y: boxSize.y, z: boxSize.z };
            } catch (e) {
              // バウンディングボックス計算に失敗した場合はスキップ
            }
            
            objectInfo.push({
              name: child.name,
              type: child.constructor.name,
              children: child.children?.length || 0,
              size: size,
            });
            
            // 名前でモデルと服を区別（T-shirt, shirt, clothingなどのキーワードで判定）
            const lowerName = child.name.toLowerCase();
            if (lowerName.includes("shirt") || 
                lowerName.includes("t-shirt") || 
                lowerName.includes("clothing") || 
                lowerName.includes("cloth") ||
                lowerName.includes("top") ||
                lowerName.includes("wear")) {
              clothingObjects.push(child);
            } else {
              // モデル（体、スケルトンなど）
              modelObjects.push(child);
            }
          }
        });
        
        console.log("[Atelier Preview] FBX file contents:", {
          totalObjects: objectNames.length,
          objectNames: objectNames,
          objectInfo: objectInfo,
          rootChildren: resolvedModel.children?.length || 0,
          clothingObjects: clothingObjects.length,
          modelObjects: modelObjects.length,
          clothingNames: clothingObjects.map(obj => obj.name),
          modelNames: modelObjects.map(obj => obj.name),
        });
        
        // 服のオブジェクトを別のグループに分離
        if (clothingObjects.length > 0) {
          const clothingGroup = new THREE.Group();
          clothingGroup.name = "ClothingGroup";
          
          clothingObjects.forEach((clothingObj) => {
            // ★重要: SkinnedMeshの場合、スケルトンから分離する
            // これにより、モデルのスケール変更が服に影響しなくなる
            clothingObj.traverse((child) => {
              if (child instanceof THREE.SkinnedMesh && child.skeleton && child.skeleton.bones) {
                console.log("[Atelier Preview] Found SkinnedMesh in clothing, isolating skeleton:", {
                  meshName: child.name,
                  hasSkeleton: !!child.skeleton,
                  skeletonBones: child.skeleton.bones.length,
                });
                
                try {
                  // スケルトンを独立したスケルトンに置き換える
                  // これにより、モデルのスケルトン変形が服に影響しなくなる
                  // 現在のスケルトンの状態を保存
                  const originalSkeleton = child.skeleton;
                  const bones = originalSkeleton.bones;
                  
                  // 独立したスケルトンを作成（モデルのスケルトンとは別）
                  // ボーンの現在の状態を保持した新しいボーンを作成
                  const isolatedBones = bones.map((bone: THREE.Bone) => {
                    const isolatedBone = bone.clone();
                    // ボーンの現在の状態を保持
                    isolatedBone.position.copy(bone.position);
                    isolatedBone.quaternion.copy(bone.quaternion);
                    isolatedBone.scale.copy(bone.scale);
                    // 親子関係を維持
                    if (bone.parent) {
                      const parentIndex = bones.indexOf(bone.parent as THREE.Bone);
                      if (parentIndex >= 0 && isolatedBones[parentIndex]) {
                        isolatedBone.parent = isolatedBones[parentIndex];
                      }
                    }
                    return isolatedBone;
                  });
                  
                  // 独立したスケルトンを作成
                  const isolatedSkeleton = new THREE.Skeleton(isolatedBones);
                  
                  // スケルトンを更新して現在の状態を適用
                  isolatedSkeleton.update();
                  
                  // 新しいスケルトンをバインド
                  child.updateMatrixWorld(true);
                  child.bind(isolatedSkeleton, child.matrixWorld);
                  
                  console.log("[Atelier Preview] Isolated skeleton from clothing mesh:", {
                    meshName: child.name,
                    originalBones: originalSkeleton.bones.length,
                    isolatedBones: isolatedSkeleton.bones.length,
                  });
                } catch (error) {
                  console.warn("[Atelier Preview] Failed to isolate skeleton, keeping original:", {
                    meshName: child.name,
                    error: error instanceof Error ? error.message : String(error),
                  });
                  // エラーが発生した場合は、元のスケルトンを保持
                }
              }
            });
            
            // 元の親から削除
            if (clothingObj.parent) {
              clothingObj.parent.remove(clothingObj);
            }
            // 新しいグループに追加
            clothingGroup.add(clothingObj);
          });
          
          // 服のグループをアセットとして管理
          const clothingCategory = "トップス";
          const existing = loadedAssets.get(clothingCategory);
          if (existing) {
            existing.push(clothingGroup);
          } else {
            loadedAssets.set(clothingCategory, [clothingGroup]);
          }
          
          // 服の初期位置とスケールを保存
          assetInitialPositions.set(clothingGroup, clothingGroup.position.clone());
          assetInitialScales.set(clothingGroup, clothingGroup.scale.clone());
          assetCategories.set(clothingGroup, clothingCategory);
          
          // 服のグループ内のすべての子要素（Mesh/SkinnedMesh）の初期スケールも保存
          clothingGroup.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
              assetChildInitialScales.set(child, child.scale.clone());
            }
          });
          
          // シーンに追加
          scene.add(clothingGroup);
          
          console.log("[Atelier Preview] Separated clothing from FBX:", {
            clothingCount: clothingObjects.length,
            clothingNames: clothingObjects.map(obj => obj.name),
          });
        }
      }
      
      console.log("[Atelier Preview] Base model loaded successfully:", {
        format: actualFormat,
        type: loaded?.constructor?.name,
        children: resolvedModel?.children?.length,
        position: resolvedModel?.position ? {
          x: resolvedModel.position.x,
          y: resolvedModel.position.y,
          z: resolvedModel.position.z,
        } : "no position",
        scale: resolvedModel?.scale ? {
          x: resolvedModel.scale.x,
          y: resolvedModel.scale.y,
          z: resolvedModel.scale.z,
        } : "no scale",
        boundingBox: resolvedModel ? (() => {
          try {
            const box = new THREE.Box3().setFromObject(resolvedModel);
            return {
              min: { x: box.min.x, y: box.min.y, z: box.min.z },
              max: { x: box.max.x, y: box.max.y, z: box.max.z },
              size: { x: box.max.x - box.min.x, y: box.max.y - box.min.y, z: box.max.z - box.min.z },
              center: { x: (box.max.x + box.min.x) / 2, y: (box.max.y + box.min.y) / 2, z: (box.max.z + box.min.z) / 2 },
            };
          } catch (error) {
            console.warn("[Atelier Preview] Failed to calculate bounding box:", error);
            return "error calculating bounding box";
          }
        })() : "no resolved model",
      });
      console.log("[Atelier Preview] Resolved model:", {
        type: resolvedModel?.constructor?.name,
        children: resolvedModel?.children?.length,
        visible: resolvedModel?.visible,
        position: resolvedModel?.position ? {
          x: resolvedModel.position.x,
          y: resolvedModel.position.y,
          z: resolvedModel.position.z,
        } : "no position",
      });
      
      // 骨（スケルトン）の有無を確認
      let hasSkeleton = false;
      let skeletonCount = 0;
      let boneCount = 0;
      const skeletons: any[] = [];
      
      if (resolvedModel) {
        resolvedModel.traverse((child: any) => {
          if (child instanceof THREE.SkinnedMesh) {
            hasSkeleton = true;
            if (child.skeleton && child.skeleton.bones) {
              skeletonCount++;
              const bones = child.skeleton.bones || [];
              boneCount += bones.length;
              skeletons.push({
                meshName: child.name || "unnamed",
                boneCount: bones.length,
                boneNames: bones.slice(0, 10).map((b: any) => b.name || "unnamed"), // 最初の10個の骨の名前
              });
            }
          }
        });
      }
      
      console.log("[Atelier Preview] Skeleton information:", {
        hasSkeleton,
        skeletonCount,
        totalBoneCount: boneCount,
        skeletons: skeletons.length > 0 ? skeletons : "no skeletons found",
      });
      
      resolve(resolvedModel);
          },
          (progress) => {
            if (progress.lengthComputable && progress.total > 0) {
              const percent = (progress.loaded / progress.total) * 100;
              // 25%ごとにログを出力（大量のログを防ぐ）
              if (percent % 25 === 0 || percent === 100) {
                console.log(`[Atelier Preview] Loading progress: ${percent.toFixed(0)}%`);
              }
            }
            // lengthComputableがfalseの場合はログを出力しない（大量のログを防ぐ）
          },
          (error) => {
            console.error("[Atelier Preview] Failed to load base model:", error);
            console.error("[Atelier Preview] Model URL:", modelUrl);
            console.error("[Atelier Preview] Detected format:", actualFormat);
            console.error("[Atelier Preview] Error details:", {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              name: error instanceof Error ? error.name : undefined,
            });
            
            // ファイルが存在するか確認するための追加情報
            if (typeof window !== "undefined") {
              const absoluteUrl = modelUrl.startsWith("http") 
                ? modelUrl 
                : `${window.location.origin}${modelUrl}`;
              
              console.log("[Atelier Preview] Checking file accessibility:", {
                originalUrl: modelUrl,
                absoluteUrl: absoluteUrl,
              });
              
              fetch(absoluteUrl, { method: "HEAD" })
                .then((response) => {
                  const headers: Record<string, string> = {};
                  response.headers.forEach((value, key) => {
                    headers[key] = value;
                  });
                  
                  console.error("[Atelier Preview] File check result:", {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    contentType: response.headers.get("content-type"),
                    contentLength: response.headers.get("content-length"),
                    url: modelUrl,
                    absoluteUrl: absoluteUrl,
                    allHeaders: headers,
                  });
                  
                  if (!response.ok) {
                    console.error("[Atelier Preview] File not accessible:", {
                      status: response.status,
                      statusText: response.statusText,
                      url: absoluteUrl,
                    });
                  }
                  
                  // GETリクエストでも試してみる
                  return fetch(absoluteUrl, { method: "GET" });
                })
                .then((response) => {
                  if (response && response.ok) {
                    console.log("[Atelier Preview] File is accessible via GET:", {
                      status: response.status,
                      contentType: response.headers.get("content-type"),
                      contentLength: response.headers.get("content-length"),
                    });
                  } else if (response) {
                    console.error("[Atelier Preview] File GET failed:", {
                      status: response.status,
                      statusText: response.statusText,
                    });
                  }
                })
                .catch((fetchError) => {
                  console.error("[Atelier Preview] Failed to check file:", {
                    error: fetchError,
                    message: fetchError instanceof Error ? fetchError.message : String(fetchError),
                    stack: fetchError instanceof Error ? fetchError.stack : undefined,
                    url: absoluteUrl,
                  });
                });
            }
            
            reject(error);
          }
        );
      });

      // モデルのトランスフォームを計算して保存（アセットを配置する際に使用）
      baseModelTransform = calculateAndSetModelTransform(model, targetSize);
      console.log("[Atelier Preview] Base model transform:", {
        position: {
          x: baseModelTransform.position.x,
          y: baseModelTransform.position.y,
          z: baseModelTransform.position.z,
        },
        scale: {
          x: baseModelTransform.scale.x,
          y: baseModelTransform.scale.y,
          z: baseModelTransform.scale.z,
        },
        originalSize: {
          x: baseModelTransform.originalSize.x,
          y: baseModelTransform.originalSize.y,
          z: baseModelTransform.originalSize.z,
        },
      });
      enableShadow(model);
      baseModel = model;
      isBaseModelLoaded = true;
      
      // モーフターゲットを持つメッシュを収集
      morphTargetMeshes.length = 0;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
          morphTargetMeshes.push(child);
          console.log("[Atelier Preview] Found mesh with morph targets:", {
            name: child.name,
            morphTargetCount: child.morphTargetInfluences.length,
            morphTargetNames: child.morphTargetDictionary ? Object.keys(child.morphTargetDictionary) : [],
          });
        }
      });
      
      // スケルトンのボーンを収集（身長変更用）
      // 全ボーンを収集して初期位置を保存する（位置調整で身長を変更するため）
      skeletonBones.clear();
      boneInitialScales.clear();
      boneInitialPositions.clear();
      
      model.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh && child.skeleton && child.skeleton.bones) {
          const bones = child.skeleton.bones;
          console.log("[Atelier Preview] Found skeleton with bones:", {
            meshName: child.name,
            boneCount: bones.length,
            boneNames: bones.map((b: THREE.Bone) => b.name),
          });
          
          // 全ボーンの初期位置を保存（重複は無視）
          bones.forEach((bone: THREE.Bone) => {
            if (!skeletonBones.has(bone.name)) {
              skeletonBones.set(bone.name, bone);
              boneInitialScales.set(bone, bone.scale.clone());
              boneInitialPositions.set(bone, bone.position.clone());
            }
          });
        }
      });
      
      console.log("[Atelier Preview] Collected all bones for height adjustment:", {
        totalBones: skeletonBones.size,
        boneNames: Array.from(skeletonBones.keys()),
      });
      
      // ベースの身長を計算（スケール適用後のバウンディングボックスから、メートル単位）
      // これはスケール済みの高さなので、そのまま使う
      const box = new THREE.Box3().setFromObject(model);
      baseHeight = box.max.y - box.min.y;
      const center = box.getCenter(new THREE.Vector3());
      
      console.log("[Atelier Preview] Base height calculated:", {
        baseHeight,
        modelScale: { x: model.scale.x, y: model.scale.y, z: model.scale.z },
        boxSize: { x: box.max.x - box.min.x, y: box.max.y - box.min.y, z: box.max.z - box.min.z },
        center: { x: center.x, y: center.y, z: center.z },
      });
      
      // 初期スケール、位置、中心を保存（スケール適用後）
      baseModelInitialScale = model.scale.clone();
      baseModelInitialPosition = model.position.clone();
      baseModelInitialCenter = center.clone();
      
      // 初期状態での基準点を計算（カテゴリ別の位置調整用）
      const modelHeight = box.max.y - box.min.y;
      baseModelInitialReferencePoints = {
        top: box.min.y + modelHeight * 0.82, // トップス用：肩の位置（頭から腰までの82%の位置、肩の高さ）
        bottom: box.min.y + modelHeight * 0.45, // ボトムス用：腰の位置（45%の位置）
        center: center.y, // その他用：モデルの中心
      };
      
      console.log("[Atelier Preview] Initial reference points:", {
        top: baseModelInitialReferencePoints.top,
        bottom: baseModelInitialReferencePoints.bottom,
        center: baseModelInitialReferencePoints.center,
        modelHeight,
        boxMin: box.min.y,
        boxMax: box.max.y,
      });
      
      scene.add(baseModel);

      if (camera) {
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      }

      setTimeout(() => {
        render();
        setTimeout(() => render(), 100);
      }, 50);
    } catch (error) {
      console.error("[Atelier Preview] Error loading base model:", error);
      throw error;
    }
  }

  // アセット読み込み
  async function loadAsset(url: string, category?: string): Promise<void> {
    if (!baseModelTransform) {
      throw new Error("Base model transform is not set. Base model must be loaded before assets.");
    }

    try {
      const model = await loadAssetModel(
        url,
        category,
        gltfLoader,
        fbxLoader,
        baseModelTransform,
        isBaseModelLoaded,
        baseModelLoadPromise
      );

      applyAssetTransform(model, baseModelTransform);
      enableShadow(model);
      
      // アセットの初期位置とスケールを保存（身長変更時の位置調整用）
      assetInitialPositions.set(model, model.position.clone());
      assetInitialScales.set(model, model.scale.clone());
      
      // アセット内のすべての子要素（Mesh/SkinnedMesh）の初期スケールも保存
      model.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
          assetChildInitialScales.set(child, child.scale.clone());
        }
      });
      
      // アセットのカテゴリを保存
      if (category) {
        assetCategories.set(model, category);
      }
      
      // アセットをカテゴリ別に管理
      const targetCategory = category || "default";
      const existing = loadedAssets.get(targetCategory);
      if (existing) {
        existing.push(model);
      } else {
        loadedAssets.set(targetCategory, [model]);
      }
    } catch (error) {
      debugLog.error("Error loading asset:", { url, category, error });
      throw error;
    }
  }

  // シーンにアセットを追加（カテゴリー順）
  function updateSceneWithAssets() {
    debugLog.log("updateSceneWithAssets called", {
      categories: Array.from(loadedAssets.keys()),
      totalAssets: Array.from(loadedAssets.values()).reduce((sum, arr) => sum + arr.length, 0)
    });
    
    // アセットを一度削除
    loadedAssets.forEach((modelArray) => {
      modelArray.forEach((model) => {
        if (scene.children.includes(model)) {
          scene.remove(model);
        }
      });
    });

    // カテゴリー順にソート
    const sortedAssets = Array.from(loadedAssets.entries()).sort((a, b) => {
      const orderA = a[0] ? getCategoryLayerOrder(a[0]) : 999;
      const orderB = b[0] ? getCategoryLayerOrder(b[0]) : 999;
      return orderA - orderB;
    });

    // アセットをシーンに追加（カテゴリー順、同じカテゴリーのアセットをすべて追加）
    sortedAssets.forEach(([_category, modelArray]) => {
      modelArray.forEach((model) => {
        if (!scene.children.includes(model)) {
          scene.add(model);
          debugLog.log("Asset added to scene:", { category: _category });
        }
      });
    });
    
    // ベースモデルがシーンに追加されていることを確認
    if (baseModel && !scene.children.includes(baseModel)) {
      scene.add(baseModel);
    }

    if (camera) {
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }

    setTimeout(() => {
      render();
      setTimeout(() => render(), 100);
    }, 50);
  }

  // 初期読み込み
  // アセットがある場合は、ベースモデルを読み込んでからアセットを読み込む
  const baseModelUrl = modelUrl || glbUrl || (apiBaseUrl ? `${apiBaseUrl}${DEFAULT_MODEL_URL}` : DEFAULT_MODEL_URL);

  if (assets && assets.length > 0) {
    // アセットがある場合：ベースモデルを読み込んでからアセットを読み込む
    // カテゴリー順にソート（スコープ外でも参照できるように外側で定義）
    const sortedAssets = [...assets].sort((a, b) => {
      const orderA = a.category ? getCategoryLayerOrder(a.category) : 999;
      const orderB = b.category ? getCategoryLayerOrder(b.category) : 999;
      return orderA - orderB;
    });

    baseModelLoadPromise = loadBaseModel(baseModelUrl)
      .then(() => {
        // アセットを並列で読み込む（エラーが発生しても他のアセットは読み込む）
        debugLog.log("Loading assets:", sortedAssets.length);
        const loadPromises = sortedAssets.map((asset) => 
          loadAsset(asset.url, asset.category).catch((error) => {
            debugLog.error("Failed to load asset:", { url: asset.url, category: asset.category, error });
            return null;
          })
        );

        return Promise.all(loadPromises);
      })
      .then((results) => {
        // すべてのアセットが読み込まれた後にシーンを更新
        const loadedCount = results.filter(r => r !== null).length;
        debugLog.log("Assets loaded:", { total: sortedAssets.length, loaded: loadedCount, failed: sortedAssets.length - loadedCount });
        updateSceneWithAssets();
        onLoad?.();
      })
      .catch((error) => {
        console.error("[Atelier Preview] Error loading base model or assets:", error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      });
  } else {
    // アセットがない場合：ベースモデルのみ読み込む
    baseModelLoadPromise = loadBaseModel(baseModelUrl)
      .then(() => {
        onLoad?.();
      })
      .catch((error) => {
        console.error("[Atelier Preview] Error loading base model:", error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      });
  }

  // 初期レンダリング
  setTimeout(() => render(), 100);

  // リサイズ対応
  const resizeObserver = new ResizeObserver(() => {
    const { width, height } = getContainerSize();
    if (width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      render();
    }
  });
  resizeObserver.observe(container);

  /** ベースモデルのURLを更新する共通処理 */
  function updateBaseModelUrl(url: string | undefined) {
    if (url) {
      baseModelLoadPromise = loadBaseModel(url).catch((error) => {
        console.error("[Atelier Preview] Error updating model URL:", error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }

  /** モーフターゲットを適用する関数 */
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

  /** 身長を変更する関数（モーフターゲットまたはスケールで実装） */
  function applyHeightChange(newHeight: number, baseHeightValue?: number) {
    if (!baseModel || !baseModelInitialScale || !baseModelInitialPosition) {
      console.warn("[Atelier Preview] Base model not ready for height change");
      return;
    }

    // newHeightはセンチメートル単位
    // baseHeightValueが指定されている場合はセンチメートル単位と仮定
    // baseHeightValueが指定されていない場合は、baseHeight（スケール適用後のメートル単位）から推定
    let targetBaseHeightCm: number;
    if (baseHeightValue !== undefined && baseHeightValue > 0) {
      // baseHeightValueがセンチメートル単位で渡されている場合
      targetBaseHeightCm = baseHeightValue;
    } else {
      // baseHeightはスケール適用後のメートル単位なので、センチメートルに変換
      // ただし、これはスケール済みの高さなので、実際のモデルの高さを推定する必要がある
      // 仮に170cm（1.7m）を基準として使用
      targetBaseHeightCm = 170; // デフォルト値
      
      console.warn("[Atelier Preview] baseHeightValue not provided, using default:", targetBaseHeightCm);
    }
    
    // 現在の身長を保存（アセット読み込み時に使用）
    currentHeight = newHeight;
    currentBaseHeight = targetBaseHeightCm;
    
    if (targetBaseHeightCm <= 0) {
      console.warn("[Atelier Preview] Invalid base height:", targetBaseHeightCm);
      return;
    }

    const heightRatio = newHeight / targetBaseHeightCm;
    console.log("[Atelier Preview] Height change:", {
      newHeight,
      targetBaseHeightCm,
      heightRatio,
      baseHeight,
      baseHeightValue,
      currentScale: { x: baseModel.scale.x, y: baseModel.scale.y, z: baseModel.scale.z },
      initialScale: { x: baseModelInitialScale.x, y: baseModelInitialScale.y, z: baseModelInitialScale.z },
    });
    
    // モーフターゲットで身長を変更する場合
    // まず、身長に関連するモーフターゲットを探す
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

    // モーフターゲットが見つからない場合は、Y軸のスケールのみで対応（身長変更）
    if (!morphApplied) {
      // 初期スケールに基づいて新しいスケールを計算（累積を防ぐ）
      // Y軸（高さ）のみを変更し、X軸とZ軸は初期スケールを維持
      const newScaleY = baseModelInitialScale.y * heightRatio;
      const newScaleX = baseModelInitialScale.x; // X軸は変更しない
      const newScaleZ = baseModelInitialScale.z; // Z軸は変更しない
      
      baseModel.scale.set(newScaleX, newScaleY, newScaleZ);
      
      console.log("[Atelier Preview] Applied scale change:", {
        newScale: { x: newScaleX, y: newScaleY, z: newScaleZ },
        heightRatio,
      });
      
      // 位置を調整（モデルの足元を基準にスケール）
      // スケール変更により中心位置が変わるため、それを補正してモデルが上に動かないようにする
      if (baseModelInitialCenter) {
        const box = new THREE.Box3().setFromObject(baseModel);
        const newCenter = box.getCenter(new THREE.Vector3());
        
        // 中心の移動量を計算（スケール変更により中心が移動する）
        const centerOffsetY = newCenter.y - baseModelInitialCenter.y;
        
        // 初期位置から中心の移動量を引いて、モデルが上に動かないようにする
        baseModel.position.y = baseModelInitialPosition.y - centerOffsetY;
        
        console.log("[Atelier Preview] Position adjusted:", {
          initialPosition: { y: baseModelInitialPosition.y },
          newPosition: { y: baseModel.position.y },
          centerOffsetY,
          initialCenter: { y: baseModelInitialCenter.y },
          newCenter: { y: newCenter.y },
        });
      }
    }

    // 服の位置を調整（拡大縮小せず、位置のみ変更）
    // モデルの現在のバウンディングボックスを取得
    const currentBox = new THREE.Box3().setFromObject(baseModel);
    const currentModelHeight = currentBox.max.y - currentBox.min.y;
    
    // 現在の基準点を計算（カテゴリ別）
    const currentReferencePoints = {
      top: currentBox.min.y + currentModelHeight * 0.82, // トップス用：肩の位置（頭から腰までの82%の位置）
      bottom: currentBox.min.y + currentModelHeight * 0.45, // ボトムス用：腰の位置
      center: currentBox.getCenter(new THREE.Vector3()).y, // その他用：モデルの中心
    };
    
    loadedAssets.forEach((modelArray, category) => {
      modelArray.forEach((assetModel) => {
        // 初期位置とスケールを取得
        const initialPosition = assetInitialPositions.get(assetModel);
        const initialScale = assetInitialScales.get(assetModel);
        if (!initialPosition || !baseModelInitialReferencePoints) {
          return;
        }
        
        // nullチェック後の型を確定させるため、ローカル変数に再代入
        const initialRefPoints = baseModelInitialReferencePoints;
        
        // 服のスケールを初期スケールに完全に固定（拡大縮小させない）
        // ★重要: baseModelのスケール変更（heightRatio）の影響を完全に排除
        // 服のサイズは常に初期スケールを維持し、baseModelのスケール変更とは独立
        // ★さらに重要: ワールドマトリックスを無視して、ローカルスケールを強制的にリセット
        if (initialScale) {
          // 服のスケールを常に初期スケールに固定（X、Y、Zすべて）
          // ワールドマトリックスの影響を受けないように、直接ローカルスケールを設定
          assetModel.scale.copy(initialScale);
          
          // グループ内のすべての子要素のスケールも初期値に完全にリセット
          assetModel.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
              const childInitialScale = assetChildInitialScales.get(child);
              if (childInitialScale) {
                // 子要素のスケールを初期値に完全にリセット（X、Y、Zすべて）
                child.scale.copy(childInitialScale);
              }
            }
          });
          
          // マトリックスを更新してスケール変更を反映
          assetModel.updateMatrixWorld(true);
          
          // デバッグログ（最初の数回のみ）
          if (Math.random() < 0.1) {
            console.log("[Atelier Preview] Asset scale fixed:", {
              category,
              initialScale: { x: initialScale.x, y: initialScale.y, z: initialScale.z },
              currentScale: { x: assetModel.scale.x, y: assetModel.scale.y, z: assetModel.scale.z },
              heightRatio,
            });
          }
        }
        
        // カテゴリに応じて基準点を決定
        const categoryLower = (category || "").toLowerCase();
        let referencePointType: "top" | "bottom" | "center";
        let initialReferenceY: number;
        let currentReferenceY: number;
        
        if (
          categoryLower.includes("トップス") ||
          categoryLower.includes("シャツ") ||
          categoryLower.includes("tシャツ") ||
          categoryLower.includes("t-shirt") ||
          categoryLower.includes("shirt") ||
          categoryLower.includes("コート") ||
          categoryLower.includes("coat") ||
          categoryLower.includes("ジャケット") ||
          categoryLower.includes("jacket")
        ) {
          // トップス系：上半身の中心を基準
          referencePointType = "top";
          initialReferenceY = initialRefPoints.top;
          currentReferenceY = currentReferencePoints.top;
        } else if (
          categoryLower.includes("ボトムス") ||
          categoryLower.includes("パンツ") ||
          categoryLower.includes("pants") ||
          categoryLower.includes("trouser") ||
          categoryLower.includes("スカート") ||
          categoryLower.includes("skirt")
        ) {
          // ボトムス系：腰の位置を基準
          referencePointType = "bottom";
          initialReferenceY = initialRefPoints.bottom;
          currentReferenceY = currentReferencePoints.bottom;
        } else {
          // その他：モデルの中心を基準
          referencePointType = "center";
          initialReferenceY = initialRefPoints.center;
          currentReferenceY = currentReferencePoints.center;
        }
        
        // 基準点の移動量を計算
        const referencePointOffset = currentReferenceY - initialReferenceY;
        
        // 服の位置を調整（基準点の移動に追従）
        assetModel.position.set(
          initialPosition.x,
          initialPosition.y + referencePointOffset,
          initialPosition.z
        );
        
        console.log("[Atelier Preview] Asset position adjusted:", {
          category,
          referencePointType,
          initialPosition: { y: initialPosition.y },
          newPosition: { y: assetModel.position.y },
          initialScale: initialScale ? { x: initialScale.x, y: initialScale.y, z: initialScale.z } : null,
          currentScale: { x: assetModel.scale.x, y: assetModel.scale.y, z: assetModel.scale.z },
          referencePointOffset,
          initialReferenceY,
          currentReferenceY,
        });
      });
    });

    render();
  }

  /** アセットの位置だけを現在の身長に合わせて調整（モデルの身長は変更しない） */
  function adjustAssetPositionsForHeight(newHeight: number, baseHeightValue: number) {
    if (!baseModel || !baseModelInitialScale || !baseModelInitialPosition || !baseModelInitialCenter || !baseModelInitialReferencePoints) {
      return;
    }

    // nullチェック後の型を確定させるため、ローカル変数に再代入
    const initialRefPoints = baseModelInitialReferencePoints;

    // モデルの現在のバウンディングボックスを取得
    const currentBox = new THREE.Box3().setFromObject(baseModel);
    const currentModelHeight = currentBox.max.y - currentBox.min.y;
    
    // 現在の基準点を計算（カテゴリ別）
    const currentReferencePoints = {
      top: currentBox.min.y + currentModelHeight * 0.82, // トップス用：肩の位置（頭から腰までの82%の位置）
      bottom: currentBox.min.y + currentModelHeight * 0.45, // ボトムス用：腰の位置
      center: currentBox.getCenter(new THREE.Vector3()).y, // その他用：モデルの中心
    };
    
    loadedAssets.forEach((modelArray, category) => {
      modelArray.forEach((assetModel) => {
        // 初期位置を取得
        const initialPosition = assetInitialPositions.get(assetModel);
        if (!initialPosition) return;
        
        // カテゴリに応じて基準点を決定
        const categoryLower = (category || "").toLowerCase();
        let initialReferenceY: number;
        let currentReferenceY: number;
        
        if (
          categoryLower.includes("トップス") ||
          categoryLower.includes("シャツ") ||
          categoryLower.includes("tシャツ") ||
          categoryLower.includes("t-shirt") ||
          categoryLower.includes("shirt") ||
          categoryLower.includes("コート") ||
          categoryLower.includes("coat") ||
          categoryLower.includes("ジャケット") ||
          categoryLower.includes("jacket")
        ) {
          // トップス系：上半身の中心を基準
          initialReferenceY = initialRefPoints.top;
          currentReferenceY = currentReferencePoints.top;
        } else if (
          categoryLower.includes("ボトムス") ||
          categoryLower.includes("パンツ") ||
          categoryLower.includes("pants") ||
          categoryLower.includes("trouser") ||
          categoryLower.includes("スカート") ||
          categoryLower.includes("skirt")
        ) {
          // ボトムス系：腰の位置を基準
          initialReferenceY = initialRefPoints.bottom;
          currentReferenceY = currentReferencePoints.bottom;
        } else {
          // その他：モデルの中心を基準
          initialReferenceY = initialRefPoints.center;
          currentReferenceY = currentReferencePoints.center;
        }
        
        // 基準点の移動量を計算
        const referencePointOffset = currentReferenceY - initialReferenceY;
        
        // 服の位置を調整（基準点の移動に追従）
        assetModel.position.set(
          initialPosition.x,
          initialPosition.y + referencePointOffset,
          initialPosition.z
        );
      });
    });
    
    render();
  }

  // Public API
  return {
    updateGlbUrl(newGlbUrl: string | undefined) {
      updateBaseModelUrl(newGlbUrl);
    },
    updateModelUrl(newModelUrl: string | undefined) {
      updateBaseModelUrl(newModelUrl);
    },
    updateMorphTarget(morphTargetName: string, value: number) {
      applyMorphTarget(morphTargetName, value);
    },
    updateHeight(newHeight: number, baseHeightValue?: number) {
      applyHeightChange(newHeight, baseHeightValue);
    },
    toggleAsset(category: string, visible?: boolean) {
      const modelArray = loadedAssets.get(category);
      if (!modelArray) {
        console.warn("[Atelier Preview] Asset category not found:", category);
        return;
      }
      
      modelArray.forEach((assetModel) => {
        // visibleが指定されている場合はその値を使用、指定されていない場合は現在の状態を反転
        if (visible !== undefined) {
          assetModel.visible = visible;
        } else {
          assetModel.visible = !assetModel.visible;
        }
      });
      
      render();
      
      console.log("[Atelier Preview] Asset visibility toggled:", {
        category,
        visible: modelArray[0]?.visible,
        assetCount: modelArray.length,
      });
    },
    updateAssets(newAssets: AssetInfo[]) {
      // 既存のアセットを削除
      loadedAssets.forEach((modelArray) => {
        modelArray.forEach((model) => {
          if (scene.children.includes(model)) {
            scene.remove(model);
          }
          // アセット情報をクリア
          assetInitialPositions.delete(model);
          assetInitialScales.delete(model);
          assetCategories.delete(model);
        });
      });
      loadedAssets.clear();

      // 新しいアセットを読み込む
      if (newAssets && newAssets.length > 0) {
        // ベースモデルが読み込まれるまで待つ、または読み込まれていない場合は読み込む
        const loadAssets = async () => {
          // ベースモデルがまだ読み込まれていない場合は読み込む
          if (!isBaseModelLoaded || !baseModelTransform) {
            const baseModelUrl = modelUrl || glbUrl || (apiBaseUrl ? `${apiBaseUrl}${DEFAULT_MODEL_URL}` : DEFAULT_MODEL_URL);
            if (baseModelLoadPromise) {
              await baseModelLoadPromise;
            } else {
              baseModelLoadPromise = loadBaseModel(baseModelUrl);
              await baseModelLoadPromise;
            }
          } else if (baseModelLoadPromise) {
            await baseModelLoadPromise;
          }

          // ベースモデルのトランスフォームが設定されていることを確認
          if (!baseModelTransform) {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (!baseModelTransform) {
              throw new Error("Base model transform is not set. Cannot load assets.");
            }
          }

          // カテゴリー順にソート
          const sortedAssets = [...newAssets].sort((a, b) => {
            const orderA = a.category ? getCategoryLayerOrder(a.category) : 999;
            const orderB = b.category ? getCategoryLayerOrder(b.category) : 999;
            return orderA - orderB;
          });

          // アセットを並列で読み込む（エラーが発生しても他のアセットは読み込む）
          const loadPromises = sortedAssets.map((asset) =>
            loadAsset(asset.url, asset.category).catch((error) => {
              console.error("[Atelier Preview] Failed to load asset:", { url: asset.url, category: asset.category });
              return null;
            })
          );

          await Promise.all(loadPromises);

          // すべてのアセットが読み込まれた後にシーンを更新
          updateSceneWithAssets();
          
          // 現在の身長が設定されている場合、アセットの位置を現在の身長に合わせて調整
          if (currentHeight !== null && currentBaseHeight !== null && baseModel) {
            console.log("[Atelier Preview] Adjusting asset positions for current height:", {
              currentHeight,
              currentBaseHeight
            });
            // アセットの位置だけを調整（モデルの身長は変更しない）
            adjustAssetPositionsForHeight(currentHeight, currentBaseHeight);
          }
        };

        loadAssets().catch((error) => {
          console.error("[Atelier Preview] Error updating assets:", error);
          onError?.(error instanceof Error ? error : new Error(String(error)));
        });
      } else {
        render();
      }
    },
    destroy() {
      resizeObserver.disconnect();

      /** Object3D 以下の全 Geometry / Material を再帰的に dispose する */
      const disposeObject = (obj: THREE.Object3D) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
      };

      // アセットを削除 & dispose
      loadedAssets.forEach((modelArray) => {
        modelArray.forEach((model) => {
          if (scene.children.includes(model)) {
            scene.remove(model);
          }
          disposeObject(model);
          // アセット情報をクリア
          assetInitialPositions.delete(model);
          assetInitialScales.delete(model);
          assetCategories.delete(model);
        });
      });
      loadedAssets.clear();
      
      // ベースモデルを削除 & dispose
      if (baseModel) {
        if (scene.children.includes(baseModel)) {
          scene.remove(baseModel);
        }
        disposeObject(baseModel);
      }
      
      // 地面を削除
      scene.remove(ground);
      groundGeometry.dispose();
      groundMaterial.dispose();

      // レンダラーを削除
      try {
        if (renderer.domElement && renderer.domElement.isConnected) {
          renderer.domElement.remove();
        } else if (renderer.domElement && renderer.domElement.parentNode) {
          try { renderer.domElement.remove(); } catch { /* ignore */ }
        }
      } catch (error) {
        try {
          (renderer.domElement as HTMLElement).style.display = "none";
        } catch {
          console.warn("[Atelier Preview] Could not hide renderer element");
        }
      }
      renderer.dispose();
    },
  };
}
