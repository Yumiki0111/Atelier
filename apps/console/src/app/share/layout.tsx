/**
 * コンソール（サイドバー）とは別レイアウト。メール・SNS から開く公開デモ専用。
 */
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f5f5f4] antialiased">{children}</div>;
}
