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
  destroy(): void;
}

/**
 * 3Dビューアの初期化
 */
export function init3DViewer(
  container: HTMLElement,
  options: ViewerOptions
): ViewerInstance {
  const { glbUrl, modelUrl, assets, apiBaseUrl, onLoad, onError } = options;

  // 内部状態
  // 同じカテゴリーのアセットを複数表示できるように、配列で管理
  const loadedAssets = new Map<string, THREE.Group[]>();
  let baseModel: THREE.Group | null = null; // ベースモデル（人型モデル）
  let isBaseModelLoaded = false;

  // ベースモデルのトランスフォーム（アセットを配置する際に使用）
  let baseModelTransform: BaseModelTransform | null = null;
  
  // ベースモデルの読み込み完了を待つためのPromise
  let baseModelLoadPromise: Promise<void> | null = null;

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
  renderer.toneMappingExposure = 1.5;
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
      const loader = format === "fbx" ? fbxLoader : gltfLoader;

      const model = await new Promise<THREE.Group>((resolve, reject) => {
        loader.load(
          modelUrl,
          (loaded: any) => resolve(format === "fbx" ? loaded : (loaded.scene || loaded)),
          undefined,
          (error) => {
            console.error("[Atelier Preview] Failed to load base model:", error);
            reject(error);
          }
        );
      });

      // モデルのトランスフォームを計算して保存（アセットを配置する際に使用）
      baseModelTransform = calculateAndSetModelTransform(model, 2.4);
      enableShadow(model);
      baseModel = model;
      isBaseModelLoaded = true;
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

  // Public API
  return {
    updateGlbUrl(newGlbUrl: string | undefined) {
      updateBaseModelUrl(newGlbUrl);
    },
    updateModelUrl(newModelUrl: string | undefined) {
      updateBaseModelUrl(newModelUrl);
    },
    updateAssets(newAssets: AssetInfo[]) {
      // 既存のアセットを削除
      loadedAssets.forEach((modelArray) => {
        modelArray.forEach((model) => {
          if (scene.children.includes(model)) {
            scene.remove(model);
          }
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
