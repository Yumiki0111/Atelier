export type ProductCategory = "ジャケット" | "コート" | "トップス" | "ボトムス";

export type ProductSize = "S" | "M" | "L";

export type ProductStatus =
  | "未発注"
  | "制作中"
  | "レビュー待ち"
  | "修正中"
  | "公開可"
  | "公開中"
  | "差し替え中";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  sizes: ProductSize[];
  thumbnailUrl: string;
  previewImageUrl: string;
  enabled?: boolean;
  searchSegment?: string;
  season?: string;
  status?: ProductStatus;
}
