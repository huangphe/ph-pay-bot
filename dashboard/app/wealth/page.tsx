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
import { fmtMoney } from "@/lib/utils";
import { computeMonthlySavings } from "@/lib/projection";
import StatCard from "@/components/wealth/ui/StatCard";
import GlassCard from "@/components/wealth/ui/GlassCard";
import BalanceSheetSummary from "@/components/wealth/dashboard/BalanceSheetSummary";
import MiniNetWorthChart from "@/components/wealth/dashboard/MiniNetWorthChart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const errors: string[] = [];
  const buildTime = new Date().toISOString();

      fetchAvgMonthlyExpenses(3).catch((e) => { errors.push(`[fetchAvgExpenses]: ${e.message || String(e)}`); return 0; }),
      fetchMonthExpenses(new Date().getFullYear(), new Date().getMonth() + 1).catch((e) => { 
        errors.push(`[fetchCurrentMonth]: ${e.message || String(e)}`); return []; 
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
      <div className="bg-blue-900/50 text-blue-100 p-2 rounded text-xs border border-blue-500/50 font-mono">
        v1.2.1-LIVE | Build: {buildTime} | Assets: {assets.length} | Liab: {liabilities.length} | Errors: {errors.length}
      </div>

      {errors.length > 0 && (
        <div className="bg-red-900/50 text-red-100 p-4 rounded-xl border border-red-500/50 shadow-lg text-sm mb-6 max-h-48 overflow-auto">
          <h3 className="font-bold mb-2">🔥 Server Data Fetching Failed:</h3>
          <ul className="list-disc pl-5 space-y-1">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

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
