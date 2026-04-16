"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { RetirementGoal, upsertRetirementGoal } from "@/lib/supabase";
import { ProjectionResult } from "@/lib/projection";
import { fmtMoney, fmtWan, fmtPct } from "@/lib/utils";
import StatCard from "@/components/wealth/ui/StatCard";
import GlassCard from "@/components/wealth/ui/GlassCard";

interface Props {
  goal: RetirementGoal;
  result: ProjectionResult;
  onUpdated: () => void;
}

export default function RetirementGoalCard({ goal, result, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    current_age: String(goal.current_age),
    retirement_age: String(goal.retirement_age),
    target_amount: String(goal.target_amount),
    expected_return_rate: String((goal.expected_return_rate * 100).toFixed(1)),
    inflation_rate: String((goal.inflation_rate * 100).toFixed(1)),
    label: goal.label,
  });
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const retirementYear = currentYear + (goal.retirement_age - goal.current_age);
  const progress = Math.min(
    100,
    (result.projectedAtRetirement / goal.target_amount) * 100
  );

  async function save() {
    setSaving(true);
    try {
      await upsertRetirementGoal({
        id: goal.id,
        label: form.label,
        current_age: parseInt(form.current_age),
        retirement_age: parseInt(form.retirement_age),
        target_amount: parseFloat(form.target_amount),
        expected_return_rate: parseFloat(form.expected_return_rate) / 100,
        inflation_rate: parseFloat(form.inflation_rate) / 100,
        is_active: true,
      });
      onUpdated();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:border-brand-500 w-full";

  return (
    <GlassCard>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">{goal.label}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {goal.current_age}歲 → {goal.retirement_age}歲 · {retirementYear}年退休
          </p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
        >
          {editing ? <X size={15} /> : <Pencil size={15} />}
        </button>
      </div>

      {editing ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { key: "label", label: "計畫名稱", type: "text" },
            { key: "current_age", label: "現在年齡", type: "number" },
            { key: "retirement_age", label: "退休年齡", type: "number" },
            { key: "target_amount", label: "目標金額 (TWD)", type: "number" },
            { key: "expected_return_rate", label: "預期年報酬率 %", type: "number" },
            { key: "inflation_rate", label: "通膨率 %", type: "number" },
          ].map(({ key, label, type }) => (
            <div key={key} className={key === "label" ? "col-span-2" : ""}>
              <label className="block text-xs text-zinc-400 mb-1">{label}</label>
              <input
                className={inputCls}
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200">取消</button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg disabled:opacity-50"
            >
              <Check size={12} />
              {saving ? "儲存中…" : "儲存"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/[0.03] rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">退休時預測淨資產</p>
          <p className={`text-lg font-bold ${result.onTrack ? "text-emerald-400" : "text-red-400"}`}>
            {fmtWan(result.projectedAtRetirement)}
          </p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">目標</p>
          <p className="text-lg font-bold text-zinc-200">{fmtWan(goal.target_amount)}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">達標年份</p>
          <p className={`text-lg font-bold ${result.goalReachedYear ? "text-emerald-400" : "text-red-400"}`}>
            {result.goalReachedYear
              ? `${result.goalReachedYear} (${result.goalReachedAge}歲)`
              : "未達標"}
          </p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">{result.shortfall > 0 ? "缺口" : "超出"}</p>
          <p className={`text-lg font-bold ${result.shortfall > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {fmtWan(Math.abs(result.shortfall))}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>進度</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              result.onTrack ? "bg-emerald-500" : "bg-brand-500"
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <p className="text-xs text-zinc-600 mt-1.5">
          年報酬率 {fmtPct(goal.expected_return_rate)} · 通膨 {fmtPct(goal.inflation_rate)}
        </p>
      </div>
    </GlassCard>
  );
}
