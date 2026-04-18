"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Liability,
  IncomeSource,
  fetchActiveIncomeSources,
  fetchActiveLiabilities,
  fetchAvgMonthlyExpenses,
  totalMonthlyIncome,
  totalMonthlyLiabilities,
  fetchAssets,
  fetchNetWorthSnapshots,
  upsertNetWorthSnapshot,
  totalAssetValue,
  totalLiabilitiesRemaining,
  Asset,
} from "@/lib/supabase";
import { fmtMoney, firstDayOfMonth, currentYearMonth } from "@/lib/utils";
import { computeMonthlySavings } from "@/lib/projection";
import GlassCard from "@/components/wealth/ui/GlassCard";
import StatCard from "@/components/wealth/ui/StatCard";
import CashFlowBreakdown from "@/components/wealth/cashflow/CashFlowBreakdown";
import { Save } from "lucide-react";

export default function CashFlowPage() {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [avgExpenses, setAvgExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [inc, liab, ast, avg] = await Promise.all([
        fetchActiveIncomeSources(),
        fetchActiveLiabilities(),
        fetchAssets(),
        fetchAvgMonthlyExpenses(3),
      ]);
      setIncomeSources(inc);
      setLiabilities(liab);
      setAssets(ast);
      setAvgExpenses(avg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const monthlyIncome = totalMonthlyIncome(incomeSources);
  const monthlyFixed = totalMonthlyLiabilities(liabilities);
  const monthlySavings = computeMonthlySavings(monthlyIncome, monthlyFixed, avgExpenses);

  async function saveSnapshot() {
    setSaving(true);
    setSavedMsg("");
    try {
      const { year, month } = currentYearMonth();
      const snapshotDate = firstDayOfMonth(year, month);
      const totalAssets = totalAssetValue(assets);
      const totalLiab = totalLiabilitiesRemaining(liabilities);
      await upsertNetWorthSnapshot({
        snapshot_date: snapshotDate,
        total_assets: totalAssets,
        total_liabilities: totalLiab,
        net_worth: totalAssets - totalLiab,
        monthly_income: monthlyIncome,
        monthly_expenses: avgExpenses,
        monthly_savings: monthlySavings,
      });
      setSavedMsg(`✓ ${year}/${month} 快照已儲存`);
    } catch (e: unknown) {
      setSavedMsg(`儲存失敗: ${e instanceof Error ? e.message : "未知錯誤"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">月現金流</h1>
          <p className="text-sm text-zinc-500 mt-1">收入 − 固定支出 − 變動支出</p>
        </div>
        <div className="flex items-center gap-3">
          {savedMsg && (
            <span className="text-xs text-emerald-400">{savedMsg}</span>
          )}
          <button
            onClick={saveSnapshot}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 text-brand-400 text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "儲存中…" : "儲存本月快照"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-600 text-sm text-center py-16">載入中…</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="月收入" value={fmtMoney(monthlyIncome)} color="green" />
            <StatCard label="月固定支出" value={fmtMoney(monthlyFixed)} color="red" />
            <StatCard label="月變動支出 (均)" value={fmtMoney(avgExpenses)} color="amber" />
            <StatCard
              label="月淨儲蓄"
              value={fmtMoney(monthlySavings)}
              color={monthlySavings >= 0 ? "green" : "red"}
              sub={`儲蓄率 ${monthlyIncome > 0 ? ((monthlySavings / monthlyIncome) * 100).toFixed(1) : 0}%`}
            />
          </div>

          <GlassCard>
            <h2 className="text-sm font-semibold text-zinc-300 mb-5">現金流明細</h2>
            <CashFlowBreakdown
              monthlyIncome={monthlyIncome}
              liabilities={liabilities}
              avgExpenses={avgExpenses}
              monthlySavings={monthlySavings}
            />
          </GlassCard>

          <GlassCard>
            <p className="text-xs text-zinc-600">
              💡 變動支出來自「日常記帳」app 的 <code className="text-zinc-500">expenses</code> 表，取近 3 個完整月份平均值。
              點擊「儲存本月快照」將目前淨資產存入歷史記錄，供淨資產預測圖使用（建議每月執行一次）。
            </p>
          </GlassCard>
        </>
      )}
    </div>
  );
}
