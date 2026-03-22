(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/atelier/apps/console/src/providers/QueryProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryProvider",
    ()=>QueryProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function QueryProvider({ children }) {
    _s();
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "QueryProvider.useState": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000
                    }
                }
            })
    }["QueryProvider.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: children
    }, void 0, false, {
        fileName: "[project]/atelier/apps/console/src/providers/QueryProvider.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_s(QueryProvider, "yADA7+c4kK3bgDDNK8fCQ9yQxXE=");
_c = QueryProvider;
var _c;
__turbopack_context__.k.register(_c, "QueryProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/lib/supabase/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "setAuthFetchFailureCallback",
    ()=>setAuthFetchFailureCallback,
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/atelier/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/@supabase/supabase-js/dist/index.mjs [app-client] (ecmascript) <locals>");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://aeuccvcdwijoojfcgjjs.supabase.co");
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWNjdmNkd2lqb29qZmNnampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTAxMzUsImV4cCI6MjA4NDg4NjEzNX0.U45Qp8PfXlVk2vhQ8SmF25nBvxDzLGznr5iw-6sa_l0");
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
/** Called once when an auth token/refresh request fails so we can clear session and stop retry storm */ let authFetchFailureCallback = null;
let authFetchFailureHandled = false;
function setAuthFetchFailureCallback(cb) {
    authFetchFailureCallback = cb;
    authFetchFailureHandled = false;
}
function isAuthTokenRefreshRequest(url, init) {
    try {
        const u = new URL(url, supabaseUrl);
        if (!u.pathname.includes("/auth/v1/token")) return false;
    } catch  {
        if (!url.includes("token")) return false;
    }
    // リフレッシュ時のみ 401 を返す。ログイン (grant_type=password) の失敗はそのまま throw する
    const body = init?.body;
    if (body == null) return false;
    const raw = typeof body === "string" ? body : body?.toString?.() ?? "";
    return raw.includes("grant_type=refresh_token") || raw.includes("refresh_token=");
}
const supabaseFetch = async (input, init)=>{
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    try {
        return await fetch(input, init);
    } catch (err) {
        if (isAuthTokenRefreshRequest(url, init) && authFetchFailureCallback && !authFetchFailureHandled) {
            authFetchFailureHandled = true;
            try {
                authFetchFailureCallback();
            } catch (_) {
            // ignore so we don't mask the original error
            }
            // リフレッシュ失敗時のみ 401 を返してリトライを止める。ログイン失敗は throw のまま
            return new Response(JSON.stringify({
                error: "session_refresh_failed",
                message: "Failed to fetch"
            }), {
                status: 401,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        }
        throw err;
    }
};
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: supabaseFetch
    },
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/contexts/AuthContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/atelier/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/client.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AuthProvider({ children }) {
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [shopId, setShopId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("default_shop");
    const [userRole, setUserRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    // 認証トークン取得失敗時にセッションをクリアし、リトライの連鎖を止める
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setAuthFetchFailureCallback"])({
                "AuthProvider.useEffect": ()=>{
                    __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
                }
            }["AuthProvider.useEffect"]);
            return ({
                "AuthProvider.useEffect": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setAuthFetchFailureCallback"])(null)
            })["AuthProvider.useEffect"];
        }
    }["AuthProvider.useEffect"], []);
    // ユーザー情報とshop_idを取得
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            let isMounted = true;
            // 初期セッションを取得
            __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession().then({
                "AuthProvider.useEffect": async ({ data: { session }, error: sessionError })=>{
                    if (!isMounted) return;
                    if ("TURBOPACK compile-time truthy", 1) {
                        console.log("[AuthContext] Initial session retrieved:", {
                            hasSession: !!session,
                            hasError: !!sessionError
                        });
                    }
                    setUser(session?.user ?? null);
                    if (session?.user && session?.access_token) {
                        // 初回ログイン確定処理（招待メールからのリダイレクト時など）
                        try {
                            if ("TURBOPACK compile-time truthy", 1) {
                                console.log("[AuthContext] Calling post-login API to ensure profile exists...");
                            }
                            const postLoginResponse = await fetch("/api/auth/post-login", {
                                method: "POST",
                                headers: {
                                    Authorization: `Bearer ${session.access_token}`
                                }
                            });
                            if ("TURBOPACK compile-time truthy", 1) {
                                if (postLoginResponse.ok) {
                                    console.log("[AuthContext] post-login success");
                                } else {
                                    console.log("[AuthContext] post-login not needed or already completed");
                                }
                            }
                        } catch (postLoginError) {
                            if ("TURBOPACK compile-time truthy", 1) {
                                console.log("[AuthContext] post-login error (may be expected):", postLoginError);
                            }
                        }
                        // shop_id を取得（await して reject を捕捉し、未処理の "Failed to fetch" を防ぐ）
                        try {
                            await fetchShopId(session.user.id, session.access_token);
                        } catch (shopIdError) {
                            if ("TURBOPACK compile-time truthy", 1) {
                                console.warn("[AuthContext] fetchShopId failed on init:", shopIdError);
                            }
                            setShopId("default_shop");
                            setUserRole(null);
                        } finally{
                            setIsLoading(false);
                        }
                    } else {
                        setIsLoading(false);
                    }
                }
            }["AuthProvider.useEffect"]).catch({
                "AuthProvider.useEffect": (err)=>{
                    if (!isMounted) return;
                    console.warn("[AuthContext] Initial session handling failed:", err);
                    setShopId("default_shop");
                    setUserRole(null);
                    setIsLoading(false);
                }
            }["AuthProvider.useEffect"]);
            // 認証状態の変更を監視
            const { data: { subscription } } = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.onAuthStateChange({
                "AuthProvider.useEffect": async (event, session)=>{
                    if (!isMounted) return;
                    if ("TURBOPACK compile-time truthy", 1) {
                        console.log("[AuthContext] Auth state changed:", event, {
                            hasSession: !!session
                        });
                    }
                    setUser(session?.user ?? null);
                    if (session?.user && session?.access_token) {
                        try {
                            await fetchShopId(session.user.id, session.access_token);
                        } catch (error) {
                            console.error("[AuthContext] Error in fetchShopId during auth state change:", error);
                            setShopId("default_shop");
                        } finally{
                            setIsLoading(false);
                        }
                    } else {
                        setShopId("default_shop");
                        setUserRole(null);
                        setIsLoading(false);
                    }
                }
            }["AuthProvider.useEffect"]);
            return ({
                "AuthProvider.useEffect": ()=>{
                    isMounted = false;
                    subscription.unsubscribe();
                }
            })["AuthProvider.useEffect"];
        }
    }["AuthProvider.useEffect"], []);
    // APIエンドポイント経由でshop_idを取得（RLSをバイパス）
    const fetchShopId = async (userId, accessToken)=>{
        if ("TURBOPACK compile-time truthy", 1) {
            console.log("[AuthContext] fetchShopId called for userId:", userId);
        }
        try {
            if (!accessToken) {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.warn("[AuthContext] No access token provided, using default shop_id");
                }
                setShopId("default_shop");
                setIsLoading(false);
                return;
            }
            if ("TURBOPACK compile-time truthy", 1) {
                console.log("[AuthContext] Using provided access token, calling API...");
            }
            const response = await fetch("/api/auth/shop-id", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            if ("TURBOPACK compile-time truthy", 1) {
                console.log("[AuthContext] Fetch completed, status:", response.status);
            }
            if (!response.ok) {
                const errorData = await response.json().catch(()=>({
                        error: "Unknown error"
                    }));
                console.error("[AuthContext] Error fetching shop_id:", {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData
                });
                // 404エラーは「レコードが見つからない」エラー
                if (response.status === 404) {
                    const error = new Error("Profile not found");
                    error.status = 404;
                    error.response = {
                        status: 404
                    };
                    throw error;
                }
                // その他のエラーもスローして、呼び出し元で処理できるようにする
                const error = new Error(errorData.error || "Failed to fetch shop_id");
                error.status = response.status;
                error.response = {
                    status: response.status
                };
                throw error;
            }
            const data = await response.json();
            if ("TURBOPACK compile-time truthy", 1) {
                console.log("[AuthContext] API response:", data);
            }
            if (data.shopId) {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.log("[AuthContext] shop_id found:", data.shopId);
                }
                setShopId(String(data.shopId));
            } else {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.warn("[AuthContext] No shop_id found in response, data:", data);
                }
                setShopId("default_shop");
            }
            // role を設定
            if (data.role && (data.role === "owner" || data.role === "member")) {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.log("[AuthContext] role found:", data.role);
                }
                setUserRole(data.role);
            } else {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.warn("[AuthContext] No valid role found in response");
                }
                setUserRole(null);
            }
        } catch (error) {
            const errorMessage = error?.message || String(error) || "Unknown error";
            console.error("[AuthContext] Error in fetchShopId:", errorMessage, error);
            // エラーでもデフォルト値を使用して続行
            setShopId("default_shop");
            setUserRole(null);
        } finally{
            // 必ずローディング状態を解除
            if ("TURBOPACK compile-time truthy", 1) {
                console.log("[AuthContext] fetchShopId completed, setting isLoading to false");
            }
            setIsLoading(false);
        }
    };
    const login = async (email, password)=>{
        setIsLoading(true);
        try {
            if ("TURBOPACK compile-time truthy", 1) {
                console.log("[AuthContext] Attempting login for email:", email);
            }
            let data = null;
            let error = null;
            try {
                const result = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signInWithPassword({
                    email,
                    password
                });
                data = result.data;
                error = result.error;
            } catch (supabaseError) {
                // ネットワークエラー・Abort・Supabase の AuthRetryableFetchError を捕捉
                const msg = String(supabaseError?.message ?? "");
                const name = String(supabaseError?.name ?? "");
                const isNetworkError = name === "AuthRetryableFetchError" || name === "TypeError" || msg === "Failed to fetch" || name === "AbortError" || msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network");
                if (isNetworkError) {
                    throw new Error("Supabase に接続できません。NEXT_PUBLIC_SUPABASE_URL とネットワークを確認してください。");
                }
                throw supabaseError;
            }
            if (error) {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.error("[AuthContext] Login error:", {
                        message: error.message,
                        status: error.status,
                        name: error.name
                    });
                }
                setIsLoading(false);
                // 接続エラー（Supabase が throw せず result.error で返す場合）
                const msg = String(error?.message ?? "");
                const name = String(error?.name ?? "");
                if (name === "AuthRetryableFetchError" || name === "TypeError" || msg === "Failed to fetch" || msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network")) {
                    throw new Error("Supabase に接続できません。NEXT_PUBLIC_SUPABASE_URL とネットワークを確認してください。");
                }
                // メール未確認エラーの場合、より分かりやすいメッセージを表示
                if (error.message.includes("Email not confirmed") || error.message.includes("email_not_confirmed")) {
                    throw new Error("メールアドレスの確認が必要です。サインアップ時に送信されたメールを確認してください。");
                }
                throw error;
            }
            if (!data.user || !data.session) {
                console.error("[AuthContext] Login succeeded but no user or session returned");
                setIsLoading(false);
                throw new Error("ログインに失敗しました: ユーザー情報が取得できませんでした");
            }
            if ("TURBOPACK compile-time truthy", 1) {
                console.log("[AuthContext] Login successful, user ID:", data.user.id);
            }
            // ユーザー情報を明示的に設定（isAuthenticatedを即座に更新するため）
            setUser(data.user);
            // 初回ログイン確定処理（pending_invites → profiles）
            try {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.log("[AuthContext] Calling post-login API to confirm invite...");
                }
                const postLoginResponse = await fetch("/api/auth/post-login", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${data.session.access_token}`
                    }
                });
                if (!postLoginResponse.ok) {
                    const postLoginError = await postLoginResponse.json().catch(()=>({}));
                    const errorMessage = postLoginError?.message || postLoginError?.error;
                    // 招待されていない場合は特別なエラーメッセージ
                    if (postLoginResponse.status === 403) {
                        setIsLoading(false);
                        throw new Error(errorMessage || "このメールアドレスは招待されていません。管理者に連絡してください。");
                    }
                    if (("TURBOPACK compile-time value", "development") === "development" && postLoginResponse.status !== 403) {
                        console.warn("[AuthContext] post-login failed:", postLoginResponse.status, postLoginError);
                    }
                } else {
                    if ("TURBOPACK compile-time truthy", 1) {
                        const postLoginData = await postLoginResponse.json();
                        console.log("[AuthContext] post-login success:", postLoginData);
                    }
                }
            } catch (postLoginError) {
                console.error("[AuthContext] post-login exception:", postLoginError);
                setIsLoading(false);
                throw postLoginError;
            }
            // shop_id を取得
            try {
                await fetchShopId(data.user.id, data.session.access_token);
            } catch (shopIdError) {
                // shop_idの取得に失敗してもログインは成功させる
                if ("TURBOPACK compile-time truthy", 1) {
                    console.warn("[AuthContext] Failed to fetch shop_id, but login succeeded:", shopIdError);
                }
                // profiles が存在しない場合は警告を出す
                if (shopIdError?.status === 404 || shopIdError?.response?.status === 404) {
                    console.error("[AuthContext] Profile not found. " + "This may indicate that the user was not invited.");
                }
                // デフォルトのshop_idを設定
                setShopId("default_shop");
            }
            // ローディング状態を確実に解除
            setIsLoading(false);
            // ログイン成功後、即座にリダイレクト
            if ("TURBOPACK compile-time truthy", 1) {
                console.log("[AuthContext] Redirecting to home page");
            }
            // window.locationを使用して確実にリダイレクト
            if ("TURBOPACK compile-time truthy", 1) {
                window.location.href = '/';
            } else //TURBOPACK unreachable
            ;
        } catch (error) {
            console.error("[AuthContext] Login exception:", error);
            setIsLoading(false);
            // エラーメッセージを日本語化
            if (error.message) {
                throw error;
            } else if (error.status === 400) {
                throw new Error("メールアドレスまたはパスワードが正しくありません");
            } else if (error.status === 429) {
                throw new Error("ログイン試行回数が多すぎます。しばらく待ってから再度お試しください");
            } else {
                throw new Error(error.message || "ログインに失敗しました");
            }
        }
    };
    const signup = async (email, password, name)=>{
        // API経由でサインアップ（usersテーブルへの登録も含む）
        const response = await fetch("/api/auth/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password,
                name
            })
        });
        if (!response.ok) {
            let error;
            try {
                const text = await response.text();
                if ("TURBOPACK compile-time truthy", 1) {
                    console.log("[AuthContext] Signup error response text:", text);
                }
                error = text ? JSON.parse(text) : {
                    error: "Failed to sign up"
                };
            } catch (e) {
                console.error("[AuthContext] Failed to parse error response:", e);
                error = {
                    error: "Failed to sign up"
                };
            }
            console.error("[AuthContext] Signup error:", {
                status: response.status,
                statusText: response.statusText,
                error: error
            });
            // エラーの詳細を表示
            let errorMessage = error.error || "Failed to sign up";
            if (error.details) {
                errorMessage += `: ${error.details}`;
            }
            if (error.code) {
                errorMessage += ` (code: ${error.code})`;
            }
            if (error.hint) {
                errorMessage += ` (hint: ${error.hint})`;
            }
            throw new Error(errorMessage);
        }
        // サインアップ成功後、ログインページにリダイレクト
        router.push("/login?message=サインアップが完了しました。ログインしてください。");
    };
    const logout = async ()=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
        setUser(null);
        setShopId("default_shop");
        setUserRole(null);
        router.push("/login");
    };
    const isAuthenticated = !!user;
    // デバッグ用ログ（開発環境のみ）
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            if ("TURBOPACK compile-time truthy", 1) {
                console.log("[AuthContext] State update:", {
                    hasUser: !!user,
                    userId: user?.id,
                    isAuthenticated,
                    isLoading,
                    shopId
                });
            }
        }
    }["AuthProvider.useEffect"], [
        user,
        isAuthenticated,
        isLoading,
        shopId
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            isAuthenticated,
            shopId,
            user,
            userRole,
            login,
            signup,
            logout,
            isLoading
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/atelier/apps/console/src/contexts/AuthContext.tsx",
        lineNumber: 465,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "HqJBuou6S/58HphD2o10t3tpHMw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = AuthProvider;
function useAuth() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/components/ui/sonner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleCheckIcon$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CircleCheckIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__InfoIcon$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/info.js [app-client] (ecmascript) <export default as InfoIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2Icon$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2Icon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$octagon$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__OctagonXIcon$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/octagon-x.js [app-client] (ecmascript) <export default as OctagonXIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlertIcon$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as TriangleAlertIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
const Toaster = ({ ...props })=>{
    _s();
    const { theme = "system" } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toaster"], {
        theme: theme,
        className: "toaster group",
        icons: {
            success: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleCheckIcon$3e$__["CircleCheckIcon"], {
                className: "size-4"
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/components/ui/sonner.tsx",
                lineNumber: 21,
                columnNumber: 18
            }, void 0),
            info: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__InfoIcon$3e$__["InfoIcon"], {
                className: "size-4"
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/components/ui/sonner.tsx",
                lineNumber: 22,
                columnNumber: 15
            }, void 0),
            warning: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlertIcon$3e$__["TriangleAlertIcon"], {
                className: "size-4"
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/components/ui/sonner.tsx",
                lineNumber: 23,
                columnNumber: 18
            }, void 0),
            error: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$octagon$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__OctagonXIcon$3e$__["OctagonXIcon"], {
                className: "size-4"
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/components/ui/sonner.tsx",
                lineNumber: 24,
                columnNumber: 16
            }, void 0),
            loading: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2Icon$3e$__["Loader2Icon"], {
                className: "size-4 animate-spin"
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/components/ui/sonner.tsx",
                lineNumber: 25,
                columnNumber: 18
            }, void 0)
        },
        style: {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius)"
        },
        ...props
    }, void 0, false, {
        fileName: "[project]/atelier/apps/console/src/components/ui/sonner.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Toaster, "EriOrahfenYKDCErPq+L6926Dw4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = Toaster;
;
var _c;
__turbopack_context__.k.register(_c, "Toaster");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=atelier_apps_console_src_c706e675._.js.map