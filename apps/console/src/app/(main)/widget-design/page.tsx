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

/** ボタンのインラインスタイルを生成 */
interface ButtonStyleOptions {
  color: string;
  radius: number;
  width: number;
  height: number;
  fontSize?: number;
  borderWidth?: number;
  borderColor?: string;
  shadow?: boolean;
  imageUrl?: string;
  imageRadius?: number;
  hasImage?: boolean;
  title?: string;
  hasTitle?: boolean;
  subtitle?: string;
  hasSubtitle?: boolean;
}

function buildButtonStyle(opts: ButtonStyleOptions): string {
  const { 
    color, 
    radius, 
    width, 
    height, 
    fontSize = 14, 
    borderWidth = 0, 
    borderColor = "#000000", 
    shadow = true,
    imageRadius = 0,
  } = opts;
  const isWhite = color === "#ffffff" || color === "white";
  const border = borderWidth > 0
    ? `${borderWidth}px solid ${borderColor}`
    : isWhite ? "2px solid #e5e7eb" : "none";
  return `
    background: ${color} !important;
    border-radius: ${radius}px !important;
    width: ${width}px !important;
    min-width: ${width}px !important;
    height: ${height}px !important;
    color: ${getTextColor(color)} !important;
    position: relative !important;
    bottom: auto !important; right: auto !important;
    left: auto !important; top: auto !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    pointer-events: auto !important;
    cursor: pointer !important;
    border: ${border} !important;
    font-weight: 600 !important;
    font-size: ${fontSize}px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    box-shadow: ${shadow ? "0 2px 8px rgba(0,0,0,0.1)" : "none"} !important;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
    padding: 12px 16px !important;
    margin: 0 !important; outline: none !important;
    box-sizing: border-box !important;
    gap: 12px !important;
    z-index: 1 !important;
  `;
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
  radius: number;
  width: number;
  height: number;
  fontSize: number;
  borderWidth: number;
  borderColor: string;
  shadow: boolean;
  imageUrl: string;
  imageRadius: number;
  hasImage: boolean;
  title: string;
  hasTitle: boolean;
  subtitle: string;
  hasSubtitle: boolean;
  shopId: string;
}

