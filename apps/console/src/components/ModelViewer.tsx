"use client";

import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

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

function Model({ 
  glbUrl,
  modelUrl,
  textureUrl 
}: { 
  glbUrl?: string;
  modelUrl?: string;
  textureUrl?: string;
}) {
  // modelUrlを優先、なければglbUrlを使用（後方互換性）
  const url = modelUrl || glbUrl || "/3d/model_men.glb";
  const format = getModelFormat(url);
  
  let scene: any;
  
  if (format === "fbx") {
    // FBXファイルの場合はFBXLoaderを使用
    const fbx = useLoader(FBXLoader, url);
    scene = fbx;
  } else {
    // GLB/GLTFファイルの場合はGLTFLoaderを使用
    const gltf = useGLTF(url);
    scene = gltf.scene;
  }
  
  // FBXファイルの位置を調整するためのstate
  const [fbxPosition, setFbxPosition] = useState<[number, number, number]>([0, 0, 0]);
  
  const [fbxScale, setFbxScale] = useState<[number, number, number]>([1, 1, 1]);
  const [fbxRotation, setFbxRotation] = useState<[number, number, number]>([0, 0, 0]);
  
  useEffect(() => {
    if (format === "fbx" && scene) {
      // まずスケールを適用（バウンディングボックス計算前に）
      // FBXファイルは通常メートル単位なので、より大きなスケールを試す
      const initialScale = 0.02; // より大きなスケールを試す
      scene.scale.set(initialScale, initialScale, initialScale);
      setFbxScale([initialScale, initialScale, initialScale]);
      
      // スケール適用後にバウンディングボックスを計算
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      console.log("[ModelViewer] FBX bounding box (after scale):", { center, size, maxSize, initialScale });
      
      // 原点を中心に移動（stateを更新してReact Three Fiberに反映）
      const newPosition: [number, number, number] = [-center.x, -center.y, -center.z];
      setFbxPosition(newPosition);
      scene.position.set(-center.x, -center.y, -center.z);
      
      // 回転は一旦なし（表示確認後、必要に応じて調整）
      const newRotation: [number, number, number] = [0, 0, 0];
      setFbxRotation(newRotation);
      scene.rotation.set(0, 0, 0);
      
      console.log("[ModelViewer] FBX model positioned:", {
        position: newPosition,
        scale: [initialScale, initialScale, initialScale],
        rotation: newRotation,
        maxSize,
        initialScale,
        boundingBoxCenter: center,
        boundingBoxSize: size,
      });
    }
  }, [format, scene]);
  
  // テクスチャは適用せず、モデルの元の色を保持
  // 必要に応じて、特定のメッシュにのみテクスチャを適用する場合はここで処理

  // FBXファイルのスケールと回転を動的に設定
  const scale = format === "fbx" ? fbxScale : [3.5, 3.5, 3.5];
  const position = format === "fbx" ? fbxPosition : [0, 0, 0];
  const rotation = format === "fbx" ? fbxRotation : [0, -Math.PI / 2, 0];

  return (
    <primitive
      object={scene}
      scale={scale}
      position={position}
      rotation={rotation}
    />
  );
}

useGLTF.preload("/3d/model_women.glb");
useGLTF.preload("/3d/model_men.glb");

interface ModelViewerProps {
  height: number;
  glbUrl?: string; // 後方互換性のため残す
  modelUrl?: string; // GLBとFBXの両方をサポート（優先的に使用）
  textureUrl?: string;
}

export function ModelViewer({ height, glbUrl, modelUrl, textureUrl }: ModelViewerProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <directionalLight position={[-10, -10, -5]} intensity={0.8} />
      <directionalLight position={[0, 10, 0]} intensity={0.5} />
      <Suspense fallback={null}>
        <Model glbUrl={glbUrl} modelUrl={modelUrl} textureUrl={textureUrl} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2}
        target={[0, 0, 0]}
        autoRotate={false}
      />
    </Canvas>
  );
}
