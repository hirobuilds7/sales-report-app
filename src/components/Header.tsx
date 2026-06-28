import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-slate-900">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight">売上レポート自動化</span>
          <span className="ml-2 hidden sm:inline rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            デモ
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            ダッシュボード
          </Link>
          <Link
            href="/report"
            className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            月次レポート
          </Link>
        </nav>
      </div>
    </header>
  );
}
