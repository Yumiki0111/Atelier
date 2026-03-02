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
  const internalBorderRef = useRef<HTMLDivElement>(null);
  const borderRef = externalBorderRef || internalBorderRef;

    // ステータスバー用の現在時刻（リアルタイム更新）
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
      const updateTime = () => {
        const now = new Date();
        setCurrentTime(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
      };
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    }, []);

    // スクリーンエリアの境界変更を通知
  useEffect(() => {
      const screen = borderRef.current;
      const container = containerRef.current;
      if (!screen || !container || !onFrameBoundsChange) return;

      const reportBounds = () => {
        const screenRect = screen.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        onFrameBoundsChange({
          left: screenRect.left - containerRect.left,
          top: screenRect.top - containerRect.top,
          width: screenRect.width,
          height: screenRect.height,
        });
      };

      const observer = new ResizeObserver(reportBounds);
      observer.observe(screen);
      observer.observe(container);
      setTimeout(reportBounds, 100);

      return () => observer.disconnect();
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
        maxWidth: '414px',
        maxHeight: '896px',
        aspectRatio: '414 / 896', // iPhone XR のアスペクト比
      }}
    >
        {/* ===== スマートフォン本体 (iPhone 15 Pro 風) ===== */}
        <div
        style={{
            position: 'relative',
          width: '100%',
          height: '100%',
            background: 'linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 40%, #2c2c2e 60%, #1c1c1e 100%)',
            borderRadius: '16% / 7.4%',
            border: '1.5px solid rgba(130, 130, 135, 0.5)',
            overflow: 'visible',
            pointerEvents: 'none',
        }}
        >
          {/* ---- サイドボタン（左側） ---- */}
          {/* アクションボタン */}
          <div style={{
            position: 'absolute',
            left: '-2.5px',
            top: '17%',
            width: '2.5px',
            height: '2.8%',
            background: 'linear-gradient(to left, #3a3a3c 0%, #606063 100%)',
            borderRadius: '2px 0 0 2px',
          }} />
          {/* ボリュームアップ */}
          <div style={{
            position: 'absolute',
            left: '-2.5px',
            top: '23%',
            width: '2.5px',
            height: '5.5%',
            background: 'linear-gradient(to left, #3a3a3c 0%, #606063 100%)',
            borderRadius: '2px 0 0 2px',
          }} />
          {/* ボリュームダウン */}
          <div style={{
            position: 'absolute',
            left: '-2.5px',
            top: '30%',
            width: '2.5px',
            height: '5.5%',
            background: 'linear-gradient(to left, #3a3a3c 0%, #606063 100%)',
            borderRadius: '2px 0 0 2px',
          }} />

          {/* ---- サイドボタン（右側） ---- */}
          {/* サイドボタン（電源） */}
          <div style={{
            position: 'absolute',
            right: '-2.5px',
            top: '26%',
            width: '2.5px',
            height: '8.5%',
            background: 'linear-gradient(to right, #3a3a3c 0%, #606063 100%)',
            borderRadius: '0 2px 2px 0',
          }} />
      
          {/* ---- スクリーンベゼル（黒い縁） ---- */}
          <div
            style={{
              position: 'absolute',
              top: '1.4%',
              left: '3.2%',
              right: '3.2%',
              bottom: '1.4%',
              background: '#000000',
              borderRadius: '13% / 6%',
            }}
          >
            {/* ---- スクリーン（ディスプレイ表面） ---- */}
      <div
        ref={borderRef}
        style={{
          position: 'absolute',
                top: '1px',
                left: '1px',
                right: '1px',
                bottom: '1px',
                background: '#ffffff',
                borderRadius: 'inherit',
                overflow: 'hidden',
          pointerEvents: 'auto',
        }}
      >
              {/* ===== Dynamic Island ===== */}
              <div
                style={{
                  position: 'absolute',
                  top: '1.2%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '27%',
                  height: '2.5%',
                  minHeight: '10px',
                  background: '#000000',
                  borderRadius: '100px',
                  zIndex: 31,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '16%',
                  pointerEvents: 'none',
                }}
              >
                {/* フロントカメラ */}
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    background: 'radial-gradient(circle at 35% 35%, #1e3a5f 0%, #0a1525 80%)',
                    borderRadius: '50%',
                    border: '0.5px solid rgba(60, 60, 100, 0.3)',
                    boxShadow: 'inset 0 0 1px rgba(255,255,255,0.15)',
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* ===== ステータスバー ===== */}
              {/* iPhone風: 左に時刻、右にシグナル・WiFi・バッテリー */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '5.2%',
                  zIndex: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 7%',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {/* 時刻（左側 — Dynamic Island の左） */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: '-apple-system, "SF Pro Text", BlinkMacSystemFont, "Segoe UI", sans-serif',
                    color: '#000',
                    letterSpacing: '0.01em',
                  }}
                >
                  {currentTime}
                </span>

                {/* インジケーター（右側 — Dynamic Island の右） */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* シグナルバー */}
                  <svg width="14" height="10" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="8" width="3" height="3" rx="0.5" fill="#000" />
                    <rect x="4.5" y="5" width="3" height="6" rx="0.5" fill="#000" />
                    <rect x="9" y="2" width="3" height="9" rx="0.5" fill="#000" />
                    <rect x="13.5" y="0" width="2.5" height="11" rx="0.5" fill="#000" opacity="0.25" />
                  </svg>
                  {/* WiFi */}
                  <svg width="13" height="10" viewBox="0 0 15 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="7.5" cy="9.5" r="1.25" fill="#000" />
                    <path d="M4.75 7a3.8 3.8 0 0 1 5.5 0" stroke="#000" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M2.25 4.5a7.5 7.5 0 0 1 10.5 0" stroke="#000" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  {/* バッテリー */}
                  <svg width="22" height="10" viewBox="0 0 25 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width="21" height="10" rx="2" stroke="#000" strokeWidth="1" opacity="0.35" />
                    <rect x="2" y="2" width="18" height="7" rx="1.5" fill="#34C759" />
                    <path d="M23 3.5v4a2 2 0 0 0 0-4Z" fill="#000" opacity="0.4" />
                  </svg>
                </div>
              </div>

              {/* ===== コンテンツエリア ===== */}
        {children}

              {/* ===== ホームインジケーター ===== */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '1%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '36%',
                  height: '4px',
                  borderRadius: '100px',
                  background: 'rgba(0, 0, 0, 0.18)',
                  zIndex: 30,
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  );
