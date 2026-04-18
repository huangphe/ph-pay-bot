"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  CreditCard,
  BarChart3,
  LineChart,
  CalendarDays,
  ReceiptText,
  Menu,
  X,
} from "lucide-react";
import { APP_VERSION } from "@/lib/supabase";

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

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setIsOpen(false);

  const linkCls = (href: string) => {
    const isActive = pathname === href;
    return `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group ${
      isActive
        ? "text-zinc-100 bg-white/[0.08]"
        : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]"
    }`;
  };

  const iconCls = (href: string) => {
    const isActive = pathname === href;
    return `transition-colors ${
      isActive ? "text-brand-400" : "text-zinc-500 group-hover:text-brand-400"
    }`;
  };

  return (
    <>
      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 z-30 lg:hidden">
        <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <span>💎</span> Wealth
        </h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          sidebar fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col py-6 px-4
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:w-56
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
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
          <div>
            <h2 className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
              日常收支
            </h2>
            <nav className="space-y-1">
              {EXPENSE_NAV.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} onClick={close} className={linkCls(href)}>
                  <Icon size={16} className={iconCls(href)} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
              資產管理
            </h2>
            <nav className="space-y-1">
              {WEALTH_NAV.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} onClick={close} className={linkCls(href)}>
                  <Icon size={16} className={iconCls(href)} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-[9px] text-zinc-700 font-medium uppercase tracking-tighter">
            <span>{APP_VERSION}</span>
            <span>Cloud Syncing</span>
          </div>
        </div>
      </aside>
    </>
  );
}
