import type { Product } from "@atelier/shared";

// TODO: Get shopId from auth context
const SHOP_ID = "default_shop";

// UUID形式のモックID（固定値で一貫性を保つ）
export const mockProducts: Product[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    shopId: SHOP_ID,
    name: "ダブルジャケット",
    brand: "Atelier Brand",
    sku: "DBL-JKT-001",
    handle: "double-jacket",
    thumbnailUrl: "/clothes/double_jacket.png",
    previewImageUrl: "/clothes/double_jacket.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    shopId: SHOP_ID,
    name: "ウールコート",
    brand: "Atelier Brand",
    sku: "WOL-CT-001",
    handle: "wool-coat",
    thumbnailUrl: "/clothes/wool_coat.png",
    previewImageUrl: "/clothes/wool_coat.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    shopId: SHOP_ID,
    name: "デニムジャケット",
    brand: "Atelier Brand",
    sku: "DNM-JKT-001",
    handle: "denim-jacket",
    thumbnailUrl: "/clothes/denim_jacket.png",
    previewImageUrl: "/clothes/denim_jacket.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    shopId: SHOP_ID,
    name: "レザージャケット",
    brand: "Atelier Brand",
    sku: "LTH-JKT-001",
    handle: "leather-jacket",
    thumbnailUrl: "/clothes/leather_jacket.png",
    previewImageUrl: "/clothes/leather_jacket.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
