"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PhoneFrame } from "@/features/preview/PhoneFrame";
import { authenticatedFetch } from "@/lib/auth/api-client";

// ============================================================
// ユーティリティ
// ============================================================

/** 背景色の明度に応じてテキスト色を決定する */
function getTextColor(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}


/** ボタンにホバーエフェクトを設定 */
function applyHoverEffect(button: HTMLElement, color: string, hasShadow: boolean) {
  const isWhite = color === "#ffffff" || color === "white";
  button.onmouseenter = () => {
    button.style.background = isWhite ? "#f9fafb" : color;
    button.style.transform = "translateY(-2px) scale(1.02)";
    if (hasShadow) button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  };
  button.onmouseleave = () => {
    button.style.background = color;
    button.style.transform = "translateY(0) scale(1)";
    button.style.boxShadow = hasShadow ? "0 2px 8px rgba(0,0,0,0.1)" : "none";
  };
}

// ============================================================
// ボタンプレビュー
// ============================================================

interface ButtonPreviewProps {
  color: string;
  text: string;
  shape: "circle" | "pill";
  imageUrl: string;
  shopId: string;
  isLoading?: boolean;
}

function ButtonPreview({ 
  color, 
  text,
  shape,
  imageUrl,
  shopId,
  isLoading = false,
}: ButtonPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetElementRef = useRef<HTMLElement | null>(null);
  const movedRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const borderRef = useRef<HTMLDivElement | null>(null);

  const SELECTOR = `[id^="atelier-widget-container-"][data-atelier-product-id*="preview"]`;

  /** ボタンコンテナのスタイルを更新 */
  const applyStyles = (buttonContainer: HTMLElement) => {
    const btn = buttonContainer.querySelector("button") as HTMLElement;
    if (!btn) return;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const baseSize = isMobile ? 48 : 56;
    const textColor = getTextColor(color);

    if (shape === "circle") {
      // 円形ボタン：画像のみ
      const size = baseSize;
      btn.style.cssText = `
        background: ${color} !important;
        border: none !important;
        border-radius: 50% !important;
        width: ${size}px !important;
        height: ${size}px !important;
        min-width: ${size}px !important;
        max-width: ${size}px !important;
        min-height: ${size}px !important;
        max-height: ${size}px !important;
        padding: 1px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
        bottom: auto !important; right: auto !important;
        left: auto !important; top: auto !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
        margin: 0 !important;
        outline: none !important;
        box-sizing: border-box !important;
        z-index: 1 !important;
      `;

      btn.innerHTML = "";
      if (imageUrl) {
        const img = document.createElement("img");
        img.src = imageUrl;
        const imageSize = size - 2; // padding 1px * 2 = 2px
        img.style.cssText = `
          width: ${imageSize}px !important;
          height: ${imageSize}px !important;
          min-width: ${imageSize}px !important;
          min-height: ${imageSize}px !important;
          max-width: ${imageSize}px !important;
          max-height: ${imageSize}px !important;
          object-fit: cover !important;
          object-position: center !important;
          border-radius: 50% !important;
          display: block !important;
          margin: 0 !important;
        `;
        btn.appendChild(img);
      }
    } else {
      // 横長円ボタン：画像と文字
      const height = baseSize;
      // プレビューコンテナの幅を取得
      // containerRefはPhoneFrame内のdivなので、その親要素（PhoneFrame）の幅を取得
      let containerWidth = 280; // デフォルト値
      if (containerRef.current) {
        const phoneFrame = containerRef.current.closest('[class*="PhoneFrame"]') || 
                          containerRef.current.parentElement?.parentElement;
        if (phoneFrame) {
          containerWidth = (phoneFrame as HTMLElement).offsetWidth || 
                          (phoneFrame as HTMLElement).clientWidth || 
                          280;
        }
      }
      // 右端24px、左端24pxの余白を考慮
      const rightMargin = 24;
      const leftMargin = 24;
      const maxAvailableWidth = Math.max(120, containerWidth - rightMargin - leftMargin);
      const desiredWidth = Math.min(containerWidth * 0.5, 300);
      const width = Math.min(desiredWidth, maxAvailableWidth);
      
      btn.style.cssText = `
        background: ${color} !important;
        border: none !important;
        border-radius: ${height / 2}px !important;
        width: ${width}px !important;
        min-width: 120px !important;
        max-width: ${maxAvailableWidth}px !important;
        height: ${height}px !important;
        padding: 0 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 8px !important;
        position: relative !important;
        bottom: auto !important; right: auto !important;
        left: auto !important; top: auto !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
        margin: 0 !important;
        outline: none !important;
        box-sizing: border-box !important;
        z-index: 1 !important;
        overflow: hidden !important;
      `;

      btn.innerHTML = "";

      // 画像（任意）
      if (imageUrl) {
        const img = document.createElement("img");
        img.src = imageUrl;
        const imageSize = height - 16;
        img.style.cssText = `
          width: ${imageSize}px !important;
          height: ${imageSize}px !important;
          min-width: ${imageSize}px !important;
          min-height: ${imageSize}px !important;
          max-width: ${imageSize}px !important;
          max-height: ${imageSize}px !important;
          object-fit: cover !important;
          object-position: center !important;
          border-radius: 50% !important;
          flex-shrink: 0 !important;
          display: block !important;
          margin: 0 !important;
        `;
        btn.appendChild(img);
      }

      // テキスト
      if (text) {
        const textEl = document.createElement("div");
        textEl.textContent = text;
        textEl.style.cssText = `
          font-size: ${isMobile ? 13 : 15}px !important;
          font-weight: 600 !important;
          line-height: 1.2 !important;
          color: ${textColor} !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          flex: 1 !important;
          min-width: 0 !important;
          text-align: left !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        `;
        btn.appendChild(textEl);
      }
    }

    applyHoverEffect(btn, color, true);
  };

  // widget.js読み込み・ボタン初期化（shopId変更時のみ）
  useEffect(() => {
    if (!containerRef.current) return;

    // 既存のプレビュー用コンテナを削除
    document.querySelectorAll(SELECTOR).forEach((el) => el.remove());
    if (widgetElementRef.current) widgetElementRef.current.remove();
    containerRef.current.innerHTML = "";
    movedRef.current = false;

    const moveToPreview = (bc: HTMLElement) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(bc)) { applyStyles(bc); return; }
      if (bc.parentElement !== document.body) return;

      // 非表示にしてから移動
      bc.style.cssText = "display: none !important;";
      const btn = bc.querySelector("button") as HTMLElement;
      if (btn) btn.style.setProperty("display", "none", "important");

      bc.style.cssText = `
        position: absolute !important;
        bottom: 24px !important; right: 24px !important;
        left: auto !important; top: auto !important;
        z-index: 1 !important; display: flex !important;
        align-items: center !important; gap: 12px !important;
        pointer-events: none !important;
        margin: 0 !important; padding: 0 !important;
      `;
      containerRef.current.appendChild(bc);
      movedRef.current = true;
      applyStyles(bc);
    };

    const init = async () => {
      // MutationObserver で widget.js がボタンを追加するのを監視
      observerRef.current = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            const el = node as HTMLElement;
            if (el.id?.startsWith("atelier-widget-container-") &&
                el.getAttribute("data-atelier-product-id")?.includes("preview")) {
              moveToPreview(el);
            }
          });
        }
      });
      observerRef.current.observe(document.body, { childList: true });

      // widget.js 読み込み
      if (!(window as any).AtelierWidget) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = `${window.location.origin}/widget.js`;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Failed to load widget.js"));
          document.head.appendChild(s);
        });
      }
      await new Promise((r) => setTimeout(r, 200));

      if (!containerRef.current) return;
      const el = document.createElement("div");
      el.setAttribute("data-atelier-shop-id", shopId || "preview");
      el.setAttribute("data-atelier-external-product-id", "preview");
      el.style.cssText = "display:flex; align-items:center; justify-content:center; width:100%; height:100%;";
      containerRef.current.appendChild(el);
      widgetElementRef.current = el;

      (window as any).AtelierWidget?.initWidget?.();

      // フォールバック
      const check = () => {
        if (movedRef.current) return;
        const bc = document.querySelector(SELECTOR) as HTMLElement;
        if (bc) moveToPreview(bc);
      };
      setTimeout(check, 100);
      setTimeout(check, 300);
      setTimeout(check, 500);
    };

    init().catch(console.error);

    return () => {
      observerRef.current?.disconnect();
      widgetElementRef.current?.remove();
      document.querySelectorAll(SELECTOR).forEach((el) => el.remove());
      movedRef.current = false;
    };
  }, [shopId]);

  // 設定変更時にスタイルをリアルタイム反映（ロード中はスキップ）
  useEffect(() => {
    if (isLoading) return; // 設定ロード完了前は適用しない
    if (!containerRef.current) return;
    const bc = containerRef.current.querySelector(SELECTOR) as HTMLElement;
    if (bc) applyStyles(bc);
  }, [color, text, shape, imageUrl, isLoading]);

  return (
    <PhoneFrame
      previewContainerRef={containerRef}
      selectedAsset={null}
      borderRef={borderRef}
    >
      <div ref={containerRef} className="absolute inset-0" />
    </PhoneFrame>
  );
}

