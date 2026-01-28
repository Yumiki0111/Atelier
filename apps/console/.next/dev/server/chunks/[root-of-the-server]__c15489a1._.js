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
"[project]/atelier/apps/console/src/app/api/auth/post-login/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
async function POST(request) {
    try {
        console.log("[post-login API] POST request received");
        // Authorizationヘッダーからトークンを取得
        const authHeader = request.headers.get("authorization");
        console.log("[post-login API] Auth header:", authHeader ? "present" : "missing");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.warn("[post-login API] Missing or invalid authorization header");
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Missing or invalid authorization header"
            }, {
                status: 401
            });
        }
        const token = authHeader.replace("Bearer ", "");
        console.log("[post-login API] Token extracted, length:", token.length);
        // 環境変数を取得
        const supabaseUrl = ("TURBOPACK compile-time value", "https://aeuccvcdwijoojfcgjjs.supabase.co");
        const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWNjdmNkd2lqb29qZmNnampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTAxMzUsImV4cCI6MjA4NDg4NjEzNX0.U45Qp8PfXlVk2vhQ8SmF25nBvxDzLGznr5iw-6sa_l0");
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        // トークンを検証してユーザーIDを取得
        console.log("[post-login API] Verifying token...");
        const supabaseClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        console.log("[post-login API] Token verification result:", {
            hasUser: !!user,
            hasError: !!authError
        });
        if (authError || !user) {
            console.error("[post-login API] Invalid or expired token:", authError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid or expired token"
            }, {
                status: 401
            });
        }
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
            console.error("[post-login API] Database not configured");
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Database not configured"
            }, {
                status: 500
            });
        }
        const userEmail = user.email;
        if (!userEmail) {
            console.error("[post-login API] User email not found");
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "User email not found"
            }, {
                status: 400
            });
        }
        console.log("[post-login API] Looking up pending_invites for email:", userEmail);
        // pending_invites を email で検索（未受諾のもの）
        const { data: pendingInvite, error: inviteError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("pending_invites").select("*").eq("email", userEmail).is("accepted_at", null).order("created_at", {
            ascending: false
        }).limit(1).maybeSingle();
        if (inviteError) {
            console.error("[post-login API] Error fetching pending_invites:", inviteError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Database error",
                details: inviteError.message
            }, {
                status: 500
            });
        }
        if (!pendingInvite) {
            console.warn("[post-login API] No pending invite found for:", userEmail);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Not invited",
                message: "このメールアドレスは招待されていません。管理者に連絡してください。"
            }, {
                status: 403
            });
        }
        console.log("[post-login API] Pending invite found:", {
            shop_id: pendingInvite.shop_id,
            role: pendingInvite.role
        });
        // profiles に upsert（既に存在する場合は何もしない）
        const { data: profile, error: profileError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("profiles").upsert({
            id: user.id,
            shop_id: pendingInvite.shop_id,
            role: pendingInvite.role,
            email: userEmail,
            name: user.user_metadata?.name || null
        }, {
            onConflict: "id",
            ignoreDuplicates: false
        }).select().single();
        if (profileError) {
            console.error("[post-login API] Error upserting profile:", profileError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to create profile",
                details: profileError.message
            }, {
                status: 500
            });
        }
        console.log("[post-login API] Profile created/updated:", profile.id);
        // pending_invites の accepted_at を更新
        const { error: acceptError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("pending_invites").update({
            accepted_at: new Date().toISOString()
        }).eq("id", pendingInvite.id);
        if (acceptError) {
            console.error("[post-login API] Error updating accepted_at:", acceptError);
        // エラーでも続行（profileは作成済み）
        }
        console.log("[post-login API] Invite accepted successfully");
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            shopId: pendingInvite.shop_id,
            role: pendingInvite.role
        });
    } catch (error) {
        console.error("[post-login API] Unexpected error:", error);
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

//# sourceMappingURL=%5Broot-of-the-server%5D__c15489a1._.js.map