"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  Asset,
  fetchAssets,
  totalAssetValue,
  totalPurchaseCost,
  groupAssetsByType,
} from "@/lib/supabase";
import { fmtMoney, fmtPctChange } from "@/lib/utils";
import GlassCard from "@/components/wealth/ui/GlassCard";
import StatCard from "@/components/wealth/ui/StatCard";
import AssetTable from "@/components/wealth/assets/AssetTable";
import AssetForm from "@/components/wealth/assets/AssetForm";
import AllocationPie from "@/components/wealth/assets/AllocationPie";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAssets(await fetchAssets());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const totalValue = totalAssetValue(assets);
  const totalCost = totalPurchaseCost(assets);
  const totalGain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? totalGain / totalCost : 0;
  const byType = groupAssetsByType(assets);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">投資資產</h1>
          <p className="text-sm text-zinc-500 mt-1">股票、ETF、不動產、現金等</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-colors"
        >
          <Plus size={15} />
          新增資產
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="總現值" value={fmtMoney(totalValue)} color="green" />
        <StatCard label="總成本" value={fmtMoney(totalCost)} />
        <StatCard
          label="未實現損益"
          value={fmtMoney(totalGain)}
          sub={fmtPctChange(gainPct)}
          color={totalGain >= 0 ? "green" : "red"}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">資產配置</h2>
          <AllocationPie byType={byType} />
        </GlassCard>

        <GlassCard>
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">資產明細</h2>
          {loading ? (
            <p className="text-zinc-600 text-sm text-center py-8">載入中…</p>
          ) : (
            <AssetTable assets={assets} onRefresh={refresh} />
          )}
        </GlassCard>
      </div>

      {adding && (
        <AssetForm onClose={() => setAdding(false)} onSaved={refresh} />
      )}
    </div>
  );
}
