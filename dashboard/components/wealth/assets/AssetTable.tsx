"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Asset, ASSET_TYPE_META, OWNER_LABELS, deleteAsset } from "@/lib/supabase";
import { fmtMoney, fmtPctChange } from "@/lib/utils";
import AssetForm from "./AssetForm";
import DeleteButton from "@/components/wealth/ui/DeleteButton";

interface Props {
  assets: Asset[];
  onRefresh: () => void;
}

export default function AssetTable({ assets, onRefresh }: Props) {
  const [editing, setEditing] = useState<Asset | null>(null);

  if (assets.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600">
        <p className="text-4xl mb-3">📈</p>
        <p className="text-sm">尚未新增資產</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 border-b border-white/5">
              <th className="text-left pb-3 font-medium">名稱</th>
              <th className="text-left pb-3 font-medium">類型</th>
              <th className="text-left pb-3 font-medium">負責人</th>
              <th className="text-right pb-3 font-medium">成本</th>
              <th className="text-right pb-3 font-medium">現值</th>
              <th className="text-right pb-3 font-medium">未實現損益</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {assets.map((a) => {
              const meta = ASSET_TYPE_META[a.asset_type];
              const gain = a.current_value - a.purchase_cost;
              const gainPct = a.purchase_cost > 0 ? gain / a.purchase_cost : 0;
              const gainColor = gain >= 0 ? "text-emerald-400" : "text-red-400";
              return (
                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3">
                    <div className="text-zinc-200 font-medium">{a.name}</div>
                    {a.ticker && <div className="text-xs text-zinc-500">{a.ticker}</div>}
                  </td>
                  <td className="py-3 text-zinc-400">
                    <span className="flex items-center gap-1">
                      <span>{meta.icon}</span>
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-400">{OWNER_LABELS[a.owner]}</td>
                  <td className="py-3 text-right text-zinc-400">{fmtMoney(a.purchase_cost)}</td>
                  <td className="py-3 text-right text-zinc-200 font-semibold">{fmtMoney(a.current_value)}</td>
                  <td className={`py-3 text-right font-semibold ${gainColor}`}>
                    {fmtMoney(gain)}
                    <span className="text-xs ml-1 opacity-70">{fmtPctChange(gainPct)}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setEditing(a)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <DeleteButton onDelete={async () => { await deleteAsset(a.id); onRefresh(); }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <AssetForm existing={editing} onClose={() => setEditing(null)} onSaved={onRefresh} />
      )}
    </>
  );
}
