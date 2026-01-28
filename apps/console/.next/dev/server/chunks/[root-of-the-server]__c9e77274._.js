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
"[project]/atelier/apps/console/src/app/api/debug/db-check/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/server.ts [app-route] (ecmascript)");
;
;
async function GET(request) {
    try {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Database not configured",
                details: {
                    NEXT_PUBLIC_SUPABASE_URL: ("TURBOPACK compile-time truthy", 1) ? "✓ set" : "TURBOPACK unreachable",
                    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ set" : "✗ not set"
                }
            }, {
                status: 500
            });
        }
        const checks = {};
        // conversationsテーブルの存在確認
        try {
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("conversations").select("id").limit(1);
            checks.conversations = {
                exists: !error || error.code !== "42P01",
                error: error ? {
                    code: error.code,
                    message: error.message
                } : null,
                count: data ? data.length : 0
            };
        } catch (error) {
            checks.conversations = {
                exists: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
        // messagesテーブルの存在確認
        try {
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("messages").select("id").limit(1);
            checks.messages = {
                exists: !error || error.code !== "42P01",
                error: error ? {
                    code: error.code,
                    message: error.message
                } : null,
                count: data ? data.length : 0
            };
        } catch (error) {
            checks.messages = {
                exists: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
        // テスト挿入（conversations）
        let testInsertConversation = null;
        if (checks.conversations.exists) {
            try {
                const testId = crypto.randomUUID();
                const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("conversations").insert({
                    id: testId,
                    shop_id: "test_shop",
                    session_id: "test_session",
                    message_count: 0
                }).select().single();
                if (!error && data) {
                    // テストデータを削除
                    await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("conversations").delete().eq("id", testId);
                    testInsertConversation = {
                        success: true,
                        message: "Test insert and delete successful"
                    };
                } else {
                    testInsertConversation = {
                        success: false,
                        error: error ? {
                            code: error.code,
                            message: error.message,
                            details: error.details,
                            hint: error.hint
                        } : "Unknown error"
                    };
                }
            } catch (error) {
                testInsertConversation = {
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        }
        // テスト挿入（messages）- conversationsテーブルが存在する場合のみ
        let testInsertMessage = null;
        if (checks.conversations.exists && checks.messages.exists) {
            try {
                // まずテスト用のconversationを作成
                const testConvId = crypto.randomUUID();
                const { data: convData, error: convError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("conversations").insert({
                    id: testConvId,
                    shop_id: "test_shop",
                    session_id: "test_session",
                    message_count: 0
                }).select().single();
                if (!convError && convData) {
                    // テストメッセージを挿入
                    const { data: msgData, error: msgError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("messages").insert({
                        conversation_id: testConvId,
                        role: "user",
                        content: "test message"
                    }).select().single();
                    // テストデータを削除
                    await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("conversations").delete().eq("id", testConvId);
                    if (!msgError && msgData) {
                        testInsertMessage = {
                            success: true,
                            message: "Test insert and delete successful"
                        };
                    } else {
                        testInsertMessage = {
                            success: false,
                            error: msgError ? {
                                code: msgError.code,
                                message: msgError.message,
                                details: msgError.details,
                                hint: msgError.hint
                            } : "Unknown error"
                        };
                    }
                } else {
                    testInsertMessage = {
                        success: false,
                        error: convError ? {
                            code: convError.code,
                            message: convError.message
                        } : "Failed to create test conversation"
                    };
                }
            } catch (error) {
                testInsertMessage = {
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            database: {
                configured: true,
                url: ("TURBOPACK compile-time value", "https://aeuccvcdwijoojfcgjjs.supabase.co")
            },
            tables: checks,
            testInserts: {
                conversation: testInsertConversation,
                message: testInsertMessage
            }
        });
    } catch (error) {
        console.error("Error in db-check API:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__c9e77274._.js.map