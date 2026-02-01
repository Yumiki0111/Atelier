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
"[project]/atelier/apps/console/src/app/api/products/import-csv/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
        console.log("[import-csv API] POST request received");
        // Authorizationヘッダーからトークンを取得
        const authHeader = request.headers.get("authorization");
        console.log("[import-csv API] Auth header:", authHeader ? "present" : "missing");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.warn("[import-csv API] Missing or invalid authorization header");
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Missing or invalid authorization header"
            }, {
                status: 401
            });
        }
        const token = authHeader.replace("Bearer ", "");
        // 環境変数を取得
        const supabaseUrl = ("TURBOPACK compile-time value", "https://aeuccvcdwijoojfcgjjs.supabase.co");
        const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWNjdmNkd2lqb29qZmNnampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTAxMzUsImV4cCI6MjA4NDg4NjEzNX0.U45Qp8PfXlVk2vhQ8SmF25nBvxDzLGznr5iw-6sa_l0");
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        // トークンを検証してユーザーIDを取得
        const supabaseClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        if (authError || !user) {
            console.error("[import-csv API] Invalid or expired token:", authError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid or expired token"
            }, {
                status: 401
            });
        }
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
            console.error("[import-csv API] Database not configured");
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Database not configured"
            }, {
                status: 500
            });
        }
        // 現在のユーザーの shop_id を取得
        const { data: profile, error: profileError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("profiles").select("shop_id").eq("id", user.id).single();
        if (profileError || !profile) {
            console.error("[import-csv API] Profile not found:", profileError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Profile not found"
            }, {
                status: 404
            });
        }
        const shopId = profile.shop_id;
        console.log("[import-csv API] User shop_id:", shopId);
        // multipart/form-data からファイルを取得
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "CSV file is required"
            }, {
                status: 400
            });
        }
        // ファイルサイズチェック（10MBまで）
        if (file.size > 10 * 1024 * 1024) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "File size exceeds 10MB"
            }, {
                status: 400
            });
        }
        // UTF-8 でファイル内容を読み込む
        const csvText = await file.text();
        const lines = csvText.split(/\r?\n/).filter((line)=>line.trim() !== "");
        if (lines.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "CSV file is empty"
            }, {
                status: 400
            });
        }
        // 最大行数チェック（ヘッダー含め5001行まで = データ5000行）
        if (lines.length > 5001) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "CSV file exceeds 5000 rows"
            }, {
                status: 400
            });
        }
        // ヘッダー行をパース（引用符で囲まれた値にも対応）
        const parseCsvLine = (line)=>{
            const result = [];
            let current = "";
            let inQuotes = false;
            for(let i = 0; i < line.length; i++){
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = "";
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };
        const headerLine = lines[0];
        const headers = parseCsvLine(headerLine).map((h)=>h.replace(/^"|"$/g, "").trim());
        const externalProductIdIndex = headers.indexOf("external_product_id");
        const nameIndex = headers.indexOf("name");
        const thumbnailUrlIndex = headers.indexOf("thumbnail_url");
        const brandIndex = headers.indexOf("brand");
        const categoryIndex = headers.indexOf("category");
        const descriptionIndex = headers.indexOf("description");
        if (externalProductIdIndex === -1) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "CSV must have 'external_product_id' column"
            }, {
                status: 400
            });
        }
        console.log("[import-csv API] CSV headers:", headers);
        console.log("[import-csv API] Found columns:", {
            external_product_id: externalProductIdIndex !== -1,
            name: nameIndex !== -1,
            thumbnail_url: thumbnailUrlIndex !== -1,
            brand: brandIndex !== -1,
            category: categoryIndex !== -1,
            description: descriptionIndex !== -1
        });
        // データ行を処理
        const dataLines = lines.slice(1);
        let addedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        const errors = [];
        for(let i = 0; i < dataLines.length; i++){
            const line = dataLines[i];
            const values = parseCsvLine(line).map((v)=>v.replace(/^"|"$/g, "").trim());
            const externalProductId = values[externalProductIdIndex] || "";
            const name = nameIndex !== -1 ? values[nameIndex]?.trim() || null : null;
            const thumbnailUrl = thumbnailUrlIndex !== -1 ? values[thumbnailUrlIndex]?.trim() || null : null;
            const brand = brandIndex !== -1 ? values[brandIndex]?.trim() || null : null;
            const category = categoryIndex !== -1 ? values[categoryIndex]?.trim() || null : null;
            const description = descriptionIndex !== -1 ? values[descriptionIndex]?.trim() || null : null;
            if (!externalProductId) {
                failedCount++;
                errors.push(`Row ${i + 2}: external_product_id is missing`);
                continue;
            }
            // カテゴリの検証
            const validCategories = [
                "ジャケット",
                "コート",
                "トップス",
                "ボトムス"
            ];
            if (category && !validCategories.includes(category)) {
                failedCount++;
                errors.push(`Row ${i + 2}: Invalid category "${category}". Must be one of: ${validCategories.join(", ")}`);
                continue;
            }
            try {
                // 既存商品を検索
                const { data: existingProduct, error: checkError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("products").select("id").eq("shop_id", shopId).eq("external_product_id", externalProductId).maybeSingle();
                if (checkError) {
                    failedCount++;
                    errors.push(`Row ${i + 2}: ${checkError.message}`);
                    continue;
                }
                if (existingProduct) {
                    // 既に存在する場合はスキップ
                    skippedCount++;
                    continue;
                }
                // 新規商品を追加
                const insertData = {
                    shop_id: shopId,
                    external_product_id: externalProductId,
                    name: name || externalProductId
                };
                // オプション項目を追加（空文字列はnullに変換）
                if (thumbnailUrl && thumbnailUrl.trim() !== "") {
                    insertData.thumbnail_url = thumbnailUrl.trim();
                    console.log(`[import-csv API] Row ${i + 2}: Setting thumbnail_url = "${thumbnailUrl.trim()}"`);
                } else {
                    console.log(`[import-csv API] Row ${i + 2}: thumbnail_url is empty or missing`);
                }
                if (brand && brand.trim() !== "") {
                    insertData.brand = brand.trim();
                }
                if (category && category.trim() !== "") {
                    insertData.category = category.trim();
                }
                if (description && description.trim() !== "") {
                    insertData.description = description.trim();
                }
                const { error: insertError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("products").insert(insertData);
                if (insertError) {
                    failedCount++;
                    errors.push(`Row ${i + 2}: ${insertError.message}`);
                    continue;
                }
                addedCount++;
            } catch (err) {
                failedCount++;
                errors.push(`Row ${i + 2}: ${err.message || "Unknown error"}`);
            }
        }
        console.log("[import-csv API] Import completed:", {
            addedCount,
            skippedCount,
            failedCount
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            addedCount,
            skippedCount,
            failedCount,
            errors: errors.length > 0 ? errors.slice(0, 10) : []
        });
    } catch (error) {
        console.error("[import-csv API] Unexpected error:", error);
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

//# sourceMappingURL=%5Broot-of-the-server%5D__e27a153f._.js.map