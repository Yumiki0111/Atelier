import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { TextureLoader } from "three";

/**
 * 3Dビューアの初期化オプション
 */
export interface ViewerOptions {
  glbUrl?: string; // 後方互換性のため残す
  modelUrl?: string; // GLBとFBXの両方をサポート（優先的に使用）
  textureUrl?: string;
  backgroundImageUrl?: string; // 背景画像のURL
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 3Dビューアのインスタンス
 */
export interface ViewerInstance {
  updateGlbUrl(glbUrl: string | undefined): void;
  updateModelUrl(modelUrl: string | undefined): void;
  destroy(): void;
}

/**
 * 3Dビューアの初期化（PreviewPanelのModelViewerと同じ設定）
 */
export function init3DViewer(
  container: HTMLElement,
  options: ViewerOptions
): ViewerInstance {
  const { glbUrl, modelUrl, textureUrl, backgroundImageUrl, onLoad, onError } = options;
  // modelUrlを優先、なければglbUrlを使用（後方互換性）
  const currentModelUrl = modelUrl || glbUrl;

  // コンテナのサイズを取得（初期化時に0の場合はデフォルト値を使用）
  const getContainerSize = () => {
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    return { width, height };
  };

  const { width: initialWidth, height: initialHeight } = getContainerSize();

  console.log("[Atelier Preview] Initializing 3D viewer:", {
    containerWidth: container.clientWidth,
    containerHeight: container.clientHeight,
    initialWidth,
    initialHeight,
  });

  // Scene setup（背景画像を設定）
  const scene = new THREE.Scene();
  
  // 背景画像を読み込む
  if (backgroundImageUrl) {
    console.log("[Atelier Preview] Loading background image:", backgroundImageUrl);
    // 読み込み中は一時的に白背景を設定
    scene.background = new THREE.Color(0xffffff);
    
    const textureLoader = new TextureLoader();
    textureLoader.load(
      backgroundImageUrl,
      (texture) => {
        console.log("[Atelier Preview] Background image loaded successfully");
        // テクスチャの色空間を設定
        if ('colorSpace' in texture) {
          (texture as any).colorSpace = 'srgb';
        } else if ('encoding' in texture) {
          (texture as any).encoding = (THREE as any).sRGBEncoding;
        }
        // テクスチャの繰り返しを無効化
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        scene.background = texture;
      },
      undefined,
      (error) => {
        console.warn("[Atelier Preview] Failed to load background image:", error, backgroundImageUrl);
        // 背景画像の読み込みに失敗した場合は白背景を維持
        scene.background = new THREE.Color(0xffffff);
      }
    );
  } else {
    console.log("[Atelier Preview] No background image URL provided");
    scene.background = null; // 背景なし（透明）
  }

  // Camera（PreviewPanelのModelViewerと同じ: position: [0, 0, 5], fov: 50）
  const camera = new THREE.PerspectiveCamera(
    50, // fov: 50
    initialWidth / initialHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 5);

  // Renderer（背景画像がある場合は不透明、ない場合は透明）
  // 背景画像のURLが提供されている場合は不透明、ない場合は透明
  const hasBackground = !!backgroundImageUrl;
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: !hasBackground, // 背景画像がある場合は不透明、ない場合は透明
    powerPreference: "high-performance", // 高性能モード
  });
  // 高解像度レンダリング（Retinaディスプレイ対応）
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // 最大2倍まで
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(initialWidth, initialHeight);
  
  // 色の再現性を向上（sRGB色空間）
  // Three.js r152以降ではoutputColorSpaceを使用
  if ('outputColorSpace' in renderer) {
    (renderer as any).outputColorSpace = 'srgb';
  } else if ('outputEncoding' in renderer) {
    // 古いバージョンのThree.js用
    (renderer as any).outputEncoding = (THREE as any).sRGBEncoding;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2; // 露出を少し上げて明るく
  
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ソフトシャドウ
  if (hasBackground) {
    renderer.setClearColor(0xffffff, 1); // 背景画像がある場合は白背景
  } else {
    renderer.setClearColor(0x000000, 0); // 背景を透明にする
  }
  const canvasElement = renderer.domElement;
  canvasElement.style.touchAction = "none"; // タッチイベントを有効化
  canvasElement.style.pointerEvents = "auto"; // ポインターイベントを有効化
  canvasElement.style.position = "relative"; // 位置を相対に設定
  canvasElement.style.zIndex = "1"; // z-indexを設定してイベントが確実に動作するように
  container.appendChild(canvasElement);

  // Lights（彩度を向上させるため、ライトの強度を調整）
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // 環境光を少し強く
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2.0); // メインライトを強く
  directionalLight1.position.set(10, 10, 5);
  directionalLight1.castShadow = true;
  // 影の設定
  directionalLight1.shadow.mapSize.width = 2048;
  directionalLight1.shadow.mapSize.height = 2048;
  directionalLight1.shadow.camera.near = 0.5;
  directionalLight1.shadow.camera.far = 50;
  directionalLight1.shadow.camera.left = -10;
  directionalLight1.shadow.camera.right = 10;
  directionalLight1.shadow.camera.top = 10;
  directionalLight1.shadow.camera.bottom = -10;
  directionalLight1.shadow.bias = -0.0001;
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight2.position.set(-10, -10, -5);
  scene.add(directionalLight2);

  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight3.position.set(0, 10, 0);
  scene.add(directionalLight3);

  // OrbitControls（PreviewPanelのModelViewerと同じ制約）
  // enableZoom: false, enablePan: false
  // minPolarAngle: Math.PI / 4 (45度 - 上限), maxPolarAngle: (Math.PI * 3) / 4 (135度 - 下限)
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  const minPolarAngle = Math.PI / 4; // 45度（上方向の限界）
  const maxPolarAngle = (Math.PI * 3) / 4; // 135度（下方向の限界）
  
  // 初期のphi（上下回転）を保存して固定
  const initialSpherical = new THREE.Spherical();
  initialSpherical.setFromVector3(camera.position);
  const fixedPhi = initialSpherical.phi; // 上下回転を固定

  // canvas要素にイベントリスナーを追加
  canvasElement.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    canvasElement.style.cursor = "grabbing";
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
    // z軸方向（前後方向）の動きを制限：radiusを固定（5に固定）
    spherical.radius = 5;

    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  canvasElement.addEventListener("mouseup", () => {
    isDragging = false;
    canvasElement.style.cursor = "grab";
  });

  canvasElement.addEventListener("mouseleave", () => {
    isDragging = false;
    canvasElement.style.cursor = "grab";
  });

  // タッチイベントも追加
  canvasElement.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      isDragging = true;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
    // z軸方向（前後方向）の動きを制限：radiusを固定（5に固定）
    spherical.radius = 5;

    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);

    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  });

  canvasElement.addEventListener("touchend", () => {
    isDragging = false;
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
  let currentModel: THREE.Group | null = null;
  const gltfLoader = new GLTFLoader();
  const fbxLoader = new FBXLoader();
  
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
          } else if ('encoding' in material) {
            // 古いバージョンのThree.js用
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

    console.log("[Atelier Preview] Loading 3D model:", url);
    const format = getModelFormat(url);

    // モデル形式に応じて適切なローダーを使用
    if (format === "fbx") {
      fbxLoader.load(
        url,
        (fbx) => {
          console.log("[Atelier Preview] FBX model loaded successfully:", url);
          currentModel = fbx;
          
                 // まずスケールを適用（バウンディングボックス計算前に）
                 // FBXファイルは通常メートル単位なので、より大きなスケールを試す
                 // まずは大きめのスケールで表示を確認
                 const initialScale = 0.018; // 少し小さくする
                 currentModel.scale.set(initialScale, initialScale, initialScale);
          
          // スケール適用後にバウンディングボックスを計算
          const box = new THREE.Box3().setFromObject(currentModel);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxSize = Math.max(size.x, size.y, size.z);
          console.log("[Atelier Preview] FBX bounding box (after scale):", { center, size, maxSize, initialScale });
          
                 // 原点を中心に移動し、Y軸を少し上に移動
                 currentModel.position.set(-center.x, -center.y + 0.2, -center.z);
          
          // 回転は一旦なし（表示確認後、必要に応じて調整）
          currentModel.rotation.set(0, 0, 0);
          
          // 影を有効化
          enableShadow(currentModel);
          
          console.log("[Atelier Preview] FBX model settings:", {
            position: currentModel.position,
            scale: currentModel.scale,
            rotation: currentModel.rotation,
            maxSize,
            initialScale,
            boundingBoxCenter: center,
            boundingBoxSize: size,
          });
          
          scene.add(currentModel);
          
          // モデルがシーンに追加されたことを確認
          console.log("[Atelier Preview] FBX model added to scene. Scene children count:", scene.children.length);
          
          // カメラをモデルに向ける（念のため）
          if (camera) {
            camera.lookAt(0, 0, 0);
            console.log("[Atelier Preview] Camera positioned at:", camera.position, "looking at:", [0, 0, 0]);
          }
          
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
          console.log("[Atelier Preview] GLB model loaded successfully:", url);
                 currentModel = gltf.scene;
                 // PreviewPanelのModelViewerと同じ: scale: [3.5, 3.5, 3.5], rotation: [0, -Math.PI / 2, 0]
                 // 少し小さくする
                 currentModel.scale.set(3.0, 3.0, 3.0);
                 currentModel.rotation.y = -Math.PI / 2;
                 // Y軸を少し上に移動
                 currentModel.position.y = 0.2;
          
          // 影を有効化
          enableShadow(currentModel);
          
          scene.add(currentModel);
          
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

  // Load initial model
  loadModel(currentModelUrl);

  // Animation loop
  let animationId: number;
  function animate() {
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    const { width, height } = getContainerSize();
    if (width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      console.log("[Atelier Preview] Resized 3D viewer:", { width, height });
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
    destroy() {
      cancelAnimationFrame(animationId);
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
