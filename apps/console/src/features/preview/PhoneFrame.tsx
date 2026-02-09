"use client";

import { useRef, useEffect, useState, forwardRef } from "react";

interface PhoneFrameProps {
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  selectedAsset: {
    modelUrl?: string;
    glbUrl?: string;
  } | null | undefined;
  onFrameBoundsChange?: (bounds: { left: number; top: number; width: number; height: number }) => void;
  borderRef?: React.RefObject<HTMLDivElement | null>;
  children?: React.ReactNode;
}

export const PhoneFrame = forwardRef<HTMLDivElement, PhoneFrameProps>(
  ({ previewContainerRef, selectedAsset, onFrameBoundsChange, borderRef: externalBorderRef, children }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const internalBorderRef = useRef<HTMLDivElement>(null);
  const borderRef = externalBorderRef || internalBorderRef;
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const updateBounds = () => {
      const image = imageRef.current;
      const border = borderRef.current;
      const container = containerRef.current;

      if (!image || !border || !container) {
        return;
      }

      // 画像が読み込まれていない場合は待つ
      if (!image.complete || image.naturalWidth === 0) {
        return;
      }

      // フレーム画像の実際の表示サイズと位置を取得
      // object-containの動作を正確に再現
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const imageNaturalWidth = image.naturalWidth;
      const imageNaturalHeight = image.naturalHeight;
      
      if (imageNaturalWidth === 0 || imageNaturalHeight === 0) {
        return;
      }
      
      // アスペクト比を計算
      const imageAspectRatio = imageNaturalWidth / imageNaturalHeight;
      const containerAspectRatio = containerWidth / containerHeight;
      
      let actualWidth: number;
      let actualHeight: number;
      
      if (imageAspectRatio > containerAspectRatio) {
        // 画像の方が横長 → 幅が制約
        actualWidth = containerWidth;
        actualHeight = containerWidth / imageAspectRatio;
      } else {
        // 画像の方が縦長 → 高さが制約
        actualHeight = containerHeight;
        actualWidth = containerHeight * imageAspectRatio;
      }
      
      // 中央配置されるので、オフセットを計算
      const left = (containerWidth - actualWidth) / 2;
      const top = (containerHeight - actualHeight) / 2;
      const width = actualWidth;
      const height = actualHeight;

      // 赤枠に同じサイズ・位置を適用
      border.style.left = `${left}px`;
      border.style.top = `${top}px`;
      border.style.width = `${width}px`;
      border.style.height = `${height}px`;

      // 親コンポーネントに赤枠の位置とサイズを通知
      if (onFrameBoundsChange) {
        onFrameBoundsChange({ left, top, width, height });
      }
      
      // 外部borderRefと内部borderRefを同期
      if (externalBorderRef && internalBorderRef.current) {
        externalBorderRef.current = internalBorderRef.current;
      }
    };

    const image = imageRef.current;
    const container = containerRef.current;

    if (!image || !container) {
      return;
    }

    // 初回計算
    const timer1 = setTimeout(() => {
      updateBounds();
    }, 100);

    const timer2 = setTimeout(() => {
      updateBounds();
    }, 500);

    // ResizeObserverでフレーム画像のサイズ変更を監視
    const resizeObserver = new ResizeObserver(() => {
      updateBounds();
    });

    resizeObserver.observe(image);
    resizeObserver.observe(container);

    // リサイズ時にも再計算
    window.addEventListener('resize', updateBounds);

    // 画像の読み込みを監視
    const handleLoad = () => {
      setImageLoaded(true);
      setTimeout(() => {
        updateBounds();
      }, 100);
      setTimeout(() => {
        updateBounds();
      }, 500);
    };

    image.addEventListener('load', handleLoad);

    // 既に読み込まれている場合
    if (image.complete) {
      setImageLoaded(true);
      setTimeout(() => {
        updateBounds();
      }, 100);
      setTimeout(() => {
        updateBounds();
      }, 500);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateBounds);
      image.removeEventListener('load', handleLoad);
    };
  }, [onFrameBoundsChange]);

  // 外部refと内部refを同期
  useEffect(() => {
    if (typeof ref === 'function') {
      ref(containerRef.current);
    } else if (ref) {
      ref.current = containerRef.current;
    }
  }, [ref]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '500px',
        maxHeight: '1080px',
        aspectRatio: '500 / 1080',
      }}
    >
      {/* フレーム画像 - 赤枠と同じサイズ・位置に配置 */}
      <img
        ref={imageRef}
        src="/phone_frame.png"
        alt="Phone frame"
        className="absolute w-full h-full object-contain"
        style={{
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
          zIndex: 20,
          display: 'block',
        }}
        onLoad={() => {
          setImageLoaded(true);
        }}
        onError={(e) => {
          console.error('[PhoneFrame] Frame image failed to load', e);
        }}
      />
      
      {/* 透明な枠 - フレーム画像と同じサイズ・位置に配置 */}
      <div
        ref={borderRef}
        style={{
          position: 'absolute',
          left: '0px',
          top: '0px',
          width: '0px',
          height: '0px',
          border: '4px solid transparent',
          backgroundColor: 'transparent',
          boxSizing: 'border-box',
          zIndex: 15,
          pointerEvents: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
});
