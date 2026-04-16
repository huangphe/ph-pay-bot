"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  IncomeSource,
  INCOME_CATEGORY_META,
  OWNER_LABELS,
  deleteIncomeSource,
  normalizeToMonthly,
} from "@/lib/supabase";
import { fmtMoney } from "@/lib/utils";
import IncomeForm from "./IncomeForm";
import DeleteButton from "@/components/wealth/ui/DeleteButton";

interface Props {
  sources: IncomeSource[];
  onRefresh: () => void;
}

const FREQ_LABEL: Record<string, string> = {
  monthly: "每月",
  quarterly: "每季",
  annual: "每年",
};

export default function IncomeTable({ sources, onRefresh }: Props) {
  const [editing, setEditing] = useState<IncomeSource | null>(null);

  if (sources.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600">
        <p className="text-4xl mb-3">💰</p>
        <p className="text-sm">尚未新增收入來源</p>
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
              <th className="text-left pb-3 font-medium">類別</th>
              <th className="text-left pb-3 font-medium">負責人</th>
              <th className="text-left pb-3 font-medium">頻率</th>
              <th className="text-right pb-3 font-medium">原始金額</th>
              <th className="text-right pb-3 font-medium">月均</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sources.map((s) => {
              const meta = INCOME_CATEGORY_META[s.category];
              const monthly = normalizeToMonthly(s);
              return (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 text-zinc-200 font-medium">{s.name}</td>
                  <td className="py-3 text-zinc-400">
                    <span className="flex items-center gap-1">
                      <span>{meta.icon}</span>
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-400">{OWNER_LABELS[s.owner]}</td>
                  <td className="py-3 text-zinc-400">{FREQ_LABEL[s.frequency]}</td>
                  <td className="py-3 text-right text-zinc-300">{fmtMoney(s.amount)}</td>
                  <td className="py-3 text-right text-emerald-400 font-semibold">{fmtMoney(monthly)}</td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setEditing(s)}
                        className="text-zinc-500 hover:text-zinc-200 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <DeleteButton
                        onDelete={async () => {
                          await deleteIncomeSource(s.id);
                          onRefresh();
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <IncomeForm
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}
