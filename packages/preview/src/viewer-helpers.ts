import * as THREE from "three";

/**
 * モデルの位置、回転、スケールを計算して設定する共通関数
 * originalSize: スケーリング前の元のバウンディングボックスサイズを返す（アセットとの比較用）
 */
export function calculateAndSetModelTransform(
  model: THREE.Group,
  targetSize: number = 2.0
): {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  originalSize: THREE.Vector3;
  originalCenter: THREE.Vector3;
} {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);

  const scale = targetSize / maxSize;
  model.scale.set(scale, scale, scale);

  const boxAfterScale = new THREE.Box3().setFromObject(model);
  const centerAfterScale = boxAfterScale.getCenter(new THREE.Vector3());

  model.rotation.y = 0;

  const modelHeight = boxAfterScale.max.y - boxAfterScale.min.y;
  const verticalOffset = modelHeight * 0.15;
  const upwardOffset = 0.3; // モデルを上に移動させるオフセット（下部切れ対策）
  model.position.set(-centerAfterScale.x, -centerAfterScale.y - verticalOffset + upwardOffset, -centerAfterScale.z);

  return {
    position: model.position.clone(),
    rotation: model.rotation.clone(),
    scale: model.scale.clone(),
    originalSize: size.clone(),
    originalCenter: center.clone(),
  };
}

/**
 * モデルのメッシュにcastShadowを設定し、マテリアルの色空間を設定
 */
export function enableShadow(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          // すべてのマテリアルタイプに対応
          if (material instanceof THREE.MeshStandardMaterial) {
            // 色空間を設定
            if ('colorSpace' in material) {
              (material as any).colorSpace = 'srgb';
            } else if ('encoding' in material && (THREE as any).sRGBEncoding !== undefined) {
              (material as any).encoding = (THREE as any).sRGBEncoding;
            }
            
            // 彩度と見やすさを向上させる設定
            // roughnessを下げて光沢を上げる（より鮮やかに見える）
            if (material.roughness !== undefined) {
              material.roughness = Math.min(material.roughness * 0.8, 0.9);
            }
          } else if (material instanceof THREE.MeshPhongMaterial || 
                     material instanceof THREE.MeshLambertMaterial ||
                     material instanceof THREE.MeshBasicMaterial) {
            // FBXファイルでよく使われるマテリアルタイプにも対応
            // 色空間を設定
            if ('colorSpace' in material) {
              (material as any).colorSpace = 'srgb';
            } else if ('encoding' in material && (THREE as any).sRGBEncoding !== undefined) {
              (material as any).encoding = (THREE as any).sRGBEncoding;
            }
            
            // マテリアルが黒（デフォルト）の場合は、肌色を設定しない（元の色を保持）
            // マテリアルの色が設定されていない場合のみ、デフォルトの色を確認
            if (material.color && material.color.getHex() === 0x000000) {
              // 黒の場合は、元のマテリアルの色を保持（FBXファイルから読み込まれた色を使用）
              // 何もしない（マテリアルの元の色を保持）
            }
          }
        });
      }
    }
  });
}

/**
 * ファイル拡張子からモデル形式を判定
 */
