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
"[project]/atelier/apps/console/src/app/api/upload/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/server.ts [app-route] (ecmascript)");
;
;
async function POST(request) {
    try {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Database not configured"
            }, {
                status: 500
            });
        }
        const formData = await request.formData();
        const file = formData.get("file");
        const folder = formData.get("folder") || "uploads"; // デフォルトはuploadsフォルダ
        if (!file) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "No file provided"
            }, {
                status: 400
            });
        }
        // ファイルサイズのチェック（100MB制限）
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "File size exceeds 100MB limit"
            }, {
                status: 400
            });
        }
        // ファイル名を安全にする（UUID + 元の拡張子）
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;
        // ファイルをArrayBufferに変換
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Supabase Storageにアップロード
        // まずバケットが存在するか確認
        // 環境変数からバケット名を取得、なければデフォルト値を使用
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "products";
        const { data: buckets, error: listError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].storage.listBuckets();
        if (listError) {
            console.error("Error listing buckets:", listError);
            console.error("Available buckets:", buckets);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to access storage",
                details: listError.message,
                hint: "Supabase Storageの設定を確認してください。環境変数SUPABASE_SERVICE_ROLE_KEYが正しく設定されているか確認してください。"
            }, {
                status: 500
            });
        }
        // デバッグ: 利用可能なバケット一覧をログに出力
        console.log("Available buckets:", buckets?.map((b)=>({
                name: b.name,
                public: b.public
            })));
        const bucketExists = buckets?.some((bucket)=>bucket.name === bucketName);
        if (!bucketExists) {
            const availableBuckets = buckets?.map((b)=>b.name).join(", ") || "なし";
            console.error(`Bucket "${bucketName}" does not exist. Available buckets: ${availableBuckets}`);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Storage bucket "${bucketName}" not found`,
                details: `バケット "${bucketName}" が存在しません。`,
                availableBuckets: buckets?.map((b)=>b.name) || [],
                hint: `利用可能なバケット: ${availableBuckets}。Supabase Dashboard > Storage > New bucket でバケットを作成するか、既存のバケット名を使用してください。`
            }, {
                status: 500
            });
        }
        console.log(`Uploading to bucket: ${bucketName}, path: ${filePath}`);
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].storage.from(bucketName).upload(filePath, buffer, {
            contentType: file.type,
            upsert: false
        });
        if (error) {
            console.error("Error uploading file:", error);
            // StorageErrorの型に合わせて安全にプロパティにアクセス
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorName = error instanceof Error ? error.name : "StorageError";
            console.error("Error details:", {
                message: errorMessage,
                name: errorName,
                error: error
            });
            // バケットが見つからない場合の詳細なエラー情報
            if (errorMessage?.includes("Bucket not found") || errorMessage?.includes("404")) {
                const availableBuckets = buckets?.map((b)=>b.name).join(", ") || "なし";
                return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Bucket not found",
                    details: `バケット "${bucketName}" が見つかりませんでした。`,
                    availableBuckets: buckets?.map((b)=>b.name) || [],
                    hint: `利用可能なバケット: ${availableBuckets}。Supabase Dashboardでバケットを作成するか、既存のバケット名を使用してください。`
                }, {
                    status: 404
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to upload file",
                details: errorMessage,
                hint: errorMessage?.includes("new row violates row-level security") ? "StorageのRLSポリシーを確認してください。公開バケットとして設定するか、適切なポリシーを設定してください。" : "ファイルのアップロードに失敗しました。ファイルサイズや形式を確認してください。"
            }, {
                status: 500
            });
        }
        // アップロードされたファイルが存在するか確認
        const { data: fileData, error: fileError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].storage.from(bucketName).list(folder, {
            limit: 100,
            search: fileName
        });
        if (fileError) {
            console.error("Error checking uploaded file:", fileError);
        }
        // 公開URLを取得
        const { data: urlData } = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].storage.from(bucketName).getPublicUrl(filePath);
        if (!urlData?.publicUrl) {
            console.error("Failed to get public URL");
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to get public URL",
                details: "ファイルはアップロードされましたが、公開URLの取得に失敗しました"
            }, {
                status: 500
            });
        }
        // バケットが公開設定かどうかを確認
        const bucket = buckets?.find((b)=>b.name === bucketName);
        const isPublic = bucket?.public === true;
        console.log("Upload successful:", {
            fileName,
            filePath,
            url: urlData.publicUrl,
            bucketPublic: isPublic,
            fileExists: fileData && fileData.length > 0
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            url: urlData.publicUrl,
            path: filePath,
            fileName: fileName,
            bucketPublic: isPublic,
            warning: !isPublic ? "バケットが公開設定になっていない可能性があります。Supabase Dashboardで確認してください。" : undefined
        });
    } catch (error) {
        console.error("Error in POST /api/upload:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__ffe9555a._.js.map