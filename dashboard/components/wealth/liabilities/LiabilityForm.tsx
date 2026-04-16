"use client";

import { useState } from "react";
import Modal from "@/components/wealth/ui/Modal";
import { Liability, LiabilityType, Owner, insertLiability, updateLiability } from "@/lib/supabase";

interface Props {
  existing?: Liability;
  onClose: () => void;
  onSaved: () => void;
}

const LIABILITY_TYPES: { value: LiabilityType; label: string }[] = [
  { value: "mortgage", label: "房貸" },
  { value: "car_loan", label: "車貸" },
  { value: "insurance", label: "保險" },
  { value: "rent", label: "租金" },
  { value: "subscription", label: "訂閱費用" },
  { value: "other", label: "其他" },
];

const OWNERS: { value: Owner; label: string }[] = [
  { value: "HAO", label: "HAO" },
  { value: "WU", label: "WU" },
  { value: "shared", label: "共同" },
];

export default function LiabilityForm({ existing, onClose, onSaved }: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [liabilityType, setLiabilityType] = useState<LiabilityType>(existing?.liability_type ?? "mortgage");
  const [monthlyPayment, setMonthlyPayment] = useState(String(existing?.monthly_payment ?? ""));
  const [totalRemaining, setTotalRemaining] = useState(String(existing?.total_remaining ?? ""));
  const [interestRate, setInterestRate] = useState(String(existing?.interest_rate ?? ""));
  const [dueDate, setDueDate] = useState(existing?.due_date ?? "");
  const [owner, setOwner] = useState<Owner>(existing?.owner ?? "shared");
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mp = parseFloat(monthlyPayment);
    if (!name.trim() || isNaN(mp) || mp <= 0) {
      setError("請填寫名稱與每月金額");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        liability_type: liabilityType,
        monthly_payment: mp,
        total_remaining: totalRemaining ? parseFloat(totalRemaining) : null,
        interest_rate: interestRate ? parseFloat(interestRate) : null,
        due_date: dueDate || null,
        owner,
        is_active: true,
        note: note.trim(),
      };
      if (existing) {
        await updateLiability(existing.id, payload);
      } else {
        await insertLiability(payload);
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
    <Modal title={existing ? "編輯負債" : "新增固定負債"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">名稱</label>
            <input className={inputCls} placeholder="例：房貸" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">類型</label>
            <select className={selectCls} value={liabilityType} onChange={e => setLiabilityType(e.target.value as LiabilityType)}>
              {LIABILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">負責人</label>
            <select className={selectCls} value={owner} onChange={e => setOwner(e.target.value as Owner)}>
              {OWNERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">每月金額 (TWD)</label>
            <input className={inputCls} type="number" placeholder="15000" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">總剩餘金額 (選填)</label>
            <input className={inputCls} type="number" placeholder="3000000" value={totalRemaining} onChange={e => setTotalRemaining(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">年利率 % (選填)</label>
            <input className={inputCls} type="number" step="0.01" placeholder="2.06" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">到期日 (選填)</label>
            <input className={inputCls} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
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
