import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/lib/store";
import Header from "@/components/Header";
import AiChatWidget from "@/components/AiChatWidget";

export const metadata: Metadata = {
  title: "売上集計＋月次レポート自動化 | デモ",
  description:
    "Excel/スプレッドシートで毎月やってる売上集計を、CSVドラッグ→1クリックで月次レポート＋AI要約まで自動化するWebツールのデモ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <DataProvider>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <AiChatWidget />
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p>© Hiro / 売上レポート自動化デモ</p>
              <p>
                旗艦出品「Excel・スプレッドシートの集計やコピペをAIで自動化」の業務ツールサンプル
              </p>
            </div>
          </footer>
        </DataProvider>
      </body>
    </html>
  );
}
