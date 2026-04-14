"use client";

import { useState } from "react";
import { Expense, fmtMoney, getCatMeta, updateExpense, getDisplayName } from "@/lib/supabase";
import { format } from "date-fns";

interface ExpenseTableProps {
  initialExpenses: Expense[];
  showDate?: boolean;
}

export default function ExpenseTable({ initialExpenses, showDate = false }: ExpenseTableProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    amount_twd: number;
    category: string;
    note: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setEditForm({
      amount_twd: e.amount_twd,
      category: e.category,
      note: e.note,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async (id: number) => {
    if (!editForm) return;
    setIsSaving(true);
    try {
      const updated = await updateExpense(id, editForm);
      if (updated) {
        setExpenses(expenses.map((e) => (e.id === id ? { ...e, ...updated } : e)));
      }
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      console.error("Failed to update expense:", err);
      alert("更新失敗，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  };

  const toTaiwanTime = (utcStr: string): Date => {
    const d = new Date(utcStr);
    d.setHours(d.getHours() + 8);
    return d;
  };

  if (expenses.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-3">📝</p>
        <p className="text-xs font-bold text-zinc-700 uppercase tracking-widest">今日尚無記帳記錄</p>
        <p className="text-xs text-zinc-800 mt-1">在 Telegram 傳送「金額 說明」即可記帳</p>
      </div>
    );
  }

  const sortedExpenses = [...expenses].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const total = sortedExpenses.reduce((sum, e) => sum + e.amount_twd, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/[0.015] text-left">
            <th className="px-6 py-3 text-[10px] font-black text-brand-400 bg-brand-500/5 uppercase tracking-widest border-r border-white/[0.04]">
              功能
            </th>
            {showDate && <th className="px-6 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">日期</th>}
            <th className="px-4 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">類別</th>
            <th className="px-4 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">說明</th>
            <th className="px-4 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-right">金額</th>
            <th className="px-6 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">記錄者</th>
          </tr>
        </thead>
        <tbody>
          {sortedExpenses.map((e) => {
            const isEditing = editingId === e.id;
            const { icon } = getCatMeta(isEditing ? editForm!.category : e.category);
            const twTime = toTaiwanTime(e.created_at);
            const timeStr = `${twTime.getHours().toString().padStart(2, "0")}:${twTime.getMinutes().toString().padStart(2, "0")}`;

            // 統一名稱格式
            const displayName = getDisplayName(e);

            return (
              <tr key={e.id} className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                {/* 功能欄位 (最左側) */}
                <td className="px-6 py-3 bg-brand-500/[0.02] border-r border-white/[0.04]">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(e.id)}
                        disabled={isSaving}
                        className="px-2 py-1 bg-brand-500 text-[10px] font-black text-white rounded uppercase tracking-tighter disabled:opacity-50"
                      >
                        {isSaving ? "存檔..." : "儲存"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="px-2 py-1 bg-zinc-800 text-[10px] font-black text-zinc-400 rounded uppercase tracking-tighter"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-500 text-[10px] font-black text-white hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/20 uppercase tracking-widest"
                    >
                      <span>✏️</span>
                      <span>編輯</span>
                    </button>
                  )}
                </td>

                {showDate && (
                  <td className="px-6 py-3 text-zinc-600 text-[10px] font-mono whitespace-nowrap">
                    {format(twTime, "M/d")}
                  </td>
                )}

                {/* 類別 */}
                <td className="px-4 py-3">
                  {isEditing ? (
                    <select
                      value={editForm!.category}
                      onChange={(ev) => setEditForm({ ...editForm!, category: ev.target.value })}
                      className="bg-zinc-900 border border-white/10 text-xs text-white rounded px-1 py-1 focus:outline-none focus:border-brand-500 w-full"
                    >
                      {["食", "衣", "住", "行", "育", "樂", "其他"].map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                      {icon} {e.category}
                    </span>
                  )}
                </td>

                {/* 說明 */}
                <td className="px-4 py-3">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm!.note}
                      onChange={(ev) => setEditForm({ ...editForm!, note: ev.target.value })}
                      className="bg-zinc-900 border border-white/10 text-xs text-white rounded px-2 py-1 w-full focus:outline-none focus:border-brand-500"
                    />
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-zinc-400 text-xs truncate max-w-[150px]">{e.note || "—"}</span>
                      {e.currency !== "TWD" && (
                        <span className="text-[9px] text-zinc-600">
                          ({e.amount_original} {e.currency})
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* 金額 */}
                <td className="px-4 py-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm!.amount_twd}
                      onChange={(ev) => setEditForm({ ...editForm!, amount_twd: Number(ev.target.value) })}
                      className="bg-zinc-900 border border-white/10 text-xs text-white rounded px-2 py-1 w-20 text-right focus:outline-none focus:border-brand-500"
                    />
                  ) : (
                    <span className="font-black font-mono text-white text-xs">{fmtMoney(e.amount_twd)}</span>
                  )}
                </td>

                {/* 記錄者 */}
                <td className="px-6 py-3">
                  <div className="flex flex-col">
                    <span className="text-zinc-500 text-[10px] font-bold truncate max-w-[80px]">
                      {displayName}
                    </span>
                    <span className="text-[9px] text-zinc-800 font-mono">{timeStr}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/[0.06] bg-white/[0.02]">
            <td colSpan={2} className="px-6 py-3 text-xs font-black text-zinc-500">合計</td>
            <td className="px-4 py-3 text-right font-black font-mono text-brand-400 text-sm">{fmtMoney(total)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
