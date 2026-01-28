import { z } from "zod";

// Shop Schema
export const shopSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  domain: z.string().optional(),
  platform: z.enum(["shopify", "custom", "other"]).optional(),
  apiKey: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createShopSchema = shopSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateShopSchema = createShopSchema.partial();

// User Schema
export const userRoleSchema = z.enum(["owner", "admin", "member"]);

export const userSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  role: userRoleSchema,
  email: z.string().email(),
  name: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = createUserSchema.partial();

// Size Type Schema
export const sizeTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  displayName: z.string().min(1),
  sizes: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
});

export const createSizeTypeSchema = sizeTypeSchema.omit({
  id: true,
  createdAt: true,
});

// Widget Config Schema (データベース用)
export const widgetConfigTableSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  config: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createWidgetConfigTableSchema = widgetConfigTableSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWidgetConfigTableSchema = createWidgetConfigTableSchema.partial();