function ButtonPreview({ 
  color, 
  radius, 
  width, 
  height, 
  fontSize, 
  borderWidth, 
  borderColor, 
  shadow,
  imageUrl,
  imageRadius,
  hasImage,
  title,
  hasTitle,
  subtitle,
  hasSubtitle,
  shopId 
}: ButtonPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetElementRef = useRef<HTMLElement | null>(null);
  const movedRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const borderRef = useRef<HTMLDivElement | null>(null);

  const SELECTOR = `[id^="atelier-widget-container-"][data-atelier-product-id*="preview"]`;

  /** フォントサイズを自動計算 */
  const calculateFontSize = (
    text: string,
    isSubtitle: boolean,
    buttonHeight: number,
    hasImage: boolean
  ): number => {
    // 基本フォントサイズをボタンの高さに基づいて計算（高さの約25-30%）
    let baseSize = Math.max(12, Math.min(20, buttonHeight * 0.25));
    
    // 画像がある場合は少し小さく（利用可能な幅が減るため）
    if (hasImage) {
      baseSize *= 0.9;
    }
    
    // 小見出しは見出しより小さく（約75-80%）
    if (isSubtitle) {
      baseSize *= 0.75;
    }
    
    // 文字数に応じて調整（長い場合は小さく）
    const textLength = text.length;
    if (textLength > 20) {
      baseSize *= 0.85;
    } else if (textLength > 15) {
      baseSize *= 0.9;
    } else if (textLength > 10) {
      baseSize *= 0.95;
    }
    
    // 最小・最大サイズを設定
    const minSize = isSubtitle ? 10 : 12;
    const maxSize = isSubtitle ? 16 : 20;
    
    return Math.max(minSize, Math.min(maxSize, Math.round(baseSize)));
  };

  /** ボタンコンテナのスタイルを更新 */
  const applyStyles = (buttonContainer: HTMLElement) => {
    const btn = buttonContainer.querySelector("button") as HTMLElement;
    if (!btn) return;

    btn.style.cssText = buildButtonStyle({ 
      color, 
      radius, 
      width, 
      height, 
      fontSize, 
      borderWidth, 
      borderColor, 
      shadow,
      imageRadius,
    });

    // ボタンの中身を再構築
    btn.innerHTML = "";

    // 画像
    if (hasImage && imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      // ボタンの高さギリギリにする（上下のpadding 12px * 2 = 24pxを考慮）
      const imageSize = height - 24;
      img.style.cssText = `
        width: ${imageSize}px !important;
        height: ${imageSize}px !important;
        min-width: ${imageSize}px !important;
        min-height: ${imageSize}px !important;
        max-width: ${imageSize}px !important;
        max-height: ${imageSize}px !important;
        object-fit: cover !important;
        object-position: center !important;
        border-radius: ${imageRadius}px !important;
        flex-shrink: 0 !important;
        aspect-ratio: 1 / 1 !important;
        display: block !important;
        margin: 0 !important;
      `;
      btn.appendChild(img);
    }

    // テキストコンテナ
    if (hasTitle || hasSubtitle) {
      const textContainer = document.createElement("div");
      textContainer.style.cssText = `
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        justify-content: center !important;
        flex: 1 !important;
        min-width: 0 !important;
      `;

      // 見出し
      if (hasTitle && title) {
        const titleFontSize = calculateFontSize(title, false, height, hasImage);
        const titleEl = document.createElement("div");
        titleEl.textContent = title;
        titleEl.style.cssText = `
          font-size: ${titleFontSize}px !important;
          font-weight: 600 !important;
          line-height: 1.2 !important;
          color: ${getTextColor(color)} !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          width: 100% !important;
          text-align: left !important;
        `;
        textContainer.appendChild(titleEl);
      }

      // 小見出し
      if (hasSubtitle && subtitle && hasTitle && title) {
        const subtitleFontSize = calculateFontSize(subtitle, true, height, hasImage);
        const subtitleEl = document.createElement("div");
        subtitleEl.textContent = subtitle;
        subtitleEl.style.cssText = `
          font-size: ${subtitleFontSize}px !important;
          font-weight: 400 !important;
          line-height: 1.2 !important;
          color: ${getTextColor(color)} !important;
          opacity: 0.8 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          width: 100% !important;
          margin-top: 2px !important;
          text-align: left !important;
        `;
        textContainer.appendChild(subtitleEl);
      }

      btn.appendChild(textContainer);
    }

    applyHoverEffect(btn, color, shadow);
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

  // 設定変更時にスタイルをリアルタイム反映
  useEffect(() => {
    if (!containerRef.current) return;
    const bc = containerRef.current.querySelector(SELECTOR) as HTMLElement;
    if (bc) applyStyles(bc);
  }, [color, radius, width, height, fontSize, borderWidth, borderColor, shadow, imageUrl, imageRadius, hasImage, title, hasTitle, subtitle, hasSubtitle]);

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
  
  // ボタン設定
  const [buttonColor, setButtonColor] = useState("#ffffff");
  const [buttonRadius, setButtonRadius] = useState(8);
  const [buttonWidth, setButtonWidth] = useState(200);
  const [buttonHeight, setButtonHeight] = useState(56);
  const [buttonFontSize, setButtonFontSize] = useState(14);
  const [buttonBorderWidth, setButtonBorderWidth] = useState(0);
  const [buttonBorderColor, setButtonBorderColor] = useState("#000000");
  const [buttonShadow, setButtonShadow] = useState(true);
  
  // ボタンコンテンツ設定
  const [buttonImageUrl, setButtonImageUrl] = useState("");
  const [buttonImageRadius, setButtonImageRadius] = useState(0);
  const [hasImage, setHasImage] = useState(false);
  const [buttonTitle, setButtonTitle] = useState("試着する");
  const [hasTitle, setHasTitle] = useState(true);
  const [buttonSubtitle, setButtonSubtitle] = useState("");
  const [hasSubtitle, setHasSubtitle] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 数値入力の一時的な文字列state（削除可能にするため）
  const [tempWidth, setTempWidth] = useState<string | null>(null);
  const [tempHeight, setTempHeight] = useState<string | null>(null);
  const [tempRadius, setTempRadius] = useState<string | null>(null);
  const [tempBorderWidth, setTempBorderWidth] = useState<string | null>(null);
  const [tempImageRadius, setTempImageRadius] = useState<string | null>(null);
  const [tempFontSize, setTempFontSize] = useState<string | null>(null);

  const isOwner = userRole === "owner";

  // 数値入力のヘルパー関数
  const handleNumberChange = (
    value: string,
    setter: (val: number) => void,
    min: number,
    max: number,
    defaultValue: number
  ) => {
    // 空文字列の場合はそのまま空文字列として扱う（削除可能にする）
    if (value === "") {
      setter(defaultValue);
      return;
    }
    // 先頭の0を削除
    const cleaned = value.replace(/^0+/, "");
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) {
      setter(defaultValue);
    } else {
      setter(Math.max(min, Math.min(max, num)));
    }
  };

  const handleNumberBlur = (
    value: string,
    setter: (val: number) => void,
    min: number,
    max: number,
    defaultValue: number
  ) => {
    const num = parseInt(value.replace(/^0+/, ""), 10);
    if (isNaN(num) || value === "") {
      setter(defaultValue);
    } else {
      setter(Math.max(min, Math.min(max, num)));
    }
  };

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
      setHasImage(true);
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
        setButtonRadius(s.buttonRadius ?? 8);
        setButtonWidth(s.buttonWidth ?? 200);
        setButtonHeight(s.buttonHeight ?? 56);
        setButtonFontSize(s.buttonFontSize ?? 14);
        setButtonBorderWidth(s.buttonBorderWidth ?? 0);
        setButtonBorderColor(s.buttonBorderColor || "#000000");
        setButtonShadow(s.buttonShadow ?? true);
        setButtonImageUrl(s.buttonImageUrl || "");
        setButtonImageRadius(s.buttonImageRadius ?? 0);
        setHasImage(s.hasImage ?? false);
        setButtonTitle(s.buttonTitle || "試着する");
        setHasTitle(s.hasTitle ?? true);
        setButtonSubtitle(s.buttonSubtitle || "");
        setHasSubtitle(s.hasSubtitle ?? false);
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
          buttonRadius,
          buttonWidth,
          buttonHeight,
          buttonFontSize,
          buttonBorderWidth,
          buttonBorderColor,
          buttonShadow,
          buttonImageUrl,
          buttonImageRadius,
          hasImage,
          buttonTitle,
          hasTitle,
          buttonSubtitle,
          hasSubtitle,
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
    buttonRadius,
    buttonWidth,
    buttonHeight,
    buttonFontSize,
    buttonBorderWidth,
    buttonBorderColor,
    buttonShadow,
    buttonImageUrl,
    buttonImageRadius,
    hasImage,
    buttonTitle,
    hasTitle,
    buttonSubtitle,
    hasSubtitle,
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
                {/* ボタンサイズ */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">サイズ</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">幅 (px)</Label>
                      <Input 
                        type="text" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={tempWidth ?? String(buttonWidth)} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "").replace(/^0+/, "");
                          setTempWidth(val);
                          if (val !== "") {
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) {
                              setButtonWidth(Math.max(100, Math.min(500, num)));
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setTempWidth(null);
                          if (val === "") {
                            setButtonWidth(200);
                          } else {
                            handleNumberBlur(val, setButtonWidth, 100, 500, 200);
                          }
                        }}
                        className="h-9 text-sm" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">高さ (px)</Label>
                      <Input 
                        type="text" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={tempHeight ?? String(buttonHeight)} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "").replace(/^0+/, "");
                          setTempHeight(val);
                          if (val !== "") {
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) {
                              setButtonHeight(Math.max(32, Math.min(100, num)));
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setTempHeight(null);
                          if (val === "") {
                            setButtonHeight(56);
                          } else {
                            handleNumberBlur(val, setButtonHeight, 32, 100, 56);
                          }
                        }}
                        className="h-9 text-sm" 
                      />
                    </div>
                  </div>
                </div>

                {/* ボタン色 */}
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

                {/* 角丸 */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">角丸 (px)</Label>
                  <Input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={tempRadius ?? String(buttonRadius)} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").replace(/^0+/, "");
                      setTempRadius(val);
                      if (val !== "") {
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                          setButtonRadius(Math.max(0, Math.min(50, num)));
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setTempRadius(null);
                      if (val === "") {
                        setButtonRadius(8);
                      } else {
                        handleNumberBlur(val, setButtonRadius, 0, 50, 8);
                      }
                    }}
                    className="h-9 text-sm" 
                  />
                </div>

                {/* ボーダー */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">ボーダー</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tempBorderWidth ?? String(buttonBorderWidth)} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "").replace(/^0+/, "");
                        setTempBorderWidth(val);
                        if (val !== "") {
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) {
                            setButtonBorderWidth(Math.max(0, Math.min(5, num)));
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setTempBorderWidth(null);
                        if (val === "") {
                          setButtonBorderWidth(0);
                        } else {
                          handleNumberBlur(val, setButtonBorderWidth, 0, 5, 0);
                        }
                      }}
                      className="w-20 h-9 text-sm" 
                    />
                    <span className="text-xs text-gray-500">px</span>
                    <Input
                      type="color"
                      value={buttonBorderColor}
                      onChange={(e) => setButtonBorderColor(e.target.value)}
                      className="w-12 h-9 p-1 cursor-pointer rounded"
                    />
                    <Input
                      type="text"
                      value={buttonBorderColor}
                      onChange={(e) => setButtonBorderColor(e.target.value)}
                      className="flex-1 h-9 text-sm"
                    />
                  </div>
                </div>

                {/* 影 */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">影を表示</Label>
                    <p className="text-xs text-gray-500 mt-0.5">ボタンに影を付けます</p>
                  </div>
                  <Switch checked={buttonShadow} onCheckedChange={setButtonShadow} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* コンテンツ設定 */}
          <Card>
            <CardContent className="pt-6 pb-6">
              <h2 className="text-lg font-semibold mb-4">コンテンツ設定</h2>
              <div className="space-y-6">
                {/* 画像設定 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        画像を表示
                      </Label>
                      <p className="text-xs text-gray-500 mt-0.5">ボタン左側に画像を表示します</p>
                    </div>
                    <Switch checked={hasImage} onCheckedChange={setHasImage} />
                  </div>
                  {hasImage && (
                    <div className="space-y-3 pl-6 border-l-2 border-gray-200">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">画像URL</Label>
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
                              className="h-16 w-16 object-cover rounded border border-gray-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">画像の角丸 (px)</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={tempImageRadius ?? String(buttonImageRadius)}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "").replace(/^0+/, "");
                              setTempImageRadius(val);
                              if (val !== "") {
                                const num = parseInt(val, 10);
                                if (!isNaN(num)) {
                                  setButtonImageRadius(Math.max(0, Math.min(50, num)));
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setTempImageRadius(null);
                              if (val === "") {
                                setButtonImageRadius(0);
                              } else {
                                handleNumberBlur(val, setButtonImageRadius, 0, 50, 0);
                              }
                            }}
                            className="h-9 text-sm"
                          />
                      </div>
                    </div>
                  )}
                </div>

                {/* 見出し設定 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">見出しを表示</Label>
                      <p className="text-xs text-gray-500 mt-0.5">ボタンにメインのテキストを表示します</p>
                    </div>
                    <Switch checked={hasTitle} onCheckedChange={setHasTitle} />
                  </div>
                  {hasTitle && (
                    <div className="pl-6 border-l-2 border-gray-200">
                      <Label className="text-xs text-gray-500 mb-1 block">見出しテキスト</Label>
                      <Input
                        type="text"
                        placeholder="試着する"
                        value={buttonTitle}
                        onChange={(e) => setButtonTitle(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* 小見出し設定 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">小見出しを表示</Label>
                      <p className="text-xs text-gray-500 mt-0.5">見出しの下にサブテキストを表示します</p>
                    </div>
                    <Switch 
                      checked={hasSubtitle} 
                      onCheckedChange={setHasSubtitle}
                      disabled={!hasTitle}
                    />
                  </div>
                  {hasSubtitle && hasTitle && (
                    <div className="pl-6 border-l-2 border-gray-200">
                      <Label className="text-xs text-gray-500 mb-1 block">小見出しテキスト</Label>
                      <Input
                        type="text"
                        placeholder="3Dで試着"
                        value={buttonSubtitle}
                        onChange={(e) => setButtonSubtitle(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                  {hasSubtitle && !hasTitle && (
                    <div className="pl-6 border-l-2 border-gray-200">
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">見出しを有効にすると小見出しを設定できます</p>
                    </div>
                  )}
                </div>

                  {/* 文字サイズ */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">文字サイズ (px)</Label>
                  <Input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={tempFontSize ?? String(buttonFontSize)} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").replace(/^0+/, "");
                      setTempFontSize(val);
                      if (val !== "") {
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                          setButtonFontSize(Math.max(10, Math.min(24, num)));
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setTempFontSize(null);
                      if (val === "") {
                        setButtonFontSize(14);
                      } else {
                        handleNumberBlur(val, setButtonFontSize, 10, 24, 14);
                      }
                    }}
                    className="h-9 text-sm" 
                  />
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
                  radius={buttonRadius}
                  width={buttonWidth}
                  height={buttonHeight}
                  fontSize={buttonFontSize}
                  borderWidth={buttonBorderWidth}
                  borderColor={buttonBorderColor}
                  shadow={buttonShadow}
                  imageUrl={buttonImageUrl}
                  imageRadius={buttonImageRadius}
                  hasImage={hasImage}
                  title={buttonTitle}
                  hasTitle={hasTitle}
                  subtitle={buttonSubtitle}
                  hasSubtitle={hasSubtitle}
                  shopId={shopId || ""}
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
