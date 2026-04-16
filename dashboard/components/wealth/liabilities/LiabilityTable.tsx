"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Liability, LIABILITY_TYPE_META, OWNER_LABELS, deleteLiability, getLiabilityBalance } from "@/lib/supabase";
import { fmtMoney, fmtDate } from "@/lib/utils";
import LiabilityForm from "./LiabilityForm";
import DeleteButton from "@/components/wealth/ui/DeleteButton";

interface Props {
  liabilities: Liability[];
  onRefresh: () => void;
}

export default function LiabilityTable({ liabilities, onRefresh }: Props) {
  const [editing, setEditing] = useState<Liability | null>(null);

  if (liabilities.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600">
        <p className="text-4xl mb-3">🏦</p>
        <p className="text-sm">尚未新增固定負債</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-xs text-zinc-500 border-b border-white/5 uppercase tracking-wider">
              <th className="text-left pb-4 font-medium px-4">名稱</th>
              <th className="text-left pb-4 font-medium px-4">類型</th>
              <th className="text-left pb-4 font-medium px-4">負責人</th>
              <th className="text-right pb-4 font-medium px-4">每月</th>
              <th className="text-right pb-4 font-medium px-4">剩餘總額</th>
              <th className="text-right pb-4 font-medium px-4">利率</th>
              <th className="text-right pb-4 font-medium px-4">到期日</th>
              <th className="pb-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {liabilities.map((l) => {
              const meta = LIABILITY_TYPE_META[l.liability_type];
              const balance = getLiabilityBalance(l);
              const isEstimated = !l.total_remaining && l.due_date;

              return (
                <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 text-zinc-200 font-medium">{l.name}</td>
                  <td className="py-3 text-zinc-400">
                    <span className="flex items-center gap-1">
                      <span>{meta.icon}</span>
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-400">{OWNER_LABELS[l.owner]}</td>
                  <td className="py-3 text-right text-red-400 font-semibold">-{fmtMoney(l.monthly_payment)}</td>
                  <td className="py-3 text-right text-zinc-300">
                    {balance > 0 ? (
                      <span className="flex items-center justify-end gap-1">
                        {isEstimated && <span className="text-[10px] text-zinc-600">約</span>}
                        {fmtMoney(balance)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-3 text-right text-zinc-400">
                    {l.interest_rate ? `${l.interest_rate}%` : "—"}
                  </td>
                  <td className="py-3 text-right text-zinc-400">
                    {l.due_date ? fmtDate(l.due_date) : "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setEditing(l)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <DeleteButton onDelete={async () => { await deleteLiability(l.id); onRefresh(); }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <LiabilityForm existing={editing} onClose={() => setEditing(null)} onSaved={onRefresh} />
      )}
    </>
  );
}
