"use client";

import { useState } from "react";
import Modal from "@/components/wealth/ui/Modal";
import {
  IncomeSource,
  IncomeFrequency,
  IncomeCategory,
  Owner,
  insertIncomeSource,
  updateIncomeSource,
} from "@/lib/supabase";

interface Props {
  existing?: IncomeSource;
  onClose: () => void;
  onSaved: () => void;
}

const FREQUENCIES: { value: IncomeFrequency; label: string }[] = [
  { value: "monthly", label: "每月" },
  { value: "quarterly", label: "每季" },
  { value: "annual", label: "每年" },
];

const CATEGORIES: { value: IncomeCategory; label: string }[] = [
  { value: "salary", label: "薪資" },
  { value: "bonus", label: "獎金" },
  { value: "rental", label: "租金收入" },
  { value: "side", label: "副業" },
  { value: "other", label: "其他" },
];

const OWNERS: { value: Owner; label: string }[] = [
  { value: "HAO", label: "HAO" },
  { value: "WU", label: "WU" },
  { value: "shared", label: "共同" },
];

export default function IncomeForm({ existing, onClose, onSaved }: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [amount, setAmount] = useState(String(existing?.amount ?? ""));
  const [frequency, setFrequency] = useState<IncomeFrequency>(existing?.frequency ?? "monthly");
  const [category, setCategory] = useState<IncomeCategory>(existing?.category ?? "salary");
  const [owner, setOwner] = useState<Owner>(existing?.owner ?? "shared");
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt) || amt <= 0) {
      setError("請填寫名稱與有效金額");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim(), amount: amt, frequency, category, owner, note: note.trim(), is_active: true };
      if (existing) {
        await updateIncomeSource(existing.id, payload);
      } else {
        await insertIncomeSource(payload);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-brand-500";
  const selectCls = `${inputCls} cursor-pointer`;

  return (
    <Modal title={existing ? "編輯收入" : "新增收入"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">名稱</label>
          <input className={inputCls} placeholder="例：HAO薪水" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">金額 (TWD)</label>
            <input className={inputCls} type="number" placeholder="60000" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">頻率</label>
            <select className={selectCls} value={frequency} onChange={e => setFrequency(e.target.value as IncomeFrequency)}>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">類別</label>
            <select className={selectCls} value={category} onChange={e => setCategory(e.target.value as IncomeCategory)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">負責人</label>
            <select className={selectCls} value={owner} onChange={e => setOwner(e.target.value as Owner)}>
              {OWNERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">備註</label>
          <input className={inputCls} placeholder="選填" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">取消</button>
          <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg disabled:opacity-50 transition-colors">
            {saving ? "儲存中…" : "儲存"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
