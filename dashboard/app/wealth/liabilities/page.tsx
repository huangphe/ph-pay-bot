"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  Liability,
  fetchActiveLiabilities,
  totalMonthlyLiabilities,
  totalLiabilitiesRemaining,
} from "@/lib/supabase";
import { fmtMoney } from "@/lib/utils";
import GlassCard from "@/components/wealth/ui/GlassCard";
import StatCard from "@/components/wealth/ui/StatCard";
import LiabilityTable from "@/components/wealth/liabilities/LiabilityTable";
import LiabilityForm from "@/components/wealth/liabilities/LiabilityForm";

export default function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLiabilities(await fetchActiveLiabilities());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const monthlyTotal = totalMonthlyLiabilities(liabilities);
  const remainingTotal = totalLiabilitiesRemaining(liabilities);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">固定負債</h1>
          <p className="text-sm text-zinc-500 mt-1">房貸、車貸、保險、訂閱等固定支出</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-colors"
        >
          <Plus size={15} />
          新增負債
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="每月固定支出" value={fmtMoney(monthlyTotal)} color="red" />
        <StatCard label="總剩餘負債" value={fmtMoney(remainingTotal)} color="red" sub="含無到期日項目估算" />
      </div>

      <GlassCard>
        {loading ? (
          <p className="text-zinc-600 text-sm text-center py-8">載入中…</p>
        ) : (
          <LiabilityTable liabilities={liabilities} onRefresh={refresh} />
        )}
      </GlassCard>

      {adding && (
        <LiabilityForm onClose={() => setAdding(false)} onSaved={refresh} />
      )}
    </div>
  );
}
