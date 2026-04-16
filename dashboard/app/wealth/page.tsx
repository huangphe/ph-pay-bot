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
export const revalidate = 0;

export default async function DashboardPage() {
  const errors: string[] = [];
  const buildTime = new Date().toISOString();

  const [assets, liabilities, incomeSources, snapshots, avgExpenses] =
    await Promise.all([
      fetchAssets().catch((e) => { errors.push(`[fetchAssets]: ${e.message || String(e)}`); return []; }),
      fetchActiveLiabilities().catch((e) => { errors.push(`[fetchLiabilities]: ${e.message || String(e)}`); return []; }),
      fetchActiveIncomeSources().catch((e) => { errors.push(`[fetchIncome]: ${e.message || String(e)}`); return []; }),
      fetchNetWorthSnapshots(12).catch((e) => { errors.push(`[fetchSnapshots]: ${e.message || String(e)}`); return []; }),
      fetchAvgMonthlyExpenses(3).catch((e) => { errors.push(`[fetchAvgExpenses]: ${e.message || String(e)}`); return 0; }),
    ]);

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
