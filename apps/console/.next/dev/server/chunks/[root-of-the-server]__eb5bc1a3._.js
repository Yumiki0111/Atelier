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
"[project]/atelier/packages/shared/src/types/product.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// サイズは柔軟な形式に対応（文字列として扱う）
// 例: "S", "M", "L", "1", "2", "3", "28", "30", "32" など
__turbopack_context__.s([]);
;
}),
"[project]/atelier/packages/shared/src/types/shop.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Shop (ショップ/テナント)
__turbopack_context__.s([]);
;
}),
"[project]/atelier/packages/shared/src/schemas/product.schema.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "assetSchema",
    ()=>assetSchema,
    "conversationSchema",
    ()=>conversationSchema,
    "createAssetSchema",
    ()=>createAssetSchema,
    "createAssetSchemaBase",
    ()=>createAssetSchemaBase,
    "createConversationSchema",
    ()=>createConversationSchema,
    "createEventSchema",
    ()=>createEventSchema,
    "createMessageSchema",
    ()=>createMessageSchema,
    "createProductSchema",
    ()=>createProductSchema,
    "eventSchema",
    ()=>eventSchema,
    "eventTypeSchema",
    ()=>eventTypeSchema,
    "messageSchema",
    ()=>messageSchema,
    "productCategorySchema",
    ()=>productCategorySchema,
    "productSchema",
    ()=>productSchema,
    "productSizeSchema",
    ()=>productSizeSchema,
    "updateAssetSchema",
    ()=>updateAssetSchema,
    "updateProductSchema",
    ()=>updateProductSchema,
    "widgetConfigSchema",
    ()=>widgetConfigSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
;
const productSizeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1);
const productCategorySchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "ジャケット",
    "コート",
    "トップス",
    "ボトムス"
]);
const productSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    shopId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    externalProductId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    brand: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    category: productCategorySchema.optional(),
    thumbnailUrl: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url(),
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal("")
    ]).optional(),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
    updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()
});
const createProductSchema = productSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const updateProductSchema = createProductSchema.partial();
const assetSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    productId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    size: productSizeSchema,
    glbUrl: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url().optional(),
    modelUrl: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url().optional(),
    thumbnailUrl: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url().optional(),
    version: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().default(1),
    isActive: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional().default(true),
    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
    updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()
});
const createAssetSchemaBase = assetSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const createAssetSchema = createAssetSchemaBase.refine((data)=>data.modelUrl || data.glbUrl, {
    message: "modelUrl or glbUrl is required"
});
const updateAssetSchema = createAssetSchemaBase.partial().omit({
    productId: true
}).refine((data)=>{
    // 更新時は、modelUrlまたはglbUrlが提供されている場合のみ検証
    // 両方がundefinedの場合は既存の値が保持されるため、検証をスキップ
    if (data.modelUrl === undefined && data.glbUrl === undefined) {
        return true; // 既存の値が保持される
    }
    // どちらかが提供されている場合は、有効なURLである必要がある
    return data.modelUrl || data.glbUrl;
}, {
    message: "modelUrl or glbUrl must be provided if updating"
});
const eventTypeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "cube_view",
    "cube_click",
    "widget_open",
    "size_change",
    "height_change",
    "add_to_cart_click"
]);
const eventSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    shopId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    productId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
    type: eventTypeSchema,
    meta: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(), __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown()).optional(),
    sessionId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    userAgent: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    ipAddress: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()
});
const createEventSchema = eventSchema.omit({
    id: true,
    createdAt: true
});
const widgetConfigSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    enabled: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    asset: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        defaultSize: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
        sizes: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1), __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
            glbUrl: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url().optional(),
            modelUrl: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url().optional()
        }).refine((data)=>data.modelUrl || data.glbUrl, {
            message: "modelUrl or glbUrl is required"
        }))
    }).optional()
});
const conversationSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    shopId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    productId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
    sessionId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    userAgent: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    ipAddress: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    startedAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
    endedAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime().optional(),
    messageCount: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nonnegative(),
    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
    updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()
});
const messageSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    conversationId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    role: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "user",
        "assistant"
    ]),
    content: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    productId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
    context: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(), __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown()).optional(),
    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()
});
const createConversationSchema = conversationSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    messageCount: true,
    endedAt: true
});
const createMessageSchema = messageSchema.omit({
    id: true,
    createdAt: true
});
}),
"[project]/atelier/packages/shared/src/schemas/shop.schema.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createShopSchema",
    ()=>createShopSchema,
    "createSizeTypeSchema",
    ()=>createSizeTypeSchema,
    "createUserSchema",
    ()=>createUserSchema,
    "createWidgetConfigTableSchema",
    ()=>createWidgetConfigTableSchema,
    "shopSchema",
    ()=>shopSchema,
    "sizeTypeSchema",
    ()=>sizeTypeSchema,
    "updateShopSchema",
    ()=>updateShopSchema,
    "updateUserSchema",
    ()=>updateUserSchema,
    "updateWidgetConfigTableSchema",
    ()=>updateWidgetConfigTableSchema,
    "userRoleSchema",
    ()=>userRoleSchema,
    "userSchema",
    ()=>userSchema,
    "widgetConfigTableSchema",
    ()=>widgetConfigTableSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
