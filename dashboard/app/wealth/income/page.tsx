"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  IncomeSource,
  fetchAllIncomeSources,
  totalMonthlyIncome,
  normalizeToMonthly,
} from "@/lib/supabase";
import { fmtMoney } from "@/lib/utils";
import GlassCard from "@/components/wealth/ui/GlassCard";
import StatCard from "@/components/wealth/ui/StatCard";
import IncomeTable from "@/components/wealth/income/IncomeTable";
import IncomeForm from "@/components/wealth/income/IncomeForm";

export default function IncomePage() {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSources(await fetchAllIncomeSources());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const activeSources = sources.filter((s) => s.is_active);
  const monthlyTotal = totalMonthlyIncome(activeSources);
  const annualTotal = monthlyTotal * 12;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">收入來源</h1>
          <p className="text-sm text-zinc-500 mt-1">薪資、租金、副業等固定收入</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-colors"
        >
          <Plus size={15} />
          新增收入
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="月收入合計" value={fmtMoney(monthlyTotal)} color="green" />
        <StatCard label="年收入合計" value={fmtMoney(annualTotal)} sub="月均 × 12" />
      </div>

      <GlassCard>
        {loading ? (
          <p className="text-zinc-600 text-sm text-center py-8">載入中…</p>
        ) : (
          <IncomeTable sources={activeSources} onRefresh={refresh} />
        )}
      </GlassCard>

      {adding && (
        <IncomeForm onClose={() => setAdding(false)} onSaved={refresh} />
      )}
    </div>
  );
}
