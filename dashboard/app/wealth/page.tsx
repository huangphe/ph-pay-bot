import {
  fetchAssets,
  fetchActiveLiabilities,
  fetchActiveIncomeSources,
  fetchNetWorthSnapshots,
  fetchAvgMonthlyExpenses,
  totalAssetValue,
  totalMonthlyLiabilities,
  totalLiabilitiesRemaining,
  totalMonthlyIncome,
  fetchMonthExpenses,
  totalAmount,
} from "@/lib/supabase";
import { fmtMoney, currentYearMonth } from "@/lib/utils";
import { computeMonthlySavings } from "@/lib/projection";
import StatCard from "@/components/wealth/ui/StatCard";
import GlassCard from "@/components/wealth/ui/GlassCard";
import BalanceSheetSummary from "@/components/wealth/dashboard/BalanceSheetSummary";
import MiniNetWorthChart from "@/components/wealth/dashboard/MiniNetWorthChart";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function DashboardPage() {
  const { year: curYear, month: curMonth } = currentYearMonth();

  const [assets, liabilities, incomeSources, snapshots, avgExpenses, expensesRaw] =
    await Promise.all([
      fetchAssets().catch((e) => { console.error("[fetchAssets]:", e); return []; }),
      fetchActiveLiabilities().catch((e) => { console.error("[fetchLiabilities]:", e); return []; }),
      fetchActiveIncomeSources().catch((e) => { console.error("[fetchIncome]:", e); return []; }),
      fetchNetWorthSnapshots(12).catch((e) => { console.error("[fetchSnapshots]:", e); return []; }),
      fetchAvgMonthlyExpenses(3).catch((e) => { console.error("[fetchAvgExpenses]:", e); return 0; }),
      fetchMonthExpenses(curYear, curMonth).catch((e) => { 
        console.error("[fetchCurrentMonth]:", e); return []; 
      }),
    ]);

  const currentMonthTotal = totalAmount(expensesRaw as any);

  const totalAssets = totalAssetValue(assets);
  const totalLiab = totalLiabilitiesRemaining(liabilities);
  const netWorth = totalAssets - totalLiab;
  const monthlyIncome = totalMonthlyIncome(incomeSources);
  const monthlyFixed = totalMonthlyLiabilities(liabilities);
  const monthlySavings = computeMonthlySavings(monthlyIncome, monthlyFixed, avgExpenses);

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
        <div>
          <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">
            Family Office · Wealth Overview
          </p>
          <h1 className="text-2xl font-black text-white">家庭財務總覽</h1>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">資料狀態</p>
          <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 justify-end mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            雲端即時同步
          </p>
        </div>
      </div>

      {/* SECTION 1: 🧊 財務快照 (資產負債表) */}
      <section className="space-y-6">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-black text-white">🧊 財務快照</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">資產負債 · 昨日今日</p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="總資產" value={fmtMoney(totalAssets)} color="green" />
          <StatCard label="總負債" value={fmtMoney(totalLiab)} color="red" />
          <StatCard
            label="淨資產"
            value={fmtMoney(netWorth)}
            color={netWorth >= 0 ? "green" : "red"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balance sheet */}
          <GlassCard>
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">資產負債明細</h2>
            <BalanceSheetSummary assets={assets} liabilities={liabilities} />
          </GlassCard>

          {/* Net worth chart */}
          <GlassCard>
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">淨資產增長歷史</h2>
            <MiniNetWorthChart snapshots={snapshots} />
          </GlassCard>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-white/[0.05] my-4" />

      {/* SECTION 2: 🌊 現金流健康診斷 (月度收支) */}
      <section className="space-y-6">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-black text-white">🌊 現金流健康診斷</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">收支能力 · 月度分析</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="預估月收入" value={fmtMoney(monthlyIncome)} />
          <StatCard label="固定支出 (房租貸款)" value={fmtMoney(monthlyFixed)} color="red" />
          <StatCard 
            label="變動支出 (本月累計)" 
            value={fmtMoney(currentMonthTotal)} 
            color="amber" 
            sub={`長期平均：${fmtMoney(avgExpenses)}`}
          />
          <StatCard
            label="預計月儲蓄"
            value={fmtMoney(monthlySavings)}
            color={monthlySavings >= 0 ? "green" : "red"}
            sub={`儲蓄率 ${monthlyIncome > 0 ? ((monthlySavings / monthlyIncome) * 100).toFixed(1) : 0}%`}
          />
        </div>

        <div className="bg-amber-950/20 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-200/70 leading-relaxed italic">
          💡 <strong>專家提醒：</strong>變動支出（本月累計）僅供即時參考。資產負債表反映的是長期身價，而現金流則是您財富增長的引擎。變動支出較平均值高時，可能會延緩您淨資產的累積速度。
        </div>
      </section>
    </div>
  );
}
