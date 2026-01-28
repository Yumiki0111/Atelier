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
"[project]/atelier/apps/console/src/app/api/auth/signup/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
;
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://aeuccvcdwijoojfcgjjs.supabase.co");
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWNjdmNkd2lqb29qZmNnampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTAxMzUsImV4cCI6MjA4NDg4NjEzNX0.U45Qp8PfXlVk2vhQ8SmF25nBvxDzLGznr5iw-6sa_l0");
async function POST(request) {
    try {
        // 環境変数の確認
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"] || !supabaseUrl || !supabaseAnonKey) {
            console.error("[Signup] Database not configured");
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Database not configured"
            }, {
                status: 500
            });
        }
        // リクエストボディの検証
        const body = await request.json();
        const { email, password, name } = body;
        if (!email || !password) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Email and password are required"
            }, {
                status: 400
            });
        }
        // 1. pending_invites をチェック（招待されているか確認）
        const { data: pendingInvite, error: inviteError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("pending_invites").select("*").eq("email", email).is("accepted_at", null).order("created_at", {
            ascending: false
        }).limit(1).maybeSingle();
        if (inviteError) {
            console.error("[Signup] Error checking pending_invites:", inviteError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Database error",
                details: inviteError.message
            }, {
                status: 500
            });
        }
        if (!pendingInvite) {
            console.warn("[Signup] No pending invite found for:", email);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "このメールアドレスは招待されていません。",
                message: "アカウントを作成するには、管理者からの招待が必要です。"
            }, {
                status: 403
            });
        }
        console.log("[Signup] Pending invite found for:", email);
        // 2. Supabase Authでユーザーを作成
        console.log("[Signup] Creating auth user...");
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey);
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name || ""
                }
            }
        });
        // 認証エラーの処理
        if (authError) {
            console.error("[Signup] Auth error:", {
                message: authError.message,
                status: authError.status,
                name: authError.name,
                code: authError.code
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: authError.message || "Failed to create user",
                details: authError.message,
                code: authError.status?.toString() || authError.code
            }, {
                status: 400
            });
        }
        // authData.userが存在しない場合はエラー
        if (!authData?.user) {
            console.error("[Signup] No user returned from auth.signUp");
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to create user: no user data returned"
            }, {
                status: 400
            });
        }
        console.log("[Signup] Auth user created:", authData.user.id);
        // メール確認を自動的に完了させる（開発環境向け）
        // Service Role Keyを使用してメール確認をスキップ
        if (authData.user && !authData.user.email_confirmed_at && __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
            console.log("[Signup] Auto-confirming email for development...");
            try {
                const { data: updatedUser, error: confirmError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].auth.admin.updateUserById(authData.user.id, {
                    email_confirm: true
                });
                if (confirmError) {
                    console.warn("[Signup] Failed to auto-confirm email:", confirmError);
                // エラーでも続行（メール確認は後で手動で行える）
                } else {
                    console.log("[Signup] Email confirmed successfully");
                }
            } catch (confirmErr) {
                console.warn("[Signup] Error during email confirmation:", confirmErr);
            // エラーでも続行
            }
        }
        // profiles は作成しない
        // ログイン時に post-login API が pending_invites をチェックして profiles を作成する
        console.log("[Signup] Auth user created successfully. Profile will be created on first login.");
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            message: "アカウントが作成されました。ログインしてください。",
            userId: authData.user.id
        }, {
            status: 201
        });
    } catch (error) {
        console.error("[Signup] Unexpected error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal server error",
            details: error?.message || "Unknown error"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__be95e6a2._.js.map