module.exports = [
"[project]/atelier/apps/console/src/lib/auth/api-client.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authenticatedFetch",
    ()=>authenticatedFetch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/client.ts [app-ssr] (ecmascript)");
"use client";
;
async function authenticatedFetch(url, options = {}) {
    try {
        console.log("[authenticatedFetch] Starting, url:", url);
        console.log("[authenticatedFetch] Getting session...");
        const { data: { session }, error: sessionError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
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
}),
"[project]/atelier/apps/console/src/lib/errors/error-handler.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/atelier/apps/console/src/features/products/useProducts.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/useMutation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/contexts/AuthContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/auth/api-client.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/errors/error-handler.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
async function fetchProducts(shopId) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authenticatedFetch"])(`/api/products?shopId=${encodeURIComponent(shopId)}`);
    if (!response.ok) {
        const errorMessage = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["extractErrorMessage"])(response);
        throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["translateErrorMessage"])(errorMessage));
    }
    return response.json();
}
async function fetchProduct(id) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authenticatedFetch"])(`/api/products/${id}`);
    if (!response.ok) {
        const errorMessage = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["extractErrorMessage"])(response);
        throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["translateErrorMessage"])(errorMessage));
    }
    return response.json();
}
async function addProduct(product) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authenticatedFetch"])("/api/products", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(product)
    });
    if (!response.ok) {
        const errorMessage = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["extractErrorMessage"])(response);
        throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["translateErrorMessage"])(errorMessage));
    }
    return response.json();
}
async function updateProduct(id, updates) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authenticatedFetch"])(`/api/products/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
    });
    if (!response.ok) {
        const errorMessage = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["extractErrorMessage"])(response);
        throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["translateErrorMessage"])(errorMessage));
    }
    return response.json();
}
function useProducts() {
    const { shopId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "products",
            shopId
        ],
        queryFn: ()=>fetchProducts(shopId),
        enabled: !!shopId
    });
}
function useProduct(id) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "product",
            id
        ],
        queryFn: ()=>fetchProduct(id),
        enabled: !!id
    });
}
function useAddProduct() {
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQueryClient"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: addProduct,
        onSuccess: ()=>{
            queryClient.invalidateQueries({
                queryKey: [
                    "products"
                ]
            });
        }
    });
}
function useUpdateProduct() {
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQueryClient"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: ({ id, updates })=>updateProduct(id, updates),
        onSuccess: (_, variables)=>{
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
    });
}
async function deleteProduct(id) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authenticatedFetch"])(`/api/products/${id}`, {
        method: "DELETE"
    });
    if (!response.ok) {
        const errorMessage = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["extractErrorMessage"])(response);
        throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$errors$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["translateErrorMessage"])(errorMessage));
    }
}
function useDeleteProduct() {
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQueryClient"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: deleteProduct,
        onSuccess: ()=>{
            queryClient.invalidateQueries({
                queryKey: [
                    "products"
                ]
            });
        }
    });
}
}),
"[project]/atelier/apps/console/src/features/analytics/useAnalytics.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAnalytics",
    ()=>useAnalytics
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/contexts/AuthContext.tsx [app-ssr] (ecmascript)");
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
    const { shopId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "analytics",
            shopId,
            timeRange
        ],
        queryFn: ()=>fetchAnalytics(shopId, timeRange),
        enabled: !!shopId
    });
}
}),
"[project]/atelier/apps/console/src/app/(main)/analytics/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

const e = new Error("Could not parse module '[project]/atelier/apps/console/src/app/(main)/analytics/page.tsx'\n\nExpected '</', got 'div'");
e.code = 'MODULE_UNPARSABLE';
throw e;
}),
];

//# sourceMappingURL=atelier_apps_console_src_fd6ce848._.js.map