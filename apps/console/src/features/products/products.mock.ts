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
    thumbnailUrl: "/clothes/double_jacket.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    shopId: SHOP_ID,
    name: "ウールコート",
    brand: "Atelier Brand",
    thumbnailUrl: "/clothes/wool_coat.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    shopId: SHOP_ID,
    name: "デニムジャケット",
    brand: "Atelier Brand",
    thumbnailUrl: "/clothes/denim_jacket.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    shopId: SHOP_ID,
    name: "レザージャケット",
    brand: "Atelier Brand",
    thumbnailUrl: "/clothes/leather_jacket.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
