"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon, User, Check, Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { initPreviewPanel } from "@atelier/preview";
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
}

function buildButtonStyle(opts: ButtonStyleOptions): string {
  const { color, radius, width, height, fontSize = 14, borderWidth = 0, borderColor = "#000000", shadow = true } = opts;
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
    justify-content: center !important;
    pointer-events: auto !important;
    cursor: pointer !important;
    border: ${border} !important;
    font-weight: 600 !important;
    font-size: ${fontSize}px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    box-shadow: ${shadow ? "0 2px 8px rgba(0,0,0,0.1)" : "none"} !important;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
    padding: 0 ${Math.max(16, Math.min(32, width * 0.12))}px !important;
    margin: 0 !important; outline: none !important;
    box-sizing: border-box !important;
    line-height: 1 !important; text-align: center !important;
    white-space: nowrap !important;
    backdrop-filter: blur(10px) !important;
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
  text: string;
  color: string;
  radius: number;
  width: number;
  height: number;
  fontSize: number;
  borderWidth: number;
  borderColor: string;
  shadow: boolean;
  shopId: string;
}

function ButtonPreview({ text, color, radius, width, height, fontSize, borderWidth, borderColor, shadow, shopId }: ButtonPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetElementRef = useRef<HTMLElement | null>(null);
  const movedRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const borderRef = useRef<HTMLDivElement | null>(null);

  const SELECTOR = `[id^="atelier-widget-container-"][data-atelier-product-id*="preview"]`;

  /** ボタンコンテナのスタイルを更新 */
  const applyStyles = (buttonContainer: HTMLElement) => {
    // 商品画像アイコンを非表示
    const img = buttonContainer.querySelector("div:first-child") as HTMLElement;
    if (img) img.style.cssText = "display: none !important;";

    const btn = buttonContainer.querySelector("button") as HTMLElement;
    if (!btn) return;

    btn.style.cssText = buildButtonStyle({ color, radius, width, height, fontSize, borderWidth, borderColor, shadow });

    // テキスト変更
    const textNode = Array.from(btn.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE
    ) as Text | undefined;
    if (textNode) textNode.textContent = text || "試着する";

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
  }, [text, color, radius, width, height, fontSize, borderWidth, borderColor, shadow]);

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
// ウィジェットプレビュー（フレーム付き）
// ============================================================

interface WidgetPreviewProps {
  modelUrl?: string;
}

function WidgetPreview({ modelUrl }: WidgetPreviewProps) {
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const borderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!widgetContainerRef.current) return;

    instanceRef.current?.destroy?.();
    widgetContainerRef.current.innerHTML = "";

    const apiBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
    instanceRef.current = initPreviewPanel({
      container: widgetContainerRef.current,
      apiBaseUrl,
      modelUrl,
      initialHeight: 170,
      minHeight: 150,
      maxHeight: 190,
      availableSizes: ["S", "M", "L", "XL"],
      initialSize: "M",
    });

    return () => { instanceRef.current?.destroy?.(); };
  }, [modelUrl]);

  return (
    <PhoneFrame
      previewContainerRef={widgetContainerRef}
      selectedAsset={null}
      borderRef={borderRef}
    >
      <div
        ref={widgetContainerRef}
        style={{
          position: 'absolute',
          left: '0px',
          top: '0px',
          width: '100%',
          height: '100%',
          zIndex: 10,
        }}
      />
    </PhoneFrame>
  );
}

// ============================================================
// メインページ
// ============================================================

// 利用可能なモデル一覧（現在は1体のみ）
const AVAILABLE_MODELS = [
  {
    id: "clo_model_men",
    name: "メンズモデル",
    url: "/3d/clo_model_men.glb",
    thumbnail: "/3d/clo_model_men.glb", // サムネイルがない場合はモデルURLを使用
  },
];

