import type { ProductSize } from "@Atelier/shared";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";

export type WidgetStyleProductPreviewProps = {
  productId: string;
  productCategory?: string | null;
  externalProductId?: string;
  addToCartUrlTemplate?: string | null;
  productName: string;
  thumbnailUrl?: string | null;
  priceDisplay?: string;
  sizeKeys: string[];
  initialSize: ProductSize;
  garmentFitAvailable: boolean;
  customGarmentData?: CustomGarmentData | null;
  onClose: () => void;
  interfaceBackgroundColor?: string;
  canvasBackgroundColor?: string;
  ctaCartLabel?: string;
  ctaTryOnLabel?: string;
  ctaAccentColor?: string;
  bodyAdjustEnabled?: boolean;
  sizeCarouselEnabled?: boolean;
  garmentPathsInViewer?: boolean;
  embedPublicWidget?: boolean;
  embedSplashSuspended?: boolean;
  shopId?: string;
  eventSource?: string;
};
