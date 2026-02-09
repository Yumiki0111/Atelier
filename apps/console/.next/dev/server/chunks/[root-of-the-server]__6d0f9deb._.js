module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/atelier/apps/console/src/lib/supabase/server.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabaseAdmin",
    ()=>supabaseAdmin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://aeuccvcdwijoojfcgjjs.supabase.co");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
}) : null;
}),
"[project]/atelier/apps/console/src/app/api/public/widget-config/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "OPTIONS",
    ()=>OPTIONS
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/server.ts [app-route] (ecmascript)");
;
;
/**
 * Widget Config 公開API
 * 
 * pubkey + external_product_id から最新の3DモデルURLを返す
 * 
 * クエリパラメータ:
 * - publicKey: widget_keys.public_key（必須）
 * - externalProductId: products.external_product_id（必須）
 * 
 * レスポンス:
 * - { enabled: true, asset: { defaultSize: "M", sizes: { "S": { glbUrl: "..." }, "M": { glbUrl: "..." }, "L": { glbUrl: "..." } } } } または { enabled: false }
 */ // CORSヘッダーを設定するヘルパー関数
function setCorsHeaders(response, request) {
    const origin = request.headers.get("origin");
    if (origin) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type");
        response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return response;
}
async function OPTIONS(request) {
    const response = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](null, {
        status: 200
    });
    return setCorsHeaders(response, request);
}
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const publicKey = searchParams.get("publicKey");
        const externalProductId = searchParams.get("externalProductId");
        if (!publicKey || !externalProductId) {
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                enabled: false,
                error: "publicKey and externalProductId are required"
            }, {
                status: 400
            });
            return setCorsHeaders(response, request);
        }
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
            console.error("[widget-config API] Database not configured");
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                enabled: false
            }, {
                status: 500
            });
            return setCorsHeaders(response, request);
        }
        // 1. public_key から shop_id を取得（enabled=true のみ）
        const { data: widgetKey, error: keyError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("widget_keys").select("shop_id, allowed_domains").eq("public_key", publicKey).eq("enabled", true).single();
        if (keyError || !widgetKey) {
            console.warn("[widget-config API] Invalid or disabled public_key:", publicKey);
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                enabled: false
            });
            return setCorsHeaders(response, request);
        }
        // 2. ドメイン検証
        const origin = request.headers.get("origin") || request.headers.get("referer");
        if (origin) {
            try {
                const url = new URL(origin);
                const host = url.host; // 例: "example.com" または "sub.example.com"
                const allowedDomains = widgetKey.allowed_domains || [];
                // ドメイン検証ロジック
                const isAllowed = allowedDomains.some((domain)=>{
                    // 完全一致
                    if (host === domain) {
                        return true;
                    }
                    // サブドメイン許可（例: "example.com" が許可されていれば "sub.example.com" もOK）
                    if (host.endsWith(`.${domain}`)) {
                        return true;
                    }
                    return false;
                });
                if (!isAllowed) {
                    console.warn("[widget-config API] Domain not allowed:", host);
                    const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        enabled: false,
                        error: `ドメイン "${host}" が許可されていません。設定画面で許可ドメインに追加してください。`
                    });
                    return setCorsHeaders(response, request);
                }
            } catch (urlError) {
                console.error("[widget-config API] Invalid origin URL:", origin, urlError);
                const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    enabled: false
                });
                return setCorsHeaders(response, request);
            }
        } else {
            console.warn("[widget-config API] No origin or referer header");
            // Origin/Referer がない場合は拒否
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                enabled: false
            });
            return setCorsHeaders(response, request);
        }
        // 3. products を (shop_id, external_product_id) で検索（category, thumbnailUrlも取得）
        const { data: product, error: productError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("products").select("id, name, category, thumbnail_url").eq("shop_id", widgetKey.shop_id).eq("external_product_id", externalProductId).single();
        if (productError || !product) {
            console.warn("[widget-config API] Product not found:", {
                shop_id: widgetKey.shop_id,
                external_product_id: externalProductId
            });
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                enabled: false,
                error: `商品が見つかりません。external_product_id: "${externalProductId}" が正しく登録されているか確認してください。`
            });
            return setCorsHeaders(response, request);
        }
        // 4. assets を (shop_id, product_id) で取得（サイズごとに最新バージョン、カテゴリー情報も含む）
        // まずアセットを取得（productsテーブルとのJOINは後で行う）
        const { data: allAssets, error: assetsError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("assets").select("size, glb_url, model_url, version, created_at, is_active, product_id").eq("shop_id", widgetKey.shop_id).eq("product_id", product.id).order("size", {
            ascending: true
        }).order("created_at", {
            ascending: false
        });
        // アセットにカテゴリー情報を追加（既に取得済みのproduct.categoryを使用）
        const category = product.category || undefined;
        const assetsWithCategory = allAssets?.map((asset)=>({
                ...asset,
                category
            })) || [];
        if (assetsError) {
            console.error("[widget-config API] Error fetching assets:", assetsError);
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                enabled: false,
                error: "Failed to fetch assets",
                details: assetsError.message
            });
            return setCorsHeaders(response, request);
        }
        if (!assetsWithCategory || assetsWithCategory.length === 0) {
            console.warn("[widget-config API] No assets found for product:", {
                productId: product.id,
                shopId: widgetKey.shop_id,
                externalProductId: externalProductId
            });
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                enabled: false,
                error: "No assets found for this product"
            });
            return setCorsHeaders(response, request);
        }
        // サイズごと、カテゴリーごとに最新バージョンのアセットを取得（is_activeがtrueのものを優先）
        // Map<size, Map<category, asset>>
        const assetsBySizeAndCategory = new Map();
        for (const asset of assetsWithCategory){
            const size = asset.size;
            // カテゴリー情報を取得（既に追加済み）
            const category = asset.category;
            const categoryKey = category || "default"; // カテゴリーがない場合は"default"を使用
            // サイズごとのマップを取得または作成
            if (!assetsBySizeAndCategory.has(size)) {
                assetsBySizeAndCategory.set(size, new Map());
            }
            const categoryMap = assetsBySizeAndCategory.get(size);
            const existing = categoryMap.get(categoryKey);
            // まだ登録されていない、またはより新しいバージョン、またはis_activeがtrueの場合
            if (!existing || asset.version > existing.version || asset.is_active && !existing.isActive) {
                // model_urlを優先、なければglb_urlを使用
                const modelUrl = asset.model_url || asset.glb_url;
                categoryMap.set(categoryKey, {
                    glbUrl: asset.glb_url || undefined,
                    modelUrl: modelUrl || undefined,
                    version: asset.version,
                    isActive: asset.is_active ?? true,
                    category
                });
            }
        }
        if (assetsBySizeAndCategory.size === 0) {
            console.warn("[widget-config API] No valid assets found for product:", product.id);
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                enabled: false
            });
            return setCorsHeaders(response, request);
        }
        // サイズごとのアセットリストを構築（複数のカテゴリーのアセットを含む）
        const sizes = {};
        let defaultSize;
        for (const [size, categoryMap] of assetsBySizeAndCategory.entries()){
            // カテゴリーごとのアセットを配列に変換
            const assets = [];
            for (const [categoryKey, asset] of categoryMap.entries()){
                assets.push({
                    glbUrl: asset.glbUrl || undefined,
                    modelUrl: asset.modelUrl || undefined,
                    category: asset.category
                });
            }
            sizes[size] = assets;
            // デフォルトサイズは最初に見つかったサイズ、または"M"があれば"M"
            if (!defaultSize || size === "M") {
                defaultSize = size;
            }
        }
        // Mがなければ最初のサイズをデフォルトに
        if (!defaultSize) {
            defaultSize = Array.from(assetsBySizeAndCategory.keys())[0] || undefined;
        }
        // 5. 成功レスポンス（サイズごとのアセット情報を含む）
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            enabled: true,
            asset: {
                defaultSize,
                sizes,
                productName: product.name,
                thumbnailUrl: product.thumbnail_url || undefined
            }
        });
        return setCorsHeaders(response, request);
    } catch (error) {
        console.error("[widget-config API] Unexpected error:", error);
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            enabled: false
        }, {
            status: 500
        });
        return setCorsHeaders(response, request);
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__6d0f9deb._.js.map