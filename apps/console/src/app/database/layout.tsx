"use client";

import { Sidebar } from "@/components/sidebar/Sidebar";
import { ConsoleMainColumn } from "@/components/shell/ConsoleMainColumn";
import { ProductSelectionProvider, useProductSelection } from "@/contexts/ProductSelectionContext";
import { PreviewPanel } from "@/features/preview/PreviewPanel";
import { cn } from "@/lib/utils";

function DatabaseLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isPreviewOpen, selectedProduct, selectedSize } = useProductSelection();

  return (
    <div className="flex h-screen w-full min-w-0 overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ConsoleMainColumn>{children}</ConsoleMainColumn>
      </div>
      <aside
        aria-hidden={!isPreviewOpen}
        className={cn(
          "flex h-full shrink-0 flex-col overflow-hidden border-border bg-background transition-[width] duration-300 ease-in-out",
          isPreviewOpen ? "w-[400px] border-l shadow-lg" : "w-0 border-0 shadow-none"
        )}
      >
        <div className="flex h-full w-[400px] min-w-[400px] shrink-0 flex-col overflow-hidden">
          <PreviewPanel selectedProduct={selectedProduct} selectedSize={selectedSize} />
        </div>
      </aside>
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
