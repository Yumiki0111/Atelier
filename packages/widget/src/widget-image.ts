import type { WidgetParams } from "./widget-api";
import { fetchWidgetConfig } from "./widget-api";
import { isDevelopmentMode } from "./widget-utils";

export async function loadProductImage(
  params: WidgetParams,
  imageContainer: HTMLElement,
  imageSize: number
) {
  try {
    const config = await fetchWidgetConfig(params);
    
    if (config.asset?.thumbnailUrl) {
      const img = document.createElement("img");
      img.src = config.asset.thumbnailUrl;
      img.alt = config.asset.productName || "商品画像";
      img.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        display: block !important;
      `;
      
      img.onload = () => {
        const placeholder = imageContainer.querySelector("div");
        if (placeholder) {
          placeholder.remove();
        }
        imageContainer.style.display = "flex";
      };
      
      img.onerror = () => {
        imageContainer.style.display = "none";
      };
      
      imageContainer.appendChild(img);
    } else {
      imageContainer.style.display = "none";
    }
  } catch (error) {
    if (isDevelopmentMode()) {
      console.warn("[Atelier Widget] Failed to load product image:", error);
    }
    imageContainer.style.display = "none";
  }
}
