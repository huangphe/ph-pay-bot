"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  fetchActiveIncomeSources,
  fetchActiveLiabilities,
  fetchAvgMonthlyExpenses,
  fetchNetWorthSnapshots,
  fetchActiveRetirementGoal,
  fetchAssets,
  totalMonthlyIncome,
  totalMonthlyLiabilities,
  totalAssetValue,
  totalLiabilitiesRemaining,
  upsertRetirementGoal,
  RetirementGoal,
  NetWorthSnapshot,
} from "@/lib/supabase";
import { computeMonthlySavings, runProjection, ProjectionResult } from "@/lib/projection";
import { fmtMoney } from "@/lib/utils";
import GlassCard from "@/components/wealth/ui/GlassCard";
import StatCard from "@/components/wealth/ui/StatCard";
import NetWorthChart from "@/components/wealth/projection/NetWorthChart";
import RetirementGoalCard from "@/components/wealth/projection/RetirementGoalCard";
import Modal from "@/components/wealth/ui/Modal";

const DEFAULT_GOAL_FORM = {
  label: "退休計畫",
  current_age: "35",
  retirement_age: "60",
  target_amount: "20000000",
  expected_return_rate: "7",
  inflation_rate: "2",
};

export default function ProjectionPage() {
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<RetirementGoal | null>(null);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [result, setResult] = useState<ProjectionResult | null>(null);
  const [currentNetWorth, setCurrentNetWorth] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [addingGoal, setAddingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState(DEFAULT_GOAL_FORM);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [inc, liab, avg, snaps, g, assets] = await Promise.all([
        fetchActiveIncomeSources(),
        fetchActiveLiabilities(),
        fetchAvgMonthlyExpenses(3),
        fetchNetWorthSnapshots(36),
        fetchActiveRetirementGoal(),
        fetchAssets(),
      ]);

      const monthlyIncome = totalMonthlyIncome(inc);
      const monthlyFixed = totalMonthlyLiabilities(liab);
      const savings = computeMonthlySavings(monthlyIncome, monthlyFixed, avg);
      const nw = totalAssetValue(assets) - totalLiabilitiesRemaining(liab);

      setCurrentNetWorth(nw);
      setMonthlySavings(savings);
      setSnapshots(snaps);
      setGoal(g);

      if (g) {
        setResult(
          runProjection({
            currentNetWorth: nw,
            monthlySavings: savings,
            goal: g,
            historicalSnapshots: snaps,
          })
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function createGoal(e: React.FormEvent) {
    e.preventDefault();
    setSavingGoal(true);
    setGoalError("");
    try {
      await upsertRetirementGoal({
        label: goalForm.label,
        current_age: parseInt(goalForm.current_age),
        retirement_age: parseInt(goalForm.retirement_age),
        target_amount: parseFloat(goalForm.target_amount),
        expected_return_rate: parseFloat(goalForm.expected_return_rate) / 100,
        inflation_rate: parseFloat(goalForm.inflation_rate) / 100,
        is_active: true,
      });
      setAddingGoal(false);
      refresh();
    } catch (e: unknown) {
      setGoalError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSavingGoal(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const retirementYear = goal
    ? currentYear + (goal.retirement_age - goal.current_age)
    : currentYear + 25;

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-brand-500";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">淨資產預測</h1>
          <p className="text-sm text-zinc-500 mt-1">複利成長 · 退休目標追蹤</p>
        </div>
        {!goal && (
          <button
            onClick={() => setAddingGoal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-colors"
          >
            <Plus size={15} />
            設定退休目標
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-zinc-600 text-sm text-center py-16">載入中…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="目前淨資產" value={fmtMoney(currentNetWorth)} color={currentNetWorth >= 0 ? "green" : "red"} />
            <StatCard label="月淨儲蓄" value={fmtMoney(monthlySavings)} color={monthlySavings >= 0 ? "green" : "red"} />
            <StatCard label="年儲蓄" value={fmtMoney(monthlySavings * 12)} />
          </div>

          {goal && result ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <GlassCard className="lg:col-span-2">
                <h2 className="text-sm font-semibold text-zinc-300 mb-4">淨資產累積圖</h2>
                <NetWorthChart
                  points={result.points}
                  retirementYear={retirementYear}
                  targetAmount={goal.target_amount}
                />
              </GlassCard>

              <RetirementGoalCard
                goal={goal}
                result={result}
                onUpdated={refresh}
              />
            </div>
          ) : (
            <GlassCard>
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🎯</p>
                <p className="text-zinc-400 mb-1">尚未設定退休目標</p>
                <p className="text-zinc-600 text-sm mb-5">
                  設定目標後，系統將根據目前淨資產、月儲蓄及預期投資報酬率，計算達標時間
                </p>
                <button
                  onClick={() => setAddingGoal(true)}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-colors"
                >
                  設定退休目標
                </button>
              </div>
            </GlassCard>
          )}

          {snapshots.length > 0 && (
            <GlassCard>
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">歷史快照</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 border-b border-white/5">
                      <th className="text-left pb-2 font-medium">月份</th>
                      <th className="text-right pb-2 font-medium">總資產</th>
                      <th className="text-right pb-2 font-medium">總負債</th>
                      <th className="text-right pb-2 font-medium">淨資產</th>
                      <th className="text-right pb-2 font-medium">月儲蓄</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {snapshots.slice().reverse().map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.02]">
                        <td className="py-2 text-zinc-400">{s.snapshot_date.slice(0, 7)}</td>
                        <td className="py-2 text-right text-zinc-300">{fmtMoney(s.total_assets)}</td>
                        <td className="py-2 text-right text-red-400">{fmtMoney(s.total_liabilities)}</td>
                        <td className="py-2 text-right text-emerald-400 font-semibold">{fmtMoney(s.net_worth)}</td>
                        <td className="py-2 text-right text-zinc-400">
                          {s.monthly_savings ? fmtMoney(s.monthly_savings) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}

      {addingGoal && (
        <Modal title="設定退休目標" onClose={() => setAddingGoal(false)}>
          <form onSubmit={createGoal} className="space-y-4">
            {[
              { key: "label", label: "計畫名稱", type: "text", placeholder: "我的退休計畫" },
              { key: "current_age", label: "現在年齡", type: "number", placeholder: "35" },
              { key: "retirement_age", label: "退休年齡", type: "number", placeholder: "60" },
              { key: "target_amount", label: "目標金額 (TWD)", type: "number", placeholder: "20000000" },
              { key: "expected_return_rate", label: "預期年報酬率 %", type: "number", placeholder: "7" },
              { key: "inflation_rate", label: "通膨率 %", type: "number", placeholder: "2" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                <input
                  className={inputCls}
                  type={type}
                  placeholder={placeholder}
                  value={goalForm[key as keyof typeof goalForm]}
                  onChange={(e) => setGoalForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            {goalError && <p className="text-red-400 text-xs">{goalError}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setAddingGoal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">取消</button>
              <button type="submit" disabled={savingGoal} className="px-5 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg disabled:opacity-50">
                {savingGoal ? "儲存中…" : "建立"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
