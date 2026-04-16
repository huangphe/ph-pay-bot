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
} from "@/lib/supabase";
import { fmtMoney } from "@/lib/utils";
import { computeMonthlySavings } from "@/lib/projection";
import StatCard from "@/components/wealth/ui/StatCard";
import GlassCard from "@/components/wealth/ui/GlassCard";
import BalanceSheetSummary from "@/components/wealth/dashboard/BalanceSheetSummary";
import MiniNetWorthChart from "@/components/wealth/dashboard/MiniNetWorthChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [assets, liabilities, incomeSources, snapshots, avgExpenses] =
    await Promise.all([
      fetchAssets().catch((e) => { console.error("FetchAssets Error:", e); return []; }),
      fetchActiveLiabilities().catch((e) => { console.error("FetchLiabilities Error:", e); return []; }),
      fetchActiveIncomeSources().catch((e) => { console.error("FetchIncome Error:", e); return []; }),
      fetchNetWorthSnapshots(12).catch((e) => { console.error("FetchSnapshots Error:", e); return []; }),
      fetchAvgMonthlyExpenses(3).catch((e) => { console.error("FetchExpenses Error:", e); return 0; }),
    ]);

  console.log(`[Server Debug] Assets: ${assets.length}, Liabilities: ${liabilities.length}, Income: ${incomeSources.length}`);

  const totalAssets = totalAssetValue(assets);
  const totalLiab = totalLiabilitiesRemaining(liabilities);
  const netWorth = totalAssets - totalLiab;
  const monthlyIncome = totalMonthlyIncome(incomeSources);
  const monthlyFixed = totalMonthlyLiabilities(liabilities);
  const monthlySavings = computeMonthlySavings(monthlyIncome, monthlyFixed, avgExpenses);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">總覽</h1>
        <p className="text-sm text-zinc-500 mt-1">資產負債表 · 今日快照</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="總資產" value={fmtMoney(totalAssets)} color="green" />
        <StatCard label="總負債" value={fmtMoney(totalLiab)} color="red" />
        <StatCard
          label="淨資產"
          value={fmtMoney(netWorth)}
          color={netWorth >= 0 ? "green" : "red"}
        />
      </div>

      {/* Balance sheet */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">資產負債表</h2>
        <BalanceSheetSummary assets={assets} liabilities={liabilities} />
      </GlassCard>

      {/* Net worth chart */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">淨資產歷史</h2>
        <MiniNetWorthChart snapshots={snapshots} />
      </GlassCard>

      {/* Monthly cash flow summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="月收入" value={fmtMoney(monthlyIncome)} />
        <StatCard label="固定支出" value={fmtMoney(monthlyFixed)} color="red" />
        <StatCard label="變動支出 (均)" value={fmtMoney(avgExpenses)} color="amber" />
        <StatCard
          label="月淨儲蓄"
          value={fmtMoney(monthlySavings)}
          color={monthlySavings >= 0 ? "green" : "red"}
          sub={`儲蓄率 ${monthlyIncome > 0 ? ((monthlySavings / monthlyIncome) * 100).toFixed(1) : 0}%`}
        />
      </div>
    </div>
  );
}
