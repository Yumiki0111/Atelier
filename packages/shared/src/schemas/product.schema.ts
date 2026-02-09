import { z } from "zod";

// サイズは柔軟な形式に対応（文字列として扱う）
// 例: "S", "M", "L", "1", "2", "3", "28", "30", "32" など
export const productSizeSchema = z.string().min(1);

// 商品カテゴリ
export const productCategorySchema = z.enum([
  "ジャケット",
  "コート",
  "トップス",
  "ボトムス",
]);

export const productSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().min(1), // 現時点ではTEXT型のため、UUID検証は緩和（将来的にUUID型に変更予定）
  externalProductId: z.string().optional(), // 外部システムの商品ID（ウィジェット連携で使用）
  name: z.string().min(1),
  brand: z.string().optional(),
  category: productCategorySchema.optional(),
  thumbnailUrl: z
    .union([z.string().url(), z.literal("")])
    .optional(), // URL形式であることを検証、空文字列も許可
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProductSchema = createProductSchema.partial();

export const assetSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  size: productSizeSchema, // 柔軟な形式
  glbUrl: z.string().url().optional(), // 後方互換性のため残す
  modelUrl: z.string().url().optional(), // GLBとFBXの両方をサポート
  thumbnailUrl: z.string().url().optional(),
  version: z.number().int().positive().default(1),
  isActive: z.boolean().optional().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// refinementなしのベーススキーマ（.partial()や.omit()で使用可能）
export const createAssetSchemaBase = assetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 作成時用スキーマ（refinement付き）
export const createAssetSchema = createAssetSchemaBase.refine(
  (data) => data.modelUrl || data.glbUrl,
  { message: "modelUrl or glbUrl is required" }
);

// 更新時用スキーマ（refinementなしのベースから.partial()を適用）
export const updateAssetSchema = createAssetSchemaBase
  .partial()
  .omit({
    productId: true, // productIdは更新対象外
  })
  .refine(
    (data) => {
      // 更新時は、modelUrlまたはglbUrlが提供されている場合のみ検証
      // 両方がundefinedの場合は既存の値が保持されるため、検証をスキップ
      if (data.modelUrl === undefined && data.glbUrl === undefined) {
        return true; // 既存の値が保持される
      }
      // どちらかが提供されている場合は、有効なURLである必要がある
      return data.modelUrl || data.glbUrl;
    },
    { message: "modelUrl or glbUrl must be provided if updating" }
  );

export const eventTypeSchema = z.enum([
  "cube_view",
  "cube_click",
  "widget_open",
  "size_change",
  "height_change",
  "add_to_cart_click",
]);

export const eventSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().min(1), // 現時点ではTEXT型のため、UUID検証は緩和（将来的にUUID型に変更予定）
  productId: z.string().uuid().optional(),
  type: eventTypeSchema,
  meta: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(), // IPv4/IPv6形式の検証は必要に応じて追加
  createdAt: z.string().datetime(),
});

export const createEventSchema = eventSchema.omit({
  id: true,
  createdAt: true,
});

export const widgetConfigSchema = z.object({
  enabled: z.boolean(),
  asset: z
    .object({
      defaultSize: z.string().min(1), // 柔軟なサイズ形式
      sizes: z.record(
        z.string().min(1), // 柔軟なサイズ形式
        z.object({
          glbUrl: z.string().url().optional(), // 後方互換性のため残す
          modelUrl: z.string().url().optional(), // GLBとFBXの両方をサポート
        }).refine(
          (data) => data.modelUrl || data.glbUrl,
          { message: "modelUrl or glbUrl is required" }
        )
      ),
    })
    .optional(),
});

// 会話ログ関連のスキーマ
export const conversationSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().min(1),
  productId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  messageCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  productId: z.string().uuid().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
});

export const createConversationSchema = conversationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  messageCount: true,
  endedAt: true,
});

export const createMessageSchema = messageSchema.omit({
  id: true,
  createdAt: true,
});
