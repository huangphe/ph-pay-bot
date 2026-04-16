"use client";

import { Liability, LIABILITY_TYPE_META } from "@/lib/supabase";
import { fmtMoney } from "@/lib/utils";

interface Props {
  monthlyIncome: number;
  liabilities: Liability[];
  avgExpenses: number;
  monthlySavings: number;
}

export default function CashFlowBreakdown({
  monthlyIncome,
  liabilities,
  avgExpenses,
  monthlySavings,
}: Props) {
  const totalFixed = liabilities.reduce((s, l) => s + l.monthly_payment, 0);
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;

  return (
    <div className="space-y-2">
      {/* Income */}
      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-lg">💰</span>
          <span className="text-zinc-200 font-medium">月收入</span>
        </div>
        <span className="text-emerald-400 font-bold text-lg">{fmtMoney(monthlyIncome)}</span>
      </div>

      {/* Fixed liabilities */}
      <div className="pl-4 space-y-1">
        <p className="text-xs text-zinc-500 mb-2 mt-1">固定支出</p>
        {liabilities.map((l) => {
          const meta = LIABILITY_TYPE_META[l.liability_type];
          const pct = monthlyIncome > 0 ? (l.monthly_payment / monthlyIncome) * 100 : 0;
          return (
            <div key={l.id} className="flex items-center justify-between py-2 px-4 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-base">{meta.icon}</span>
                <span className="text-zinc-300 text-sm">{l.name}</span>
                <span className="text-xs text-zinc-600">({pct.toFixed(1)}%)</span>
              </div>
              <span className="text-red-400 text-sm font-medium">-{fmtMoney(l.monthly_payment)}</span>
            </div>
          );
        })}
        {/* Total fixed */}
        <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-red-500/5 border border-red-500/10">
          <span className="text-zinc-400 text-sm font-medium">固定支出小計</span>
          <span className="text-red-400 font-semibold">-{fmtMoney(totalFixed)}</span>
        </div>
      </div>

      {/* Variable expenses from couple-finance */}
      <div className="pl-4">
        <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <div>
            <span className="text-zinc-300 text-sm font-medium">🛒 變動支出 (近3月均)</span>
            <p className="text-xs text-zinc-600 mt-0.5">資料來源：日常記帳</p>
          </div>
          <span className="text-amber-400 font-semibold">-{fmtMoney(avgExpenses)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 my-2" />

      {/* Net savings */}
      <div className={`flex items-center justify-between py-3 px-4 rounded-lg border ${
        monthlySavings >= 0
          ? "bg-brand-500/10 border-brand-500/20"
          : "bg-red-500/10 border-red-500/20"
      }`}>
        <div>
          <span className={`font-bold text-lg ${monthlySavings >= 0 ? "text-brand-400" : "text-red-400"}`}>
            月淨儲蓄
          </span>
          <p className="text-xs text-zinc-500 mt-0.5">
            儲蓄率 {(savingsRate * 100).toFixed(1)}%
          </p>
        </div>
        <span className={`font-bold text-2xl ${monthlySavings >= 0 ? "text-brand-400" : "text-red-400"}`}>
          {monthlySavings >= 0 ? "" : "-"}{fmtMoney(Math.abs(monthlySavings))}
        </span>
      </div>
    </div>
  );
}
