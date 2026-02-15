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
  const upwardOffset = 0.1; // モデルを上に移動させるオフセット
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
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material) {
        const material = child.material as THREE.MeshStandardMaterial;
        if ('colorSpace' in material) {
          (material as any).colorSpace = 'srgb';
        } else if ('encoding' in material && (THREE as any).sRGBEncoding !== undefined) {
          (material as any).encoding = (THREE as any).sRGBEncoding;
        }
      }
    }
  });
}

/**
 * ファイル拡張子からモデル形式を判定
 */
export function getModelFormat(url: string): "glb" | "fbx" | "unknown" {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith(".glb") || lowerUrl.endsWith(".gltf")) return "glb";
  if (lowerUrl.endsWith(".fbx")) return "fbx";
  return "unknown";
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
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
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

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight2.position.set(-10, -10, -5);
  scene.add(directionalLight2);

  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.8);
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