export default function WidgetDesignPage() {
  const { shopId, userRole } = useAuth();
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // ウィジェット設定
  const [backgroundImage, setBackgroundImage] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#f5f5f5");
  const [selectedModelId, setSelectedModelId] = useState<string>("clo_model_men");
  const [widgetTheme, setWidgetTheme] = useState<"light" | "dark">("light");
  // ボタン設定
  const [buttonText, setButtonText] = useState("試着する");
  const [buttonColor, setButtonColor] = useState("#ffffff");
  const [buttonRadius, setButtonRadius] = useState(8);
  const [buttonWidth, setButtonWidth] = useState(200);
  const [buttonHeight, setButtonHeight] = useState(56);
  const [buttonFontSize, setButtonFontSize] = useState(14);
  const [buttonBorderWidth, setButtonBorderWidth] = useState(0);
  const [buttonBorderColor, setButtonBorderColor] = useState("#000000");
  const [buttonShadow, setButtonShadow] = useState(true);

  const isOwner = userRole === "owner";

  // 選択されたモデルのURLを取得
  const modelUrl = AVAILABLE_MODELS.find(m => m.id === selectedModelId)?.url || "";

  // 設定の読み込み（DB）
  useEffect(() => {
    if (!shopId) return;
    setIsLoadingSettings(true);
    authenticatedFetch("/api/widget-design")
      .then((res) => res.json())
      .then((s) => {
      setBackgroundImage(s.backgroundImage || "");
        setBackgroundColor(s.backgroundColor || "#f5f5f5");
      setSelectedModelId(s.selectedModelId || "clo_model_men");
        setWidgetTheme(s.widgetTheme || "light");
      setButtonText(s.buttonText || "試着する");
      setButtonColor(s.buttonColor || "#ffffff");
      setButtonRadius(s.buttonRadius ?? 8);
      setButtonWidth(s.buttonWidth ?? 200);
      setButtonHeight(s.buttonHeight ?? 56);
        setButtonFontSize(s.buttonFontSize ?? 14);
        setButtonBorderWidth(s.buttonBorderWidth ?? 0);
        setButtonBorderColor(s.buttonBorderColor || "#000000");
        setButtonShadow(s.buttonShadow ?? true);
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
          backgroundImage, backgroundColor, selectedModelId, widgetTheme,
          buttonText, buttonColor, buttonRadius, buttonWidth, buttonHeight,
          buttonFontSize, buttonBorderWidth, buttonBorderColor, buttonShadow,
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
    shopId, backgroundImage, backgroundColor, selectedModelId, widgetTheme,
    buttonText, buttonColor, buttonRadius, buttonWidth, buttonHeight,
    buttonFontSize, buttonBorderWidth, buttonBorderColor, buttonShadow,
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
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">インターフェース</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {/* ウィジェット設定 */}
      <Card>
          <CardContent className="pt-4 pb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">ウィジェット</h3>
            <div className="flex gap-4">
            {/* 編集フォーム */}
              <div className="space-y-3 flex-1 min-w-0">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                  背景画像URL
                </Label>
                <Input
                  type="text"
                  placeholder="https://example.com/background.jpg"
                  value={backgroundImage}
                  onChange={(e) => setBackgroundImage(e.target.value)}
                    className="h-8 text-sm"
                />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">背景色</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-8 p-0.5 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      placeholder="#f5f5f5"
                      className="flex-1 h-8 text-sm"
                    />
                  </div>
              </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    基本モデル
                </Label>
                  <div className="flex gap-2">
                  {AVAILABLE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModelId(model.id)}
                        className={`relative border rounded-md px-3 py-1.5 transition-all text-xs font-medium ${
                        selectedModelId === model.id
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      {selectedModelId === model.id && (
                          <Check className="inline h-3 w-3 mr-1" />
                        )}
                        {model.name}
                      </button>
                    ))}
                        </div>
                      </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">テーマ</Label>
                  <div className="flex gap-2">
                    {(["light", "dark"] as const).map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => setWidgetTheme(theme)}
                        className={`flex items-center gap-1.5 border rounded-md px-3 py-1.5 transition-all text-xs font-medium ${
                          widgetTheme === theme
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-600"
                        }`}
                      >
                        {theme === "light" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                        {theme === "light" ? "ライト" : "ダーク"}
                    </button>
                  ))}
                  </div>
                </div>
              </div>
              {/* プレビュー */}
              <div className="relative flex-shrink-0 overflow-hidden" style={{ width: "280px", height: "580px" }}>
              <WidgetPreview modelUrl={modelUrl} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ボタン設定 */}
      <Card>
          <CardContent className="pt-4 pb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">試着するボタン</h3>
            <div className="flex gap-4">
            {/* 編集フォーム */}
              <div className="space-y-3 flex-1 min-w-0">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">ボタン文言</Label>
                <Input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="試着する"
                    className="h-8 text-sm"
                />
              </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">ボタン色</Label>
                  <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                      className="w-10 h-8 p-0.5 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    placeholder="#000000"
                      className="flex-1 h-8 text-sm"
                  />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">幅</Label>
                    <Input type="number" min="100" max="500" value={buttonWidth} onChange={(e) => setButtonWidth(Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">高さ</Label>
                    <Input type="number" min="32" max="100" value={buttonHeight} onChange={(e) => setButtonHeight(Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">角丸</Label>
                    <Input type="number" min="0" max="50" value={buttonRadius} onChange={(e) => setButtonRadius(Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">文字サイズ</Label>
                    <Input type="number" min="10" max="24" value={buttonFontSize} onChange={(e) => setButtonFontSize(Number(e.target.value))} className="h-8 text-sm" />
              </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">ボーダー</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min="0" max="5" value={buttonBorderWidth} onChange={(e) => setButtonBorderWidth(Number(e.target.value))} className="w-16 h-8 text-sm" />
                    <span className="text-xs text-gray-400">px</span>
                    <Input
                      type="color"
                      value={buttonBorderColor}
                      onChange={(e) => setButtonBorderColor(e.target.value)}
                      className="w-10 h-8 p-0.5 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={buttonBorderColor}
                      onChange={(e) => setButtonBorderColor(e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
              </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500">影</Label>
                  <Switch checked={buttonShadow} onCheckedChange={setButtonShadow} />
                </div>
              </div>
              {/* プレビュー */}
              <div className="relative flex-shrink-0 overflow-hidden" style={{ width: "280px", height: "580px" }}>
              <ButtonPreview
                text={buttonText}
                color={buttonColor}
                radius={buttonRadius}
                width={buttonWidth}
                height={buttonHeight}
                  fontSize={buttonFontSize}
                  borderWidth={buttonBorderWidth}
                  borderColor={buttonBorderColor}
                  shadow={buttonShadow}
                shopId={shopId || ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* 保存ボタン（共通） */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "保存中..." : "設定を保存"}
        </Button>
      </div>
    </div>
  );
}
