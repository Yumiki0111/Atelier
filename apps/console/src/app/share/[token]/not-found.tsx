import Link from "next/link";

export default function ShareNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-medium text-stone-800">リンクが無効か、期限切れです</p>
      <p className="max-w-sm text-sm text-stone-600">
        共有デモの URL を再発行してもらうか、担当者にお問い合わせください。
      </p>
      <p className="text-xs text-stone-500">FIT&amp;LOOK</p>
    </div>
  );
}
