import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ONE PIECE eBay 投資スカウト",
  description:
    "ONE PIECE カードゲーム英語版の大会配布・限定プロモに特化した eBay 投資スカウトツール",
};

export default function ScoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900">
              ONE PIECE eBay 投資スカウト
            </h1>
            <p className="text-[11px] text-slate-500">
              英語版・大会配布/限定プロモ特化のスカウトツール
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
          >
            学習アプリへ戻る
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
