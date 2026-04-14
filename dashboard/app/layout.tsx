import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "夫妻記帳本",
  description: "家庭支出儀表板 — 食衣住行育樂",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="relative z-10">
        <nav className="border-b border-white/[0.05] bg-black/30 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">💑</span>
              <span className="font-black text-white text-sm tracking-tight">夫妻記帳本</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-zinc-500 uppercase tracking-widest">
              <a href="/" className="px-3 py-1.5 rounded-lg hover:bg-white/5 hover:text-zinc-300 transition-all">今日</a>
              <a href="/monthly" className="px-3 py-1.5 rounded-lg hover:bg-white/5 hover:text-zinc-300 transition-all">月報</a>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
