"use client";

import { Sidebar } from "@/components/sidebar/Sidebar";
import { ProductSelectionProvider, useProductSelection } from "@/contexts/ProductSelectionContext";
import { PreviewPanel } from "@/features/preview/PreviewPanel";

function DatabaseLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isPreviewOpen, selectedProduct, selectedSize } = useProductSelection();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className={`overflow-y-auto bg-gray-50 p-6 transition-all duration-300 ease-in-out ${
          isPreviewOpen ? "flex-1 mr-96" : "flex-1"
        }`}
      >
        {children}
      </main>
      <div
        className={`fixed right-0 top-0 h-screen z-50 transition-transform duration-300 ease-in-out ${
          isPreviewOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <PreviewPanel
          selectedProduct={selectedProduct}
          selectedSize={selectedSize}
        />
      </div>
    </div>
  );
}

export default function DatabaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProductSelectionProvider>
      <DatabaseLayoutContent>{children}</DatabaseLayoutContent>
    </ProductSelectionProvider>
  );
}
