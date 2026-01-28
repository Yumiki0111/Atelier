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
  name: z.string().min(1),
  brand: z.string().optional(),
  category: productCategorySchema.optional(),
  sku: z.string().optional(),
  handle: z.string().optional(),
  url: z
    .union([z.string().url(), z.literal("")])
    .optional(), // URL形式であることを検証、空文字列も許可
  sizeTypeId: z
    .union([z.string().uuid(), z.literal("")])
    .optional(), // UUID形式であることを検証、空文字列も許可
  thumbnailUrl: z
    .union([z.string().url(), z.literal("")])
    .optional(), // URL形式であることを検証、空文字列も許可
  previewImageUrl: z
    .union([z.string().url(), z.literal("")])
    .optional(), // URL形式であることを検証、空文字列も許可
  description: z.string().optional(), // 商品説明
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
  glbUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  version: z.number().int().positive().default(1),
  isActive: z.boolean().optional().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createAssetSchema = assetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateAssetSchema = createAssetSchema.partial().omit({
  productId: true, // productIdは更新対象外
});

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
          glbUrl: z.string().url(),
        })
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
