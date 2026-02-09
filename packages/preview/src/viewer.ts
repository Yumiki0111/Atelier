import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { TextureLoader } from "three";
import { DEFAULT_MODEL_URL, getCategoryLayerOrder } from "./layering";
import type { ProductCategory } from "@atelier/shared";

/**
 * アセット情報（着せ替え用）
 */
export interface AssetInfo {
  url: string;
  category?: ProductCategory;
}

/**
 * 3Dビューアの初期化オプション
 */
export interface ViewerOptions {
  glbUrl?: string; // 後方互換性のため残す
  modelUrl?: string; // GLBとFBXの両方をサポート（優先的に使用）
  assets?: AssetInfo[]; // 着せ替え用のアセットリスト（カテゴリー順にソート済み）
  textureUrl?: string;
  backgroundImageUrl?: string; // 背景画像のURL
  apiBaseUrl?: string; // APIベースURL（デフォルトモデルのURL構築に使用）
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 3Dビューアのインスタンス
 */
export interface ViewerInstance {
  updateGlbUrl(glbUrl: string | undefined): void;
  updateModelUrl(modelUrl: string | undefined): void;
  updateAssets(assets: AssetInfo[]): void; // 着せ替え用アセットを更新
  destroy(): void;
}

/**
 * 3Dビューアの初期化（PreviewPanelのModelViewerと同じ設定）
 */
export function init3DViewer(
  container: HTMLElement,
  options: ViewerOptions
): ViewerInstance {
  const { glbUrl, modelUrl, assets, textureUrl, backgroundImageUrl, apiBaseUrl, onLoad, onError } = options;
  
  // デフォルトモデルとアセットを管理
  let defaultModel: THREE.Group | null = null;
  const loadedAssets = new Map<string, THREE.Group>(); // category -> model
  let isDefaultModelLoaded = false;
  
  // 後方互換性のため、既存のmodelUrlを保持
  const currentModelUrl = modelUrl || glbUrl;

  // コンテナのサイズを取得（初期化時に0の場合はデフォルト値を使用）
  const getContainerSize = () => {
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    return { width, height };
  };

  const { width: initialWidth, height: initialHeight } = getContainerSize();

  // Scene setup（背景画像はフレームの背面に配置するため、3Dシーンでは透明にする）
  const scene = new THREE.Scene();
  // 背景画像はフレームの背面に配置するため、3Dシーンでは透明にする
  scene.background = null; // 透明

  // Camera（PreviewPanelのModelViewerと同じ: position: [0, 0, 5], fov: 50）
  const camera = new THREE.PerspectiveCamera(
    50, // fov: 50
    initialWidth / initialHeight,
    0.1,
    1000
  );
  // モデルを拡大表示するためにカメラを近づける（radius=3.5に設定）
  const initialRadius = 3.5;
  camera.position.set(0, 0, initialRadius);

  // Renderer（背景画像はフレームの背面に配置するため、常に透明）
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true, // アンチエイリアスを有効化
    alpha: true, // 常に透明（背景画像はフレームの背面に配置）
    powerPreference: "high-performance", // 高性能モード
    precision: "highp", // 高精度レンダリング
  });
  // 高解像度レンダリング（Retinaディスプレイ対応、最大3倍まで）
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3); // 最大3倍まで上げる
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(initialWidth, initialHeight);
  
  // 色の再現性を向上（sRGB色空間）
  // Three.js r152以降ではoutputColorSpaceを使用
  if ('outputColorSpace' in renderer) {
    (renderer as any).outputColorSpace = 'srgb';
  } else if ('outputEncoding' in renderer && (THREE as any).sRGBEncoding !== undefined) {
    // 古いバージョンのThree.js用（sRGBEncodingが存在する場合のみ）
    (renderer as any).outputEncoding = (THREE as any).sRGBEncoding;
  }
  // トーンマッピングを調整して彩度を向上
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5; // 露出を上げて明るく、彩度も向上
  
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ソフトシャドウ（高品質）
  renderer.shadowMap.autoUpdate = true; // シャドウマップを自動更新
  // 背景画像はフレームの背面に配置するため、常に透明
  renderer.setClearColor(0x000000, 0); // 背景を透明にする
  const canvasElement = renderer.domElement;
  canvasElement.style.touchAction = "none"; // タッチイベントを有効化
  canvasElement.style.pointerEvents = "auto"; // ポインターイベントを有効化
  canvasElement.style.position = "relative"; // 位置を相対に設定
  canvasElement.style.zIndex = "1"; // z-indexを設定してイベントが確実に動作するように
  container.appendChild(canvasElement);

  // Lights（彩度を向上させるため、ライトの強度を調整）
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // 環境光をさらに強く（彩度向上）
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2.5); // メインライトをさらに強く
  directionalLight1.position.set(10, 10, 5);
  directionalLight1.castShadow = true;
  // 影の設定（解像度を上げる）
  directionalLight1.shadow.mapSize.width = 4096; // 2048から4096に上げる（高解像度）
  directionalLight1.shadow.mapSize.height = 4096; // 2048から4096に上げる（高解像度）
  directionalLight1.shadow.camera.near = 0.5;
  directionalLight1.shadow.camera.far = 50;
  directionalLight1.shadow.camera.left = -10;
  directionalLight1.shadow.camera.right = 10;
  directionalLight1.shadow.camera.top = 10;
  directionalLight1.shadow.camera.bottom = -10;
  directionalLight1.shadow.bias = -0.0001;
  directionalLight1.shadow.radius = 4; // ソフトシャドウの半径を上げる（より滑らか）
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.2); // 補助光を強く
  directionalLight2.position.set(-10, -10, -5);
  scene.add(directionalLight2);

  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.8); // 上部ライトを強く
  directionalLight3.position.set(0, 10, 0);
  scene.add(directionalLight3);

  // OrbitControls（PreviewPanelのModelViewerと同じ制約）
  // enableZoom: false, enablePan: false
  // minPolarAngle: Math.PI / 4 (45度 - 上限), maxPolarAngle: (Math.PI * 3) / 4 (135度 - 下限)
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  const minPolarAngle = Math.PI / 4; // 45度（上方向の限界）
  const maxPolarAngle = (Math.PI * 3) / 4; // 135度（下方向の限界）
  
  // 初期のphi（上下回転）とradiusを保存して固定
  const initialSpherical = new THREE.Spherical();
  initialSpherical.setFromVector3(camera.position);
  const fixedPhi = initialSpherical.phi; // 上下回転を固定
  const fixedRadius = initialRadius; // radiusを固定（タッチ時に小さくならないように）

  // canvas要素にイベントリスナーを追加
  canvasElement.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    canvasElement.style.cursor = "grabbing";
    // レンダリング禁止
  });

  canvasElement.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    // Rotate camera around the model（z軸回転のみ許可）
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);
    // z軸回転（theta）のみ変更可能、水平方向のドラッグで回転
    spherical.theta -= deltaX * 0.01; // 横方向のドラッグでz軸回転
    // 上下回転（phi）は固定
    spherical.phi = fixedPhi; // 上下回転を固定
    // z軸方向（前後方向）の動きを制限：radiusを固定（タッチ時に小さくならないように）
    spherical.radius = fixedRadius;

    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0); // モデルの原点（中央）を見る
    
    // ドラッグ中はレンダリング
    render();

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  // mouseupイベントは後で追加（アニメーション停止処理を含む）

  canvasElement.addEventListener("mouseup", () => {
    isDragging = false;
    canvasElement.style.cursor = "grab";
    // レンダリング禁止
  });
  
  canvasElement.addEventListener("mouseleave", () => {
    isDragging = false;
    canvasElement.style.cursor = "grab";
    // レンダリング禁止
  });

  // タッチイベントも追加
  canvasElement.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      isDragging = true;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      // レンダリング禁止
    }
  });

  canvasElement.addEventListener("touchmove", (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - previousMousePosition.x;
    const deltaY = e.touches[0].clientY - previousMousePosition.y;

    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);
    // z軸回転（theta）のみ変更可能、水平方向のドラッグで回転
    spherical.theta -= deltaX * 0.01; // 横方向のドラッグでz軸回転
    // 上下回転（phi）は固定
    spherical.phi = fixedPhi; // 上下回転を固定
    // z軸方向（前後方向）の動きを制限：radiusを固定（タッチ時に小さくならないように）
    spherical.radius = fixedRadius;

    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0); // モデルの原点（中央）を見る
    
    // ドラッグ中はレンダリング
    render();

    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  });

  canvasElement.addEventListener("touchend", () => {
    isDragging = false;
    // レンダリング禁止
  });

  canvasElement.style.cursor = "grab";

  // 地面を追加（影を受けるため）
  const groundGeometry = new THREE.PlaneGeometry(20, 20);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0 // 透明だが影を受ける
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // 地面を水平にする
  ground.position.y = -3; // モデルの下に配置
  ground.receiveShadow = true;
  scene.add(ground);

  // Load model
  let currentModel: THREE.Group | null = null; // 後方互換性のため残す
  const gltfLoader = new GLTFLoader();
  const fbxLoader = new FBXLoader();
  
  // デフォルトモデルのリグ情報を保存（位置、回転、スケール）
  let defaultModelTransform: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  } | null = null;
  
  /**
   * モデルの位置、回転、スケールを計算して設定する共通関数
   * 全てのモデル（デフォルトモデル、アセット、loadModel）で同じロジックを使用
   */
  function calculateAndSetModelTransform(model: THREE.Group, targetSize: number = 2.0): {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  } {
    // 1. スケール適用前にバウンディングボックスを計算
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    
    // 2. モデルのサイズに応じてスケールを調整
    const scale = targetSize / maxSize;
    model.scale.set(scale, scale, scale);
    
    // 3. スケール適用後に再度バウンディングボックスを計算
    const boxAfterScale = new THREE.Box3().setFromObject(model);
    const centerAfterScale = boxAfterScale.getCenter(new THREE.Vector3());
    
    // 4. 回転を設定（正面を向かせる）
    model.rotation.y = 0;
    
    // 5. モデルの中心を原点に合わせる
    model.position.set(-centerAfterScale.x, -centerAfterScale.y, -centerAfterScale.z);
    
    // 6. 変換情報を返す
    return {
      position: model.position.clone(),
      rotation: model.rotation.clone(),
      scale: model.scale.clone(),
    };
  }
  
  // デフォルトモデルを読み込む関数
  async function loadDefaultModel(): Promise<void> {
    if (isDefaultModelLoaded && defaultModel) {
      return; // 既に読み込まれている場合はスキップ
    }
    
    try {
      // apiBaseUrlが提供されている場合は完全なURLを構築、そうでなければ相対パスを使用
      const defaultModelUrl = apiBaseUrl 
        ? `${apiBaseUrl}${DEFAULT_MODEL_URL}` 
        : DEFAULT_MODEL_URL;
      
      const gltf = await new Promise<THREE.Group>((resolve, reject) => {
        gltfLoader.load(
          defaultModelUrl,
          (loaded) => {
            resolve(loaded.scene);
          },
          undefined,
          (error) => {
            console.error("[Atelier Preview] Failed to load default model:", error);
            reject(error);
          }
        );
      });
      
      // 共通の位置計算関数を使用してモデルの位置、回転、スケールを設定
      defaultModelTransform = calculateAndSetModelTransform(gltf, 2.0);
      
      enableShadow(gltf);
      defaultModel = gltf;
      isDefaultModelLoaded = true;
      
      // シーンに追加
      scene.add(defaultModel);
      
      // レンダリング
      setTimeout(() => {
        render();
      }, 50);
    } catch (error) {
      console.error("[Atelier Preview] Error loading default model:", error);
      // デフォルトモデルの読み込みに失敗しても続行（後方互換性のため）
    }
  }
  
  // アセットを読み込む関数
  async function loadAsset(url: string, category?: ProductCategory): Promise<void> {
    try {
      const format = getModelFormat(url);
      
      const model = await new Promise<THREE.Group>((resolve, reject) => {
        const loader = format === "fbx" ? fbxLoader : gltfLoader;
        
        loader.load(
          url,
          (loaded: any) => {
            const modelToUse = format === "fbx" ? loaded : (loaded.scene || loaded);
            resolve(modelToUse);
          },
          undefined,
          (error) => {
            console.error("[Atelier Preview] Failed to load asset:", { url, category, error });
            reject(error);
          }
        );
      });
      
      // 既存のアセットを削除（同じカテゴリーの場合）
      if (category && loadedAssets.has(category)) {
        const existingModel = loadedAssets.get(category);
        if (existingModel) {
          scene.remove(existingModel);
        }
      }
      
      // デフォルトモデルと同じリグ情報を適用（位置、回転、スケールを完全に一致）
      if (defaultModelTransform) {
        model.position.copy(defaultModelTransform.position);
        model.rotation.copy(defaultModelTransform.rotation);
        model.scale.copy(defaultModelTransform.scale);
      } else {
        // デフォルトモデルがまだ読み込まれていない場合のフォールバック
        // バウンディングボックスを計算して、モデルの中心を原点に合わせる
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.rotation.y = 0;
        model.position.set(-center.x, -center.y, -center.z); // モデルの中心を原点に合わせる
        model.scale.set(1, 1, 1);
      }
      
      enableShadow(model);
      
      // アセットを保存
      if (category) {
        loadedAssets.set(category, model);
      }
      
      // シーンに追加（カテゴリー順に）
      updateSceneWithAssets();
    } catch (error) {
      console.error("[Atelier Preview] Error loading asset:", { url, category, error });
    }
  }
  
  // シーンにアセットを追加する関数（カテゴリー順）
  function updateSceneWithAssets() {
    // 既存のアセットを削除
    loadedAssets.forEach((model) => {
      scene.remove(model);
    });
    
    // アセットをカテゴリー順にソートして追加
    const sortedAssets = Array.from(loadedAssets.entries()).sort((a, b) => {
      const orderA = a[0] ? getCategoryLayerOrder(a[0] as ProductCategory) : 999;
      const orderB = b[0] ? getCategoryLayerOrder(b[0] as ProductCategory) : 999;
      return orderA - orderB;
    });
    
    sortedAssets.forEach(([category, model]) => {
      scene.add(model);
    });
    
    // カメラを調整（モデルの中心を見る）
    if (camera) {
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
    
    // レンダリング
    setTimeout(() => {
      render();
      setTimeout(() => {
        render();
      }, 100);
    }, 50);
  }
  
  // モデルのすべてのメッシュにcastShadowを設定し、マテリアルの色空間を設定する関数
  const enableShadow = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // マテリアルの色空間を設定（彩度向上）
        if (child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          if ('colorSpace' in material) {
            (material as any).colorSpace = 'srgb';
          } else if ('encoding' in material && (THREE as any).sRGBEncoding !== undefined) {
            // 古いバージョンのThree.js用（sRGBEncodingが存在する場合のみ）
            (material as any).encoding = (THREE as any).sRGBEncoding;
          }
        }
      }
    });
  };

  // ファイル拡張子からモデル形式を判定
  function getModelFormat(url: string): "glb" | "fbx" | "unknown" {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith(".glb") || lowerUrl.endsWith(".gltf")) {
      return "glb";
    } else if (lowerUrl.endsWith(".fbx")) {
      return "fbx";
    }
    return "unknown";
  }

  function loadModel(url: string | undefined) {
    if (currentModel) {
      scene.remove(currentModel);
      currentModel = null;
    }

    // 既存のメッセージを削除（安全な方法）
    const existingMessage = container.querySelector("[data-atelier-message]");
    if (existingMessage) {
      try {
        // remove()メソッドを使用（親子関係を確認する必要がない）
        existingMessage.remove();
      } catch (error) {
        // エラーが発生した場合は、display: noneで非表示にする
        (existingMessage as HTMLElement).style.display = "none";
      }
    }

    if (!url) {
      // URLが指定されていない場合はメッセージを表示
      const messageDiv = document.createElement("div");
      messageDiv.setAttribute("data-atelier-message", "true");
      messageDiv.textContent = "3Dモデルが設定されていません";
      messageDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #6b7280;
        font-size: 14px;
        pointer-events: none;
        z-index: 10;
      `;
      container.appendChild(messageDiv);
      return;
    }

    const format = getModelFormat(url);

    // モデル形式に応じて適切なローダーを使用
    if (format === "fbx") {
      fbxLoader.load(
        url,
        (fbx) => {
          currentModel = fbx;
          
          // 共通の位置計算関数を使用してモデルの位置、回転、スケールを設定
          calculateAndSetModelTransform(currentModel, 2.0);
          
          // 影を有効化
          enableShadow(currentModel);
          
          scene.add(currentModel);
          
          // カメラをモデルに向ける（モデルの中心を見る）
          if (camera) {
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
          }
          
          // モデル読み込み後にレンダリング（少し遅延させて確実に）
          setTimeout(() => {
            render();
          }, 50);
          
          // 成功したらメッセージを削除（安全な方法）
          const existingMessage = container.querySelector("[data-atelier-message]");
          if (existingMessage) {
            try {
              existingMessage.remove();
            } catch (error) {
              (existingMessage as HTMLElement).style.display = "none";
            }
          }
          
          onLoad?.();
        },
        undefined,
        (error) => {
          handleModelError(error, url);
        }
      );
    } else {
      // GLB/GLTFの場合はGLTFLoaderを使用
      gltfLoader.load(
        url,
        (gltf) => {
          currentModel = gltf.scene;
          
          // 共通の位置計算関数を使用してモデルの位置、回転、スケールを設定
          calculateAndSetModelTransform(currentModel, 2.0);
          
          // 影を有効化
          enableShadow(currentModel);
          
          scene.add(currentModel);
          
          // カメラをモデルに向ける（モデルの中心を見る）
          if (camera) {
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
          }
          
          // モデル読み込み後にレンダリング（少し遅延させて確実に）
          setTimeout(() => {
            render();
            // 念のため、もう一度レンダリング（確実に表示されるように）
            setTimeout(() => {
              render();
            }, 100);
          }, 50);
          
          // 成功したらメッセージを削除（安全な方法）
          const existingMessage = container.querySelector("[data-atelier-message]");
          if (existingMessage) {
            try {
              existingMessage.remove();
            } catch (error) {
              (existingMessage as HTMLElement).style.display = "none";
            }
          }
          
          onLoad?.();
        },
        undefined,
        (error) => {
          handleModelError(error, url);
        }
      );
    }
  }

  function handleModelError(error: unknown, url: string) {
    // 接続エラーの場合は、コンソールログを抑制（ブラウザのネットワークエラーは表示されるが、JavaScript側では抑制）
    const isConnectionError =
      error instanceof Error &&
      (error.message === "Failed to fetch" ||
        error.message.includes("network") ||
        error.message.includes("connection"));
    
    if (!isConnectionError) {
      console.error("[Atelier Preview] Failed to load 3D model:", error, url);
    }
    
    // エラーメッセージを表示
    const errorDiv = document.createElement("div");
    errorDiv.setAttribute("data-atelier-message", "true");
    
    // 接続エラーの場合は、より詳細なメッセージを表示
    let errorMessage = "3Dモデルの読み込みに失敗しました";
    if (isConnectionError) {
      errorMessage = "consoleサーバーが起動していません\nnpm run dev:console を実行してください";
    }
    
    errorDiv.textContent = errorMessage;
    errorDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ef4444;
      font-size: 14px;
      pointer-events: none;
      z-index: 10;
      text-align: center;
      white-space: pre-line;
    `;
    container.appendChild(errorDiv);
    
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }

  // デフォルトモデルを読み込む（常に読み込む）
  loadDefaultModel().then(() => {
    // デフォルトモデル読み込み後、アセットがあれば読み込む
    if (assets && assets.length > 0) {
      // アセットをカテゴリー順にソート
      const sortedAssets = [...assets].sort((a, b) => {
        const orderA = a.category ? getCategoryLayerOrder(a.category) : 999;
        const orderB = b.category ? getCategoryLayerOrder(b.category) : 999;
        return orderA - orderB;
      });
      
      // アセットを順番に読み込む
      Promise.all(
        sortedAssets.map((asset) => loadAsset(asset.url, asset.category))
      ).then(() => {
        onLoad?.();
      }).catch((error) => {
        console.error("[Atelier Preview] Error loading assets:", error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    } else if (currentModelUrl) {
      // 後方互換性のため、既存のmodelUrlがあれば読み込む
      loadModel(currentModelUrl);
    } else {
      onLoad?.();
    }
  }).catch((error) => {
    console.error("[Atelier Preview] Error loading default model:", error);
    // デフォルトモデルの読み込みに失敗した場合でも、既存のmodelUrlがあれば読み込む
    if (currentModelUrl) {
      loadModel(currentModelUrl);
    } else {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  });

  // レンダリング関数（シンプルに）
  function render() {
    renderer.render(scene, camera);
  }
  
  // 初期レンダリング（少し遅延させて確実に）
  setTimeout(() => {
    render();
  }, 100);

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    const { width, height } = getContainerSize();
    if (width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      // リサイズ後にレンダリング
      render();
    }
  });
  resizeObserver.observe(container);

  return {
    updateGlbUrl(newGlbUrl: string | undefined) {
      // 後方互換性のため
      loadModel(newGlbUrl);
    },
    updateModelUrl(newModelUrl: string | undefined) {
      // GLBとFBXの両方をサポート
      loadModel(newModelUrl);
    },
    updateAssets(newAssets: AssetInfo[]) {
      // 既存のアセットをクリア
      loadedAssets.forEach((model) => {
        scene.remove(model);
      });
      loadedAssets.clear();
      
      // 新しいアセットを読み込む
      if (newAssets && newAssets.length > 0) {
        // アセットをカテゴリー順にソート
        const sortedAssets = [...newAssets].sort((a, b) => {
          const orderA = a.category ? getCategoryLayerOrder(a.category) : 999;
          const orderB = b.category ? getCategoryLayerOrder(b.category) : 999;
          return orderA - orderB;
        });
        
        // アセットを順番に読み込む
        Promise.all(
          sortedAssets.map((asset) => loadAsset(asset.url, asset.category))
        ).then(() => {
          render();
        }).catch((error) => {
          console.error("[Atelier Preview] Error updating assets:", error);
        });
      }
    },
    destroy() {
      // レンダリング禁止
      resizeObserver.disconnect();
      if (currentModel) {
        scene.remove(currentModel);
      }
      // 地面を削除
      scene.remove(ground);
      groundGeometry.dispose();
      groundMaterial.dispose();
      // renderer.domElementを削除（安全な方法）
      try {
        // DOMに接続されているか確認してから削除
        if (renderer.domElement && renderer.domElement.isConnected) {
          // remove()メソッドを使用（親子関係を確認する必要がない）
          renderer.domElement.remove();
        } else if (renderer.domElement && renderer.domElement.parentNode) {
          // isConnectedがfalseでもparentNodeがある場合は削除を試みる
          try {
            renderer.domElement.remove();
          } catch (error) {
            // エラーが発生した場合は、display: noneで非表示にする
            (renderer.domElement as HTMLElement).style.display = "none";
          }
        }
      } catch (error) {
        // エラーが発生した場合は、display: noneで非表示にする
        try {
          (renderer.domElement as HTMLElement).style.display = "none";
        } catch (innerError) {
          // それでもエラーが発生する場合は無視
          console.warn("[Atelier Preview] Could not hide renderer element:", innerError);
        }
      }
      renderer.dispose();
    },
  };
}
