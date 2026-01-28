"use client";

import { Sidebar } from "@/components/sidebar/Sidebar";
import { ProductSelectionProvider } from "@/contexts/ProductSelectionContext";

export default function DatabaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProductSelectionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </ProductSelectionProvider>
  );
}