// ============================================================
// メインページ
// ============================================================

export default function WidgetDesignPage() {
  const { shopId, userRole } = useAuth();
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // ボタン設定（簡素化）
  const [buttonColor, setButtonColor] = useState("#ffffff");
  const [buttonText, setButtonText] = useState(""); // 初期値は空文字列（APIから取得した値で更新される）
  const [buttonShape, setButtonShape] = useState<"circle" | "pill">("pill");
  const [buttonImageUrl, setButtonImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = userRole === "owner";


  // 画像アップロード処理
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "images");

      const response = await authenticatedFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        let errorMessage = error.details 
          ? `${error.error}: ${error.details}${error.hint ? `\n\nヒント: ${error.hint}` : ""}`
          : error.error || "アップロードに失敗しました";
        
        if (error.availableBuckets && error.availableBuckets.length > 0) {
          errorMessage += `\n\n利用可能なバケット: ${error.availableBuckets.join(", ")}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.warning) {
        console.warn("Upload warning:", data.warning);
        toast.info(`アップロード成功: ${data.warning}`);
      }
      
      setButtonImageUrl(data.url);
      toast.success("画像をアップロードしました");
    } catch (error) {
      console.error("Failed to upload image:", error);
      const errorMessage = error instanceof Error ? error.message : "アップロードに失敗しました";
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  // 設定の読み込み（DB）
  useEffect(() => {
    if (!shopId) return;
    setIsLoadingSettings(true);
    authenticatedFetch("/api/widget-design")
      .then((res) => res.json())
      .then((s) => {
        setButtonColor(s.buttonColor || "#ffffff");
        setButtonText(s.buttonText || ""); // APIから取得した値がない場合は空文字列
        setButtonShape(s.buttonShape === "circle" ? "circle" : "pill");
        setButtonImageUrl(s.buttonImageUrl || "");
      })
      .catch((err) => {
        console.error("Failed to load widget design:", err);
      })
      .finally(() => setIsLoadingSettings(false));
  }, [shopId]);

  const handleSave = useCallback(async () => {
    if (!shopId) {
      toast.error("ショップIDが取得できませんでした");
      return;
    }
    setIsSaving(true);
    try {
      const res = await authenticatedFetch("/api/widget-design", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buttonColor,
          buttonText,
          buttonShape,
          buttonImageUrl,
        }),
      });
      if (!res.ok) {
        throw new Error("保存に失敗しました");
      }
      toast.success("設定を保存しました");
    } catch (err) {
      console.error("Failed to save widget design:", err);
      toast.error("設定の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [
    shopId,
    buttonColor,
    buttonText,
    buttonShape,
    buttonImageUrl,
  ]);

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">ウィジェットデザイン設定</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">
              ウィジェットデザイン設定を変更するには、オーナー権限が必要です。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">インターフェース</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 設定フォーム */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本設定 */}
          <Card>
            <CardContent className="pt-6 pb-6">
              <h2 className="text-lg font-semibold mb-4">基本設定</h2>
              <div className="space-y-4">
                {/* ボタンの色 */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">ボタンの色</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="w-12 h-9 p-1 cursor-pointer rounded"
                    />
                    <Input
                      type="text"
                      value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1 h-9 text-sm"
                    />
                  </div>
                </div>

                {/* 形状 */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">形状</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setButtonShape("circle")}
                      className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                        buttonShape === "circle"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`${buttonShape === "circle" ? "w-16 h-16" : "w-12 h-12"} rounded-full border-2 ${
                            buttonShape === "circle" ? "border-blue-500" : "border-gray-300"
                          } bg-white flex items-center justify-center`}
                        >
                          {buttonImageUrl ? (
                            <img
                              src={buttonImageUrl}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200" />
                          )}
                        </div>
                        <span className={`text-xs font-medium ${
                          buttonShape === "circle" ? "text-blue-600" : "text-gray-600"
                        }`}>
                          円形
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setButtonShape("pill")}
                      className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                        buttonShape === "pill"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`${buttonShape === "pill" ? "w-24 h-12" : "w-20 h-10"} rounded-full border-2 ${
                            buttonShape === "pill" ? "border-blue-500" : "border-gray-300"
                          } bg-white flex items-center justify-center gap-2 px-2`}
                        >
                          {buttonImageUrl ? (
                            <img
                              src={buttonImageUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                          )}
                          <div className="h-2 bg-gray-300 rounded flex-1" />
                        </div>
                        <span className={`text-xs font-medium ${
                          buttonShape === "pill" ? "text-blue-600" : "text-gray-600"
                        }`}>
                          横長
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 文言 */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">文言</Label>
                  <Input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="試着する"
                    className="h-9 text-sm"
                    disabled={buttonShape === "circle"}
                  />
                  {buttonShape === "circle" && (
                    <p className="text-xs text-gray-500 mt-1">円形ボタンでは文言は表示されません</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 画像設定 */}
          <Card>
            <CardContent className="pt-6 pb-6">
              <h2 className="text-lg font-semibold mb-4">画像設定</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    <ImageIcon className="h-4 w-4 inline mr-2" />
                    画像
                  </Label>
                  {buttonShape === "circle" && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded mb-2">
                      円形ボタンでは画像が必須です
                    </p>
                  )}
                  {buttonShape === "pill" && (
                    <p className="text-xs text-gray-500 mb-2">
                      横長円ボタンでは画像は任意です
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      value={buttonImageUrl}
                      onChange={(e) => setButtonImageUrl(e.target.value)}
                      className="flex-1 h-9 text-sm"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 px-3"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          アップロード中
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          アップロード
                        </>
                      )}
                    </Button>
                  </div>
                  {buttonImageUrl && (
                    <div className="mt-2">
                      <img
                        src={buttonImageUrl}
                        alt="プレビュー"
                        className={`${buttonShape === "circle" ? "h-16 w-16 rounded-full" : "h-16 w-16 rounded"} object-cover border border-gray-200`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* プレビュー */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardContent className="pt-6 pb-6">
                <h2 className="text-lg font-semibold mb-4">プレビュー</h2>
                <div className="relative flex items-center justify-center bg-gray-100 rounded-lg p-4">
                  <div className="w-full max-w-[280px] aspect-[500/1080]">
                    <ButtonPreview
                      color={buttonColor}
                      text={buttonText}
                      shape={buttonShape}
                      imageUrl={buttonImageUrl}
                      shopId={shopId || ""}
                      isLoading={isLoadingSettings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "保存中..." : "設定を保存"}
        </Button>
      </div>
    </div>
  );
}