export function getModelFormat(url: string): "glb" | "fbx" | "unknown" {
  try {
    // URLからクエリパラメータを除去
    const urlWithoutQuery = url.split("?")[0].split("#")[0];
    const lowerUrl = urlWithoutQuery.toLowerCase();
    
    // 拡張子で判定
    if (lowerUrl.endsWith(".glb") || lowerUrl.endsWith(".gltf")) return "glb";
    if (lowerUrl.endsWith(".fbx")) return "fbx";
    
    // URLパスから拡張子を抽出（例: /path/to/file.fbx?query=...）
    const pathMatch = lowerUrl.match(/\.(glb|gltf|fbx)(\?|#|$)/);
    if (pathMatch) {
      const ext = pathMatch[1];
      if (ext === "glb" || ext === "gltf") return "glb";
      if (ext === "fbx") return "fbx";
    }
    
    // response-content-dispositionパラメータからファイル名を抽出
    // パターン1: response-content-disposition=attachment; filename=default-filename.FBX
    // パターン2: response-content-disposition=attachment%3B%20filename%3Ddefault-filename.FBX (URLエンコード)
    const dispositionMatch = url.match(/response-content-disposition[^&]*filename[=*]'?"?([^"&'%]+)["']?/i);
    if (dispositionMatch) {
      // URLデコードが必要な場合がある
      let filename = decodeURIComponent(dispositionMatch[1]).toLowerCase();
      // さらにデコードが必要な場合（二重エンコード）
      if (filename.includes('%')) {
        filename = decodeURIComponent(filename).toLowerCase();
      }
      console.log("[getModelFormat] Extracted filename from disposition:", filename);
      if (filename.endsWith(".glb") || filename.endsWith(".gltf")) return "glb";
      if (filename.endsWith(".fbx")) return "fbx";
    }
    
    // URL全体からFBXやGLBの文字列を検索（最後の手段）
    if (lowerUrl.includes(".fbx") || lowerUrl.includes("filename") && lowerUrl.includes("fbx")) {
      console.log("[getModelFormat] Detected FBX from URL content");
      return "fbx";
    }
    if (lowerUrl.includes(".glb") || lowerUrl.includes(".gltf")) {
      console.log("[getModelFormat] Detected GLB/GLTF from URL content");
      return "glb";
    }
    
    return "unknown";
  } catch (error) {
    console.warn("[getModelFormat] Error parsing URL:", url, error);
    return "unknown";
  }
}

/**
 * モデル読み込みエラーを処理してDOM要素を表示
 */
export function handleModelError(
  container: HTMLElement,
  error: unknown,
  url: string,
  onError?: (error: Error) => void
): void {
  const isConnectionError =
    error instanceof Error &&
    (error.message === "Failed to fetch" ||
      error.message.includes("network") ||
      error.message.includes("connection"));

  if (!isConnectionError) {
    console.error("[Atelier Preview] Failed to load 3D model:", error, url);
  }

  const errorDiv = document.createElement("div");
  errorDiv.setAttribute("data-atelier-message", "true");

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

/**
 * 既存のメッセージ要素を安全に削除
 */
export function removeExistingMessage(container: HTMLElement): void {
  const existingMessage = container.querySelector("[data-atelier-message]");
  if (existingMessage) {
    try {
      existingMessage.remove();
    } catch (error) {
      (existingMessage as HTMLElement).style.display = "none";
    }
  }
}

/**
 * カメラの回転制御をセットアップ（マウス + タッチ）
 */
export function setupOrbitControls(
  canvasElement: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
  fixedPhi: number,
  fixedRadius: number,
  render: () => void
): void {
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };

  // マウスイベント
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
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);
    spherical.theta -= deltaX * 0.01;
    spherical.phi = fixedPhi;
    spherical.radius = fixedRadius;
    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);
    render();
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

  // タッチイベント
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
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);
    spherical.theta -= deltaX * 0.01;
    spherical.phi = fixedPhi;
    spherical.radius = fixedRadius;
    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);
    render();
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  });

  canvasElement.addEventListener("touchend", () => {
    isDragging = false;
  });

  canvasElement.style.cursor = "grab";
}

/**
 * シーンのライトをセットアップ
 */
export function setupLights(scene: THREE.Scene): {
  ambientLight: THREE.AmbientLight;
  directionalLight1: THREE.DirectionalLight;
  directionalLight2: THREE.DirectionalLight;
  directionalLight3: THREE.DirectionalLight;
} {
  // アンビエントライトを少し明るくして、全体的な明るさを向上
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
  scene.add(ambientLight);

  // メインのディレクショナルライトを強化（より明るく、彩度を上げる）
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 3.0);
  directionalLight1.position.set(10, 10, 5);
  directionalLight1.castShadow = true;
  directionalLight1.shadow.mapSize.width = 4096;
  directionalLight1.shadow.mapSize.height = 4096;
  directionalLight1.shadow.camera.near = 0.5;
  directionalLight1.shadow.camera.far = 50;
  directionalLight1.shadow.camera.left = -10;
  directionalLight1.shadow.camera.right = 10;
  directionalLight1.shadow.camera.top = 10;
  directionalLight1.shadow.camera.bottom = -10;
  directionalLight1.shadow.bias = -0.0001;
  directionalLight1.shadow.radius = 4;
  scene.add(directionalLight1);

  // 補助ライトも強化
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight2.position.set(-10, -10, -5);
  scene.add(directionalLight2);

  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight3.position.set(0, 10, 0);
  scene.add(directionalLight3);

  return { ambientLight, directionalLight1, directionalLight2, directionalLight3 };
}

/**
 * 地面メッシュを作成
 */
export function createGround(scene: THREE.Scene): {
  ground: THREE.Mesh;
  groundGeometry: THREE.PlaneGeometry;
  groundMaterial: THREE.MeshStandardMaterial;
} {
  const groundGeometry = new THREE.PlaneGeometry(20, 20);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3;
  ground.receiveShadow = true;
  scene.add(ground);

  return { ground, groundGeometry, groundMaterial };
}
