'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProducts } from '@/features/products/useProducts';
import type { Product } from '@atelier/shared';

interface OutfitChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProductId: string;
}

interface CategoryProduct {
  id: string;
  title: string;
  image: string;
  categoryName: string;
}

export default function OutfitChangeModal({
  isOpen,
  onClose,
  currentProductId,
}: OutfitChangeModalProps) {
  const [categories, setCategories] = useState<{ [key: string]: CategoryProduct[] }>({});
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragCurrentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const modalTransform = useRef<number>(0);
  
  // 商品データを取得
  const { data: products = [], isLoading } = useProducts();
  
  // クライアントサイドでのみマウント
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  

  useEffect(() => {
    if (isOpen && products.length > 0) {
      // 商品データを取得してカテゴリ別に分類
      const categorized: { [key: string]: CategoryProduct[] } = {};

      products.forEach((product) => {
        // 現在の商品IDと比較（idまたはexternalProductId）
        const isCurrentProduct = 
          product.id === currentProductId || 
          product.externalProductId === currentProductId;
        
        if (!isCurrentProduct) {
          const category = product.category || 'その他';
          if (!categorized[category]) {
            categorized[category] = [];
          }
          categorized[category].push({
            id: product.id,
            title: product.name,
            image: product.thumbnailUrl || '/placeholder.jpg',
            categoryName: category,
          });
        }
      });

      setCategories(categorized);
    }
  }, [isOpen, currentProductId, products]);


  // スワイプで閉じる機能
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const modalBody = modal.querySelector('.outfit-change-modal-body') as HTMLElement;

    const handleStart = (clientY: number) => {
      dragStartY.current = clientY;
      dragCurrentY.current = clientY;
      isDragging.current = true;
      modalTransform.current = 0;
      modal.style.transition = 'none';
    };

    const handleMove = (clientY: number) => {
      if (!isDragging.current) return;
      
      dragCurrentY.current = clientY;
      const deltaY = dragCurrentY.current - dragStartY.current;
      
      // 下方向のスワイプのみ許可
      if (deltaY > 0) {
        modalTransform.current = deltaY;
        modal.style.transform = `translateY(${deltaY}px)`;
      }
    };

    const handleEnd = () => {
      if (!isDragging.current) return;
      
      const deltaY = dragCurrentY.current - dragStartY.current;
      const threshold = 100; // 閉じるための閾値（px）
      
      modal.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      
      if (deltaY > threshold) {
        // 閉じる
        modal.style.transform = 'translateY(100%)';
        setTimeout(() => {
          onClose();
        }, 300);
      } else {
        // 元に戻す
        modal.style.transform = 'translateY(0)';
      }
      
      isDragging.current = false;
      modalTransform.current = 0;
    };

    const handleTouchStart = (e: TouchEvent) => {
      // モーダル本体またはヘッダー部分でのみスワイプを有効化
      const target = e.target as HTMLElement;
      if (modalBody && modalBody.contains(target) && modalBody.scrollTop > 0) {
        // スクロール可能な場合はスワイプを無効化
        return;
      }
      handleStart(e.touches[0].clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      // モーダル本体がスクロール可能な場合はスワイプを無効化
      if (modalBody && modalBody.scrollTop > 0) {
        return;
      }
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    };

    const handleTouchEnd = () => {
      handleEnd();
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (modalBody && modalBody.contains(target) && modalBody.scrollTop > 0) {
        return;
      }
      handleStart(e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      if (modalBody && modalBody.scrollTop > 0) {
        return;
      }
      e.preventDefault();
      handleMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    // タッチイベント
    modal.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    // マウスイベント
    modal.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // スクロールを無効化
    document.body.style.overflow = 'hidden';

    return () => {
      modal.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      modal.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.overflow = '';
      if (modal) {
        modal.style.transition = '';
        modal.style.transform = '';
      }
    };
  }, [isOpen, onClose]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleProductClick = (productId: string) => {
    // 商品をクリックしたときの処理（ウィジェットに通知など）
    window.location.href = `/product/${productId}`;
  };


  // Portalを使ってdocument.bodyに直接レンダリング
  if (!mounted || !isOpen) {
    return null;
  }

  const modalContent = (
    <>
      {/* オーバーレイ */}
      <div
        className={`outfit-change-overlay ${isOpen ? 'is-open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* モーダル */}
      <div
        ref={modalRef}
        className={`outfit-change-modal ${isOpen ? 'is-open' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '80vh',
          background: 'white',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          zIndex: 10001,
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ドラッグハンドル */}
        <div 
          className="outfit-change-modal-handle"
          style={{
            width: '40px',
            height: '4px',
            background: '#d1d5db',
            borderRadius: '2px',
            margin: '12px auto',
            cursor: 'grab',
          }}
        />

        {/* 商品リストエリア */}
        <div 
          className="outfit-change-modal-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 20px 20px',
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
          ) : Object.keys(categories).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>商品が見つかりませんでした</div>
          ) : (
            Object.entries(categories).map(([categoryName, products]) => (
              <div key={categoryName} className="outfit-change-category" style={{ marginBottom: '24px' }}>
                <h4 
                  className="outfit-change-category-title"
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '12px',
                    color: '#1f2937',
                  }}
                >
                  {categoryName}
                </h4>
                <div 
                  className="outfit-change-product-list"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="outfit-change-product-item"
                      onClick={() => handleProductClick(product.id)}
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        borderRadius: '8px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <div 
                        className="outfit-change-product-image"
                        style={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img 
                          src={product.image} 
                          alt={product.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.jpg';
                          }}
                        />
                      </div>
                      <div 
                        className="outfit-change-product-title"
                        style={{
                          fontSize: '12px',
                          textAlign: 'center',
                          color: '#374151',
                          fontWeight: 500,
                          lineHeight: 1.4,
                        }}
                      >
                        {product.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  // document.bodyにPortalでレンダリング
  return createPortal(modalContent, document.body);
}
