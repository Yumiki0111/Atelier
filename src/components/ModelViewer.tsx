"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function Model({ productId, textureUrl }: { productId?: string; textureUrl?: string }) {
  // 最初の商品（id: "1"）の場合は男性モデル、それ以外は女性モデル
  const modelPath = productId === "1" ? "/3d/model_men.glb" : "/3d/model_women.glb";
  const { scene } = useGLTF(modelPath);
  
  // テクスチャは適用せず、モデルの元の色を保持
  // 必要に応じて、特定のメッシュにのみテクスチャを適用する場合はここで処理

  return (
    <primitive
      object={scene}
      scale={[3.5, 3.5, 3.5]}
      rotation={[0, -Math.PI / 2, 0]}
    />
  );
}

useGLTF.preload("/3d/model_women.glb");
useGLTF.preload("/3d/model_men.glb");

interface ModelViewerProps {
  height: number;
  productId?: string;
  textureUrl?: string;
}

export function ModelViewer({ height, productId, textureUrl }: ModelViewerProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <directionalLight position={[-10, -10, -5]} intensity={0.8} />
      <directionalLight position={[0, 10, 0]} intensity={0.5} />
      <Model productId={productId} textureUrl={textureUrl} />
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
