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
"[project]/atelier/apps/console/src/app/api/admin/invite-member/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
        console.log("[invite-member API] POST request received");
        // Authorizationヘッダーからトークンを取得
        const authHeader = request.headers.get("authorization");
        console.log("[invite-member API] Auth header:", authHeader ? "present" : "missing");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.warn("[invite-member API] Missing or invalid authorization header");
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Missing or invalid authorization header"
            }, {
                status: 401
            });
        }
        const token = authHeader.replace("Bearer ", "");
        console.log("[invite-member API] Token extracted, length:", token.length);
        // 環境変数を取得
        const supabaseUrl = ("TURBOPACK compile-time value", "https://aeuccvcdwijoojfcgjjs.supabase.co");
        const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWNjdmNkd2lqb29qZmNnampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTAxMzUsImV4cCI6MjA4NDg4NjEzNX0.U45Qp8PfXlVk2vhQ8SmF25nBvxDzLGznr5iw-6sa_l0");
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        // トークンを検証してユーザーIDを取得
        console.log("[invite-member API] Verifying token...");
        const supabaseClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        console.log("[invite-member API] Token verification result:", {
            hasUser: !!user,
            hasError: !!authError
        });
        if (authError || !user) {
            console.error("[invite-member API] Invalid or expired token:", authError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid or expired token"
            }, {
                status: 401
            });
        }
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
            console.error("[invite-member API] Database not configured");
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Database not configured"
            }, {
                status: 500
            });
        }
        // 現在のユーザーの profiles を取得
        const { data: profile, error: profileError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("profiles").select("shop_id, role").eq("id", user.id).single();
        if (profileError || !profile) {
            console.error("[invite-member API] Profile not found:", profileError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Profile not found"
            }, {
                status: 404
            });
        }
        // role が owner でない場合は拒否
        if (profile.role !== "owner") {
            console.warn("[invite-member API] User is not owner:", user.id);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Only owners can invite members"
            }, {
                status: 403
            });
        }
        console.log("[invite-member API] User is owner of shop:", profile.shop_id);
        // リクエストボディの検証
        const body = await request.json();
        const { memberEmails } = body;
        if (!memberEmails || !Array.isArray(memberEmails) || memberEmails.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "memberEmails must be a non-empty array"
            }, {
                status: 400
            });
        }
        // メールアドレスのバリデーション
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validEmails = memberEmails.filter((email)=>emailRegex.test(email.trim()));
        if (validEmails.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "No valid email addresses provided"
            }, {
                status: 400
            });
        }
        // 重複を除去
        const uniqueEmails = Array.from(new Set(validEmails.map((email)=>email.trim().toLowerCase())));
        console.log("[invite-member API] Inviting members:", uniqueEmails);
        const results = {
            success: [],
            failed: [],
            skipped: []
        };
        // 各メールアドレスに対して招待を作成
        for (const email of uniqueEmails){
            try {
                // pending_invites に upsert（既に存在する場合は更新しない）
                const { data: invite, error: inviteError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("pending_invites").upsert({
                    shop_id: profile.shop_id,
                    email: email,
                    role: "member"
                }, {
                    onConflict: "shop_id,email",
                    ignoreDuplicates: true
                }).select().maybeSingle();
                if (inviteError) {
                    console.error("[invite-member API] Error creating invite for", email, ":", inviteError);
                    results.failed.push(email);
                    continue;
                }
                // 既に存在する場合はスキップ
                if (!invite) {
                    console.log("[invite-member API] Invite already exists for:", email);
                    results.skipped.push(email);
                    continue;
                }
                console.log("[invite-member API] Invite created:", invite.id);
                // Supabase Admin API でメンバーを招待
                try {
                    const { data: inviteData, error: inviteAuthError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].auth.admin.inviteUserByEmail(email, {
                        data: {
                            shop_id: profile.shop_id,
                            role: "member"
                        },
                        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/set-password`
                    });
                    if (inviteAuthError) {
                        console.error("[invite-member API] Error sending invite email for", email, ":", {
                            message: inviteAuthError.message,
                            status: inviteAuthError.status,
                            name: inviteAuthError.name
                        });
                        // エラーを記録
                        results.failed.push(email);
                        continue;
                    } else {
                        console.log("[invite-member API] Invite email sent to:", email, "User ID:", inviteData?.user?.id);
                    }
                } catch (emailError) {
                    console.error("[invite-member API] Exception sending invite email for", email, ":", emailError);
                    // エラーを記録
                    results.failed.push(email);
                    continue;
                }
                results.success.push(email);
            } catch (error) {
                console.error("[invite-member API] Unexpected error for", email, ":", error);
                results.failed.push(email);
            }
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            results: {
                success: results.success,
                failed: results.failed,
                skipped: results.skipped
            },
            message: `${results.success.length}件の招待を送信しました${results.skipped.length > 0 ? `（${results.skipped.length}件は既に招待済み）` : ""}${results.failed.length > 0 ? `（${results.failed.length}件は失敗）` : ""}`
        });
    } catch (error) {
        console.error("[invite-member API] Unexpected error:", error);
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

//# sourceMappingURL=%5Broot-of-the-server%5D__fe527627._.js.map