;
const shopSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    domain: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    platform: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "shopify",
        "custom",
        "other"
    ]).optional(),
    apiKey: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    settings: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(), __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown()).optional().default({}),
    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
    updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()
});
const createShopSchema = shopSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const updateShopSchema = createShopSchema.partial();
const userRoleSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "owner",
    "admin",
    "member"
]);
const userSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    shopId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    role: userRoleSchema,
    email: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
    updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()
});
const createUserSchema = userSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const updateUserSchema = createUserSchema.partial();
const sizeTypeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    displayName: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    sizes: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1)),
    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()
});
const createSizeTypeSchema = sizeTypeSchema.omit({
    id: true,
    createdAt: true
});
const widgetConfigTableSchema = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    shopId: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    config: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(), __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown()).default({}),
    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
    updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime()
});
const createWidgetConfigTableSchema = widgetConfigTableSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const updateWidgetConfigTableSchema = createWidgetConfigTableSchema.partial();
}),
"[project]/atelier/packages/shared/src/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// Types
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$shared$2f$src$2f$types$2f$product$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/shared/src/types/product.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$shared$2f$src$2f$types$2f$shop$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/shared/src/types/shop.ts [app-route] (ecmascript)");
// Schemas
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$shared$2f$src$2f$schemas$2f$product$2e$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/shared/src/schemas/product.schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$shared$2f$src$2f$schemas$2f$shop$2e$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/shared/src/schemas/shop.schema.ts [app-route] (ecmascript)");
;
;
;
;
}),
"[project]/atelier/apps/console/src/app/api/events/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OPTIONS",
    ()=>OPTIONS,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$shared$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/atelier/packages/shared/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$shared$2f$src$2f$schemas$2f$product$2e$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/shared/src/schemas/product.schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
;
;
;
;
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
    let body;
    try {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"]) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Database not configured"
            }, {
                status: 500,
                headers: getCorsHeaders()
            });
        }
        body = await request.json();
        // productIdがUUID形式でない場合はnullに変換（外部キー制約エラーを防ぐ）
        let validProductId = null;
        if (body.productId) {
            // UUID形式かどうかを簡易チェック（8-4-4-4-12の形式）
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(body.productId)) {
                validProductId = body.productId;
            } else {
                console.warn("[Events API] Invalid productId format (not UUID), setting to null:", body.productId);
                validProductId = null;
            }
        }
        // productIdを修正したボディでバリデーション
        const bodyToValidate = {
            ...body,
            productId: validProductId || undefined
        };
        const validated = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$shared$2f$src$2f$schemas$2f$product$2e$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createEventSchema"].parse(bodyToValidate);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("events").insert({
            shop_id: validated.shopId,
            product_id: validated.productId || null,
            type: validated.type,
            meta: validated.meta || null,
            session_id: validated.sessionId || null,
            user_agent: validated.userAgent || null,
            ip_address: validated.ipAddress || null
        });
        if (error) {
            console.error("Error inserting event:", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to save event"
            }, {
                status: 500,
                headers: getCorsHeaders()
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true
        }, {
            status: 201,
            headers: getCorsHeaders()
        });
    } catch (error) {
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].ZodError) {
            console.error("[Events API] Validation error:", error);
            console.error("[Events API] Validation issues:", JSON.stringify(error.issues, null, 2));
            console.error("[Events API] Request body:", JSON.stringify(body, null, 2));
            return __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid request body",
                details: error.message,
                // 開発環境でのみ詳細を返す
                ...("TURBOPACK compile-time truthy", 1) ? {
                    issues: error.issues
                } : "TURBOPACK unreachable"
            }, {
                status: 400,
                headers: getCorsHeaders()
            });
        }
        console.error("Error in events API:", error);
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

//# sourceMappingURL=%5Broot-of-the-server%5D__eb5bc1a3._.js.map