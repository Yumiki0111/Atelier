(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/atelier/apps/console/src/lib/auth/api-client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authenticatedFetch",
    ()=>authenticatedFetch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/client.ts [app-client] (ecmascript)");
"use client";
;
async function authenticatedFetch(url, options = {}) {
    try {
        console.log("[authenticatedFetch] Starting, url:", url);
        console.log("[authenticatedFetch] Getting session...");
        const { data: { session }, error: sessionError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
        console.log("[authenticatedFetch] Session retrieved:", {
            hasSession: !!session,
            hasError: !!sessionError
        });
        if (sessionError) {
            console.error("[authenticatedFetch] Error getting session:", sessionError);
            throw new Error("セッションの取得に失敗しました");
        }
        const headers = new Headers(options.headers);
        if (session?.access_token) {
            headers.set("Authorization", `Bearer ${session.access_token}`);
            console.log("[authenticatedFetch] Authorization header set");
        } else {
            console.warn("[authenticatedFetch] No session found, making request without auth token");
        }
        console.log("[authenticatedFetch] Making fetch request to:", url);
        const response = await fetch(url, {
            ...options,
            headers
        });
        console.log("[authenticatedFetch] Fetch completed, status:", response.status);
        return response;
    } catch (error) {
        console.error("[authenticatedFetch] Error:", error);
        throw error;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/lib/errors/error-handler.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * エラーハンドリング用のヘルパー関数
 */ __turbopack_context__.s([
    "extractErrorMessage",
    ()=>extractErrorMessage,
    "getErrorMessage",
    ()=>getErrorMessage,
    "getErrorType",
    ()=>getErrorType,
    "translateErrorMessage",
    ()=>translateErrorMessage
]);
async function extractErrorMessage(response) {
    try {
        const data = await response.json();
        if (data.error) {
            return data.error;
        }
        if (data.message) {
            return data.message;
        }
    } catch  {
    // JSON解析に失敗した場合は、ステータスコードからメッセージを生成
    }
    // ステータスコードに基づいてデフォルトメッセージを返す
    switch(response.status){
        case 400:
            return "リクエストが無効です";
        case 401:
            return "認証が必要です。再度ログインしてください";
        case 403:
            return "この操作を実行する権限がありません";
        case 404:
            return "リソースが見つかりませんでした";
        case 409:
            return "競合が発生しました。既に存在する可能性があります";
        case 422:
            return "入力データが無効です";
        case 500:
            return "サーバーエラーが発生しました。しばらくしてから再度お試しください";
        case 503:
            return "サービスが一時的に利用できません";
        default:
            return "エラーが発生しました";
    }
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    if (error && typeof error === "object" && "error" in error) {
        const apiError = error;
        return apiError.error || "エラーが発生しました";
    }
    return "予期しないエラーが発生しました";
}
function getErrorType(error) {
    if (error instanceof Error) {
        if (error.message.includes("fetch") || error.message.includes("network")) {
            return "network";
        }
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
            return "auth";
        }
        if (error.message.includes("400") || error.message.includes("validation")) {
            return "validation";
        }
        if (error.message.includes("500") || error.message.includes("server")) {
            return "server";
        }
    }
    return "unknown";
}
function translateErrorMessage(message) {
    const translations = {
        "Unauthorized": "認証が必要です",
        "Not Found": "見つかりませんでした",
        "Internal Server Error": "サーバーエラーが発生しました",
        "Bad Request": "リクエストが無効です",
        "Database not configured": "データベースが設定されていません",
        "Current password is incorrect": "現在のパスワードが正しくありません",
        "New password must be at least 6 characters": "新しいパスワードは6文字以上である必要があります",
        "Invalid email format": "メールアドレスの形式が正しくありません"
    };
    return translations[message] || message;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/features/products/useProducts.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAddProduct",
    ()=>useAddProduct,
    "useDeleteProduct",
    ()=>useDeleteProduct,
    "useProduct",
    ()=>useProduct,
    "useProducts",
    ()=>useProducts,
    "useUpdateProduct",
    ()=>useUpdateProduct
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/useMutation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/contexts/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/auth/api-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/errors/error-handler.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
async function fetchProducts(shopId) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authenticatedFetch"])(`/api/products?shopId=${encodeURIComponent(shopId)}`);
    if (!response.ok) {
        const errorMessage = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["extractErrorMessage"])(response);
        throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["translateErrorMessage"])(errorMessage));
    }
    return response.json();
}
async function fetchProduct(id) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authenticatedFetch"])(`/api/products/${id}`);
    if (!response.ok) {
        const errorMessage = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["extractErrorMessage"])(response);
        throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["translateErrorMessage"])(errorMessage));
    }
    return response.json();
}
async function addProduct(product) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authenticatedFetch"])("/api/products", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(product)
    });
    if (!response.ok) {
        const errorMessage = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["extractErrorMessage"])(response);
        throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["translateErrorMessage"])(errorMessage));
    }
    return response.json();
}
async function updateProduct(id, updates) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authenticatedFetch"])(`/api/products/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
    });
    if (!response.ok) {
        const errorMessage = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["extractErrorMessage"])(response);
        throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["translateErrorMessage"])(errorMessage));
    }
    return response.json();
}
function useProducts() {
    _s();
    const { shopId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "products",
            shopId
        ],
        queryFn: {
            "useProducts.useQuery": ()=>fetchProducts(shopId)
        }["useProducts.useQuery"],
        enabled: !!shopId
    });
}
_s(useProducts, "ioGVxSTNxCLjEEIkg0iRuelkOM0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"]
    ];
});
function useProduct(id) {
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "product",
            id
        ],
        queryFn: {
            "useProduct.useQuery": ()=>fetchProduct(id)
        }["useProduct.useQuery"],
        enabled: !!id
    });
}
_s1(useProduct, "4ZpngI1uv+Uo3WQHEZmTQ5FNM+k=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"]
    ];
});
function useAddProduct() {
    _s2();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: addProduct,
        onSuccess: {
            "useAddProduct.useMutation": ()=>{
                queryClient.invalidateQueries({
                    queryKey: [
                        "products"
                    ]
                });
            }
        }["useAddProduct.useMutation"]
    });
}
_s2(useAddProduct, "YK0wzM21ECnncaq5SECwU+/SVdQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"],
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"]
    ];
});
function useUpdateProduct() {
    _s3();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: {
            "useUpdateProduct.useMutation": ({ id, updates })=>updateProduct(id, updates)
        }["useUpdateProduct.useMutation"],
        onSuccess: {
            "useUpdateProduct.useMutation": (_, variables)=>{
                queryClient.invalidateQueries({
                    queryKey: [
                        "products"
                    ]
                });
                queryClient.invalidateQueries({
                    queryKey: [
                        "product",
                        variables.id
                    ]
                });
            }
        }["useUpdateProduct.useMutation"]
    });
}
_s3(useUpdateProduct, "YK0wzM21ECnncaq5SECwU+/SVdQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"],
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"]
    ];
});
async function deleteProduct(id) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authenticatedFetch"])(`/api/products/${id}`, {
        method: "DELETE"
    });
    if (!response.ok) {
        const errorMessage = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["extractErrorMessage"])(response);
        throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["translateErrorMessage"])(errorMessage));
    }
}
function useDeleteProduct() {
    _s4();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: deleteProduct,
        onSuccess: {
            "useDeleteProduct.useMutation": ()=>{
                queryClient.invalidateQueries({
                    queryKey: [
                        "products"
                    ]
                });
            }
        }["useDeleteProduct.useMutation"]
    });
}
_s4(useDeleteProduct, "YK0wzM21ECnncaq5SECwU+/SVdQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"],
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/features/analytics/useAnalytics.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAnalytics",
    ()=>useAnalytics
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/contexts/AuthContext.tsx [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
async function fetchAnalytics(shopId, timeRange) {
    const response = await fetch(`/api/analytics?shopId=${encodeURIComponent(shopId)}&timeRange=${timeRange}`);
    if (!response.ok) {
        throw new Error("Failed to fetch analytics");
    }
    return response.json();
}
function useAnalytics(timeRange = "30d") {
    _s();
    const { shopId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "analytics",
            shopId,
            timeRange
        ],
        queryFn: {
            "useAnalytics.useQuery": ()=>fetchAnalytics(shopId, timeRange)
        }["useAnalytics.useQuery"],
        enabled: !!shopId
    });
}
_s(useAnalytics, "ioGVxSTNxCLjEEIkg0iRuelkOM0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/app/(main)/analytics/page.tsx [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const e = new Error("Could not parse module '[project]/atelier/apps/console/src/app/(main)/analytics/page.tsx'\n\nExpected '</', got 'div'");
e.code = 'MODULE_UNPARSABLE';
throw e;
}),
]);

//# sourceMappingURL=atelier_apps_console_src_c617971d._.js.map