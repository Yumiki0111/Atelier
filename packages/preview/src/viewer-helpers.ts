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
 * 慣性付き：ドラッグ離し後にゆっくり減速して止まる
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

  // 現在のカメラ位置から初期の球座標を取得
  const spherical = new THREE.Spherical();
  spherical.setFromVector3(camera.position);

  // 垂直方向の制限（より厳しく）
  const MIN_PHI = Math.PI * 0.3;  // 約 54°（真上を避ける）
  const MAX_PHI = Math.PI * 0.75;  // 約 135°（真下を避ける）

  // ズーム範囲（より狭く）
  const MIN_RADIUS = fixedRadius * 0.75;
  const MAX_RADIUS = fixedRadius * 1.3;

  // 回転速度（より遅く、制御しやすく）
  const ROT_SPEED  = 0.006;  // 水平回転速度を下げる
  const VERT_SPEED = 0.006;  // 垂直回転速度を下げる
  const ZOOM_SPEED = 0.001;  // ズーム速度も少し下げる

  // 慣性パラメータ（より早く止まる）
  const DAMPING = 0.82;      // 減衰を強く（0.88 → 0.82）
  const MIN_VELOCITY = 0.0001; // 停止判定を少し緩く（早めに停止）

  // 慣性用速度
  let velTheta = 0;
  let velPhi   = 0;
  let inertiaRafId: number | null = null;

  function stopInertia() {
    if (inertiaRafId !== null) {
      cancelAnimationFrame(inertiaRafId);
      inertiaRafId = null;
    }
    velTheta = 0;
    velPhi   = 0;
  }

  function applyCameraFromSpherical() {
    spherical.phi    = Math.max(MIN_PHI,    Math.min(MAX_PHI,    spherical.phi));
    spherical.radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, spherical.radius));
    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);
    render();
  }

  function startInertia() {
    if (inertiaRafId !== null) return;

    function loop() {
      velTheta *= DAMPING;
      velPhi   *= DAMPING;

      if (Math.abs(velTheta) < MIN_VELOCITY && Math.abs(velPhi) < MIN_VELOCITY) {
        inertiaRafId = null;
        return;
      }

      spherical.theta -= velTheta;
      spherical.phi   -= velPhi;
      applyCameraFromSpherical();
      inertiaRafId = requestAnimationFrame(loop);
    }

    inertiaRafId = requestAnimationFrame(loop);
  }

  // ─── マウスイベント ──────────────────────────────────────
  canvasElement.addEventListener("mousedown", (e) => {
    e.preventDefault();
    stopInertia();
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    canvasElement.style.cursor = "grabbing";
  });

  canvasElement.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    velTheta = deltaX * ROT_SPEED;
    velPhi   = deltaY * VERT_SPEED;

    spherical.theta -= velTheta;
    spherical.phi   -= velPhi;

    applyCameraFromSpherical();
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  const onDragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    canvasElement.style.cursor = "grab";
    startInertia();
  };

  canvasElement.addEventListener("mouseup",    onDragEnd);
  canvasElement.addEventListener("mouseleave", onDragEnd);

  // ─── タッチイベント ──────────────────────────────────────
  canvasElement.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      stopInertia();
      isDragging = true;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: false });

  canvasElement.addEventListener("touchmove", (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const deltaX = e.touches[0].clientX - previousMousePosition.x;
    const deltaY = e.touches[0].clientY - previousMousePosition.y;

    velTheta = deltaX * ROT_SPEED;
    velPhi   = deltaY * VERT_SPEED;

    spherical.theta -= velTheta;
    spherical.phi   -= velPhi;

    applyCameraFromSpherical();
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: false });

  canvasElement.addEventListener("touchend", () => {
    if (!isDragging) return;
    isDragging = false;
    startInertia();
  });

  // ─── ホイールズーム ──────────────────────────────────────
  canvasElement.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      spherical.radius *= 1 + e.deltaY * ZOOM_SPEED;
      applyCameraFromSpherical();
    },
    { passive: false }
  );

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
  directionalLight4: THREE.DirectionalLight;
  directionalLight5: THREE.DirectionalLight;
} {
  // スタジオ風のライティング（本物のスタジオ感を出す）
  // アンビエントライト（全体を明るく、影を濃く見せるために少し暗めに）
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // メインキーライト（前面から）
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight1.position.set(5, 8, 5);
  directionalLight1.castShadow = true;
  directionalLight1.shadow.mapSize.width = 2048;
  directionalLight1.shadow.mapSize.height = 2048;
  directionalLight1.shadow.camera.near = 0.5;
  directionalLight1.shadow.camera.far = 50;
  directionalLight1.shadow.camera.left = -10;
  directionalLight1.shadow.camera.right = 10;
  directionalLight1.shadow.camera.top = 10;
  directionalLight1.shadow.camera.bottom = -10;
  directionalLight1.shadow.bias = -0.0001; // シャドウバイアスを調整
  directionalLight1.shadow.normalBias = 0.02; // ノーマルバイアスを調整
  directionalLight1.shadow.radius = 4; // シャドウのぼかしを調整
  scene.add(directionalLight1);

  // フィルライト（左側から）
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight2.position.set(-5, 6, 3);
  scene.add(directionalLight2);
  
  // バックライト（後ろから輪郭を強調）
  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight3.position.set(0, 4, -8);
  scene.add(directionalLight3);

  // トップライト（上から）
  const directionalLight4 = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight4.position.set(0, 12, 0);
  scene.add(directionalLight4);

  // ライトライト（右側から）
  const directionalLight5 = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight5.position.set(8, 5, 2);
  scene.add(directionalLight5);

  return { ambientLight, directionalLight1, directionalLight2, directionalLight3, directionalLight4, directionalLight5 };
}

/**
 * 地面メッシュを作成
 */
export function createGround(scene: THREE.Scene, modelFootY?: number): {
  ground: THREE.Mesh;
  groundGeometry: THREE.PlaneGeometry;
  groundMaterial: THREE.MeshStandardMaterial;
} {
  const groundGeometry = new THREE.PlaneGeometry(20, 20);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5, // 少しグレーがかった白で影をより見やすく
    transparent: true,
    opacity: 0.6, // 影をより濃く見えるように不透明度を上げる
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  // モデルの足元の位置に合わせて地面を配置（モデルが読み込まれていない場合は-3に設定）
  ground.position.y = modelFootY !== undefined ? modelFootY : -3;
  ground.receiveShadow = true;
  scene.add(ground);

  return { ground, groundGeometry, groundMaterial };
}
