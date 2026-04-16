import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  CreditCard,
  BarChart3,
  LineChart,
  CalendarDays,
  ReceiptText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Family Wealth Manager",
  description: "資產管理 · 淨資產追蹤 · 家庭收支",
};

const EXPENSE_NAV = [
  { href: "/", icon: ReceiptText, label: "今日收支" },
  { href: "/monthly", icon: CalendarDays, label: "每月分析" },
];

const WEALTH_NAV = [
  { href: "/wealth", icon: LayoutDashboard, label: "財務總覽" },
  { href: "/wealth/income", icon: Wallet, label: "收入來源" },
  { href: "/wealth/assets", icon: TrendingUp, label: "投資資產" },
  { href: "/wealth/liabilities", icon: CreditCard, label: "固定負債" },
  { href: "/wealth/cashflow", icon: BarChart3, label: "月現金流" },
  { href: "/wealth/projection", icon: LineChart, label: "淨資產預測" },
];

import { APP_VERSION } from "@/lib/supabase";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>
        <div className="relative z-10 flex min-h-screen">
          {/* Sidebar */}
          <aside className="sidebar fixed left-0 top-0 bottom-0 w-56 flex flex-col py-6 px-4 z-20">
            {/* Logo */}
            <div className="px-3 mb-8">
              <h1 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <span>💎</span> Wealth
              </h1>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">
                Family Office
              </p>
            </div>

            {/* Nav Groups */}
            <div className="flex-1 space-y-8">
              {/* Expense Section */}
              <div>
                <h2 className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                  日常收支
                </h2>
                <nav className="space-y-1">
                  {EXPENSE_NAV.map(({ href, icon: Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-all group"
                    >
                      <Icon
                        size={16}
                        className="text-zinc-500 group-hover:text-brand-400 transition-colors"
                      />
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Wealth Section */}
              <div>
                <h2 className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                  資產管理
                </h2>
                <nav className="space-y-1">
                  {WEALTH_NAV.map(({ href, icon: Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-all group"
                    >
                      <Icon
                        size={16}
                        className="text-zinc-500 group-hover:text-brand-400 transition-colors"
                      />
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 pt-4 border-t border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[9px] text-zinc-700 font-medium uppercase tracking-tighter">
                <span>{APP_VERSION}</span>
                <span>Cloud Syncing</span>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="ml-56 flex-1 p-8 max-w-5xl mx-auto w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
