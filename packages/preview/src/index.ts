// Preview panel exports
export { initPreviewPanel } from "./preview";
export type { PreviewPanelOptions, PreviewPanelInstance, OutfitAssetItem, OutfitAssetsData } from "./types";

// Viewer exports
export { init3DViewer } from "./viewer";
export type { ViewerInstance, AssetInfo, ViewerOptions } from "./viewer";

// Dev viewer exports (開発用：スケルトン共有版)
export { init3DViewerDev } from "./viewer-dev";

// Common UI components
export { buildHeightSlider } from "./height-slider";
export { renderCatTabs, renderThumbs, renderLeftPanel, buildAxisOverlay, renderAxis, createAxisControls, PREVIEW_SIZES, WIDGET_SIZES, OUTFIT_CATEGORIES } from "./ui-components";
export type { UISizes } from "./ui-components";

// Static fit (clothing penetration resolution)
export { applyStaticFit, cleanupStaticFit, buildBodyCapsules, bakeSkinnedMeshGeometry, resolveBodyCollisionOnBakedMesh, findBone, pushOutOfCapsule } from "./static-fit";
export type { Capsule } from "./static-fit";
