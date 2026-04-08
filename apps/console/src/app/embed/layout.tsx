export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[1] min-h-0 min-w-0 overflow-hidden bg-[#fafafa]">{children}</div>
  );
}
