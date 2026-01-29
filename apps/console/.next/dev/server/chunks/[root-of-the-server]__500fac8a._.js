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
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/punycode [external] (punycode, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("punycode", () => require("punycode"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/node:fs [external] (node:fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:fs", () => require("node:fs"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/node:stream/web [external] (node:stream/web, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:stream/web", () => require("node:stream/web"));

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
"[project]/atelier/apps/console/src/app/api/chat/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OPTIONS",
    ()=>OPTIONS,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$groq$2d$sdk$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/groq-sdk/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/server.ts [app-route] (ecmascript)");
;
;
;
const groqApiKey = process.env.GROQ_API_KEY;
// Groqクライアントの初期化（APIキーが設定されている場合のみ）
const groq = groqApiKey ? new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$groq$2d$sdk$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"]({
    apiKey: groqApiKey
}) : null;
// CORSヘッダーを設定する関数
function getCorsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
}
async function OPTIONS() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({}, {
        headers: getCorsHeaders()
    });
}
async function POST(request) {
    try {
        // データベース接続の確認
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
            console.error("[Chat API] supabaseAdmin is not initialized. Check environment variables:");
            console.error("  - NEXT_PUBLIC_SUPABASE_URL:", ("TURBOPACK compile-time truthy", 1) ? "✓ set" : "TURBOPACK unreachable");
            console.error("  - SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ set" : "✗ not set");
        }
        if (!groq) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Chat service not configured",
                message: "GROQ_API_KEY environment variable is not set"
            }, {
                status: 500,
                headers: getCorsHeaders()
            });
        }
        const body = await request.json();
        const { message, productId, shopId, context, conversationId, sessionId } = body;
        console.log("[Chat API] Received request:", {
            hasMessage: !!message,
            messageLength: message?.length,
            productId,
            shopId,
            conversationId,
            sessionId,
            hasContext: !!context
        });
        if (!message || typeof message !== "string") {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Message is required"
            }, {
                status: 400,
                headers: getCorsHeaders()
            });
        }
        if (!shopId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "shopId is required"
            }, {
                status: 400,
                headers: getCorsHeaders()
            });
        }
        // productIdがUUID形式でない場合はnullに変換（外部キー制約エラーを防ぐ）
        let validProductId = null;
        if (productId) {
            // UUID形式かどうかを簡易チェック（8-4-4-4-12の形式）
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(productId)) {
                validProductId = productId;
            } else {
                console.warn("[Chat API] Invalid productId format (not UUID), setting to null:", productId);
                validProductId = null;
            }
        }
        // セッションIDの生成（存在しない場合）
        const currentSessionId = sessionId || crypto.randomUUID();
        // デモ環境の判定（shopIdが'default_shop'の場合は保存しない）
        const isDemoMode = shopId === 'default_shop';
        if (isDemoMode) {
            console.log("[Chat API] Demo mode detected (shopId: 'default_shop'), skipping database save");
        }
        // 会話IDの管理
        let currentConversationId = conversationId;
        // 会話が存在しない場合は新規作成（デモ環境ではスキップ）
        if (!currentConversationId && __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"] && !isDemoMode) {
            try {
                const newConversationId = crypto.randomUUID();
                const userAgent = request.headers.get("user-agent") || null;
                const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
                console.log("[Chat API] Creating new conversation:", {
                    id: newConversationId,
                    shop_id: shopId,
                    product_id: productId,
                    session_id: currentSessionId
                });
                const { data: convData, error: convError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("conversations").insert({
                    id: newConversationId,
                    shop_id: shopId,
                    product_id: validProductId,
                    session_id: currentSessionId,
                    user_agent: userAgent,
                    ip_address: ipAddress,
                    started_at: new Date().toISOString(),
                    message_count: 0
                }).select().single();
                if (convError) {
                    console.error("[Chat API] Error creating conversation:", {
                        error: convError,
                        code: convError.code,
                        message: convError.message,
                        details: convError.details,
                        hint: convError.hint,
                        shopId,
                        productId
                    });
                // 会話作成に失敗してもチャットは続行
                } else {
                    console.log("[Chat API] Conversation created successfully:", {
                        id: convData?.id,
                        shop_id: convData?.shop_id
                    });
                    currentConversationId = newConversationId;
                }
            } catch (error) {
                console.error("[Chat API] Error in conversation creation:", {
                    error,
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    shopId,
                    productId
                });
            // 会話作成に失敗してもチャットは続行
            }
        } else if (!currentConversationId) {
            console.warn("[Chat API] supabaseAdmin is not available, conversation will not be saved");
        } else {
            console.log("[Chat API] Using existing conversation:", currentConversationId);
        }
        // 商品情報を取得（validProductIdがある場合）
        let productInfo = null;
        if (validProductId && __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
            try {
                const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("products").select("*").eq("id", validProductId).single();
                if (!error && data) {
                    productInfo = {
                        id: data.id,
                        name: data.name,
                        brand: data.brand,
                        category: data.category,
                        sku: data.sku,
                        description: data.description,
                        sizeTypeId: data.size_type_id
                    };
                }
            } catch (error) {
                console.error("Error fetching product info:", error);
            // 商品情報の取得に失敗してもチャットは続行
            }
        }
        // 商品情報をコンテキストに含める
        const systemPrompt = `あなたはアパレルECサイトのカスタマーサポートAIアシスタントです。
ユーザーからの質問に対して、親切で丁寧に回答してください。
商品に関する質問（サイズ、素材、着こなし、商品説明など）に答えることができます。
商品情報が提供されている場合は、その情報を参照して回答してください。
わからないことは正直に「わかりません」と答えてください。`;
        // 商品情報がある場合は追加のコンテキストを提供
        let userMessage = message;
        if (productInfo) {
            const productContext = [
                `商品名: ${productInfo.name}`,
                productInfo.brand ? `ブランド: ${productInfo.brand}` : null,
                productInfo.category ? `カテゴリ: ${productInfo.category}` : null,
                productInfo.sku ? `SKU: ${productInfo.sku}` : null,
                productInfo.description ? `商品説明: ${productInfo.description}` : null
            ].filter(Boolean).join("\n");
            userMessage = `${productContext}\n\nユーザーの質問: ${message}`;
        } else if (context?.productName) {
            userMessage = `商品名: ${context.productName}\n\nユーザーの質問: ${message}`;
        }
        // Groq APIを呼び出し
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userMessage
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 500
        });
        const response = completion.choices[0]?.message?.content || "申し訳ございませんが、回答を生成できませんでした。";
        // 会話ログを保存（会話IDが存在する場合のみ、デモ環境ではスキップ）
        if (currentConversationId && __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"] && !isDemoMode) {
            try {
                console.log("[Chat API] Saving messages for conversation:", currentConversationId);
                // ユーザーメッセージを保存
                const { data: userMsgData, error: userMsgError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("messages").insert({
                    conversation_id: currentConversationId,
                    shop_id: shopId,
                    role: "user",
                    content: message,
                    product_id: validProductId,
                    context: context || null
                }).select().single();
                if (userMsgError) {
                    console.error("[Chat API] Error saving user message:", {
                        error: userMsgError,
                        code: userMsgError.code,
                        message: userMsgError.message,
                        details: userMsgError.details,
                        hint: userMsgError.hint,
                        conversationId: currentConversationId
                    });
                } else {
                    console.log("[Chat API] User message saved:", userMsgData?.id);
                }
                // アシスタントレスポンスを保存
                const { data: assistantMsgData, error: assistantMsgError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("messages").insert({
                    conversation_id: currentConversationId,
                    shop_id: shopId,
                    role: "assistant",
                    content: response,
                    product_id: validProductId,
                    context: context || null
                }).select().single();
                if (assistantMsgError) {
                    console.error("[Chat API] Error saving assistant message:", {
                        error: assistantMsgError,
                        code: assistantMsgError.code,
                        message: assistantMsgError.message,
                        details: assistantMsgError.details,
                        hint: assistantMsgError.hint,
                        conversationId: currentConversationId
                    });
                } else {
                    console.log("[Chat API] Assistant message saved:", assistantMsgData?.id);
                }
                // 会話のメッセージ数を更新
                if (!userMsgError && !assistantMsgError) {
                    // 現在のメッセージ数を取得してから更新
                    const { data: currentConv, error: fetchError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("conversations").select("message_count").eq("id", currentConversationId).single();
                    if (!fetchError && currentConv) {
                        const { error: updateError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("conversations").update({
                            message_count: (currentConv.message_count || 0) + 2,
                            updated_at: new Date().toISOString()
                        }).eq("id", currentConversationId);
                        if (updateError) {
                            console.error("[Chat API] Error updating conversation:", {
                                error: updateError,
                                code: updateError.code,
                                message: updateError.message,
                                conversationId: currentConversationId
                            });
                        } else {
                            console.log("[Chat API] Conversation message_count updated");
                        }
                    } else if (fetchError) {
                        console.error("[Chat API] Error fetching conversation for update:", {
                            error: fetchError,
                            conversationId: currentConversationId
                        });
                    }
                }
            } catch (error) {
                console.error("[Chat API] Error saving conversation log:", {
                    error,
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    conversationId: currentConversationId
                });
            // 会話ログの保存に失敗してもチャットレスポンスは返す
            }
        } else {
            if (isDemoMode) {
                console.log("[Chat API] Demo mode: Conversation and messages are not saved to database");
            } else {
                if (!currentConversationId) {
                    console.warn("[Chat API] No conversation ID available, messages will not be saved");
                }
                if (!__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
                    console.warn("[Chat API] supabaseAdmin is not available, messages will not be saved");
                }
            }
        }
        // レスポンスを返す前に、会話IDが設定されているか確認
        if (!currentConversationId) {
            console.warn("[Chat API] WARNING: No conversation ID available in response. Conversation may not be saved.");
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            response,
            model: completion.model,
            conversationId: currentConversationId || null,
            sessionId: currentSessionId
        }, {
            status: 200,
            headers: getCorsHeaders()
        });
    } catch (error) {
        console.error("Error in chat API:", error);
        // Groq APIのエラーを適切に処理
        if (error instanceof Error) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to get chat response",
                message: error.message
            }, {
                status: 500,
                headers: getCorsHeaders()
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal server error"
        }, {
            status: 500,
            headers: getCorsHeaders()
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__500fac8a._.js.map