"use client";

import { useState } from "react";
import Modal from "@/components/wealth/ui/Modal";
import { Asset, AssetType, Owner, insertAsset, updateAsset } from "@/lib/supabase";

interface Props {
  existing?: Asset;
  onClose: () => void;
  onSaved: () => void;
}

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "stock", label: "股票" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "加密貨幣" },
  { value: "real_estate", label: "不動產" },
  { value: "cash", label: "現金/存款" },
  { value: "other", label: "其他" },
];

const OWNERS: { value: Owner; label: string }[] = [
  { value: "HAO", label: "HAO" },
  { value: "WU", label: "WU" },
  { value: "shared", label: "共同" },
];

export default function AssetForm({ existing, onClose, onSaved }: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [assetType, setAssetType] = useState<AssetType>(existing?.asset_type ?? "stock");
  const [currentValue, setCurrentValue] = useState(String(existing?.current_value ?? ""));
  const [purchaseCost, setPurchaseCost] = useState(String(existing?.purchase_cost ?? ""));
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? ""));
  const [currency, setCurrency] = useState(existing?.currency ?? "TWD");
  const [exchangeRate, setExchangeRate] = useState(String(existing?.exchange_rate ?? "1"));
  const [ticker, setTicker] = useState(existing?.ticker ?? "");
  const [owner, setOwner] = useState<Owner>(existing?.owner ?? "shared");
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cv = parseFloat(currentValue);
    const pc = parseFloat(purchaseCost) || 0;
    if (!name.trim() || isNaN(cv) || cv < 0) {
      setError("請填寫名稱與有效的現值");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        asset_type: assetType,
        current_value: cv,
        purchase_cost: pc,
        quantity: quantity ? parseFloat(quantity) : null,
        currency,
        exchange_rate: parseFloat(exchangeRate) || 1,
        ticker: ticker.trim() || null,
        owner,
        note: note.trim(),
      };
      if (existing) {
        await updateAsset(existing.id, payload);
      } else {
        await insertAsset(payload);
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
    <Modal title={existing ? "編輯資產" : "新增資產"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">名稱</label>
            <input className={inputCls} placeholder="例：00878 ETF" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">類型</label>
            <select className={selectCls} value={assetType} onChange={e => setAssetType(e.target.value as AssetType)}>
              {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">代碼 (選填)</label>
            <input className={inputCls} placeholder="例：0878" value={ticker} onChange={e => setTicker(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">現值 (TWD)</label>
            <input className={inputCls} type="number" placeholder="100000" value={currentValue} onChange={e => setCurrentValue(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">成本 (TWD)</label>
            <input className={inputCls} type="number" placeholder="90000" value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">數量 (選填)</label>
            <input className={inputCls} type="number" placeholder="1000" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">負責人</label>
            <select className={selectCls} value={owner} onChange={e => setOwner(e.target.value as Owner)}>
              {OWNERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">幣別</label>
            <input className={inputCls} placeholder="TWD" value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">匯率</label>
            <input className={inputCls} type="number" step="0.0001" placeholder="1" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
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
