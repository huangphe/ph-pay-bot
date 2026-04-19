import { createClient } from "@supabase/supabase-js";
import { pastMonthsStart, currentMonthStart, diffInMonths } from "./utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "dummy";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Supabase returns PostgrestError (plain object), not Error instances.
// This helper ensures catch blocks always get a real Error with a readable message.
function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  const pg = e as { message?: string; code?: string; details?: string };
  const msg = pg?.message ?? JSON.stringify(e);
  // Surface a hint for the most common setup issue
  if (pg?.code === "PGRST205") {
    return new Error(`資料表不存在 (${msg})。請先在 Supabase SQL Editor 執行 database/schema.sql`);
  }
  return new Error(msg);
}

// ══════════════════════════════════════════════════════════
// TypeScript Interfaces
// ══════════════════════════════════════════════════════════

// --- Couple Finance (Expenses) ---
export interface Expense {
  id: number;
  user_id: string;
  user_name: string;
  amount_twd: number;
  amount_original: number;
  currency: string;
  exchange_rate: number;
  category: string;
  note: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
}

// --- Wealth Manager ---
export type IncomeFrequency = "monthly" | "annual" | "quarterly";
export type IncomeCategory = "salary" | "bonus" | "rental" | "side" | "other";
export type Owner = "HAO" | "WU" | "shared";
export type AssetType =
  | "stock"
  | "etf"
  | "crypto"
  | "real_estate"
  | "cash"
  | "other";
export type LiabilityType =
  | "mortgage"
  | "car_loan"
  | "insurance"
  | "rent"
  | "subscription"
  | "other";

export interface IncomeSource {
  id: number;
  name: string;
  amount: number;
  frequency: IncomeFrequency;
  category: IncomeCategory;
  owner: Owner;
  is_active: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: number;
  name: string;
  asset_type: AssetType;
  current_value: number;
  purchase_cost: number;
  quantity: number | null;
  currency: string;
  exchange_rate: number;
  ticker: string | null;
  owner: Owner;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Liability {
  id: number;
  name: string;
  liability_type: LiabilityType;
  monthly_payment: number;
  total_remaining: number | null;
  interest_rate: number | null;
  due_date: string | null;
  owner: Owner;
  is_active: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  id: number;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  monthly_income: number | null;
  monthly_expenses: number | null;
  monthly_savings: number | null;
  created_at: string;
}

export interface RetirementGoal {
  id: number;
  label: string;
  current_age: number;
  retirement_age: number;
  target_amount: number;
  expected_return_rate: number;
  inflation_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ══════════════════════════════════════════════════════════
// Display metadata & Mapping
// ══════════════════════════════════════════════════════════

// --- Expenses Metadata ---
export const CAT_META: Record<string, { icon: string; color: string }> = {
  食: { icon: "🍜", color: "#F97316" },
  衣: { icon: "👗", color: "#EC4899" },
  住: { icon: "🏠", color: "#6366F1" },
  行: { icon: "🚗", color: "#3B82F6" },
  育: { icon: "📚", color: "#10B981" },
  樂: { icon: "🎮", color: "#8B5CF6" },
  其他: { icon: "💰", color: "#6B7280" },
};

export function getCatMeta(cat: string) {
  return CAT_META[cat] ?? { icon: "💰", color: "#6B7280" };
}

export const USER_MAP: Record<string, string> = {
  "5725029188": "@HAO",
  "8514343851": "@WU",
};

export function getDisplayName(expense: { user_id: string | number; user_name: string }) {
  const mapped = USER_MAP[String(expense.user_id)];
  if (mapped) return mapped;
  const lowerName = expense.user_name.toLowerCase();
  if (lowerName.includes("hao")) return "@HAO";
  if (lowerName.includes("wu")) return "@WU";
  return expense.user_name.startsWith("@") ? expense.user_name : `@${expense.user_name}`;
}

// --- Wealth Metadata ---
export const ASSET_TYPE_META: Record<AssetType, { label: string; icon: string; color: string }> = {
  stock: { label: "股票", icon: "📈", color: "#6366f1" },
  etf: { label: "ETF", icon: "🗂️", color: "#8b5cf6" },
  crypto: { label: "加密貨幣", icon: "₿", color: "#f59e0b" },
  real_estate: { label: "不動產", icon: "🏠", color: "#10b981" },
  cash: { label: "現金/存款", icon: "💵", color: "#3b82f6" },
  other: { label: "其他", icon: "💼", color: "#6b7280" },
};

export const LIABILITY_TYPE_META: Record<LiabilityType, { label: string; icon: string }> = {
  mortgage: { label: "房貸", icon: "🏦" },
  car_loan: { label: "車貸", icon: "🚗" },
  insurance: { label: "保險", icon: "🛡️" },
  rent: { label: "租金", icon: "🔑" },
  subscription: { label: "訂閱", icon: "📱" },
  other: { label: "其他", icon: "📋" },
};

export const INCOME_CATEGORY_META: Record<IncomeCategory, { label: string; icon: string }> = {
  salary: { label: "薪資", icon: "💼" },
  bonus: { label: "獎金", icon: "🎁" },
  rental: { label: "租金收入", icon: "🏠" },
  side: { label: "副業", icon: "⚡" },
  other: { label: "其他", icon: "💰" },
};

export const OWNER_LABELS: Record<Owner, string> = {
  HAO: "HAO",
  WU: "WU",
  shared: "共同",
};

// ══════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════

export function normalizeToMonthly(source: IncomeSource): number {
  if (source.frequency === "annual") return source.amount / 12;
  if (source.frequency === "quarterly") return source.amount / 4;
  return source.amount;
}

export function totalMonthlyIncome(sources: IncomeSource[]): number {
  return sources.reduce((sum, s) => sum + normalizeToMonthly(s), 0);
}

export function totalAssetValue(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + a.current_value, 0);
}

export function totalPurchaseCost(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + a.purchase_cost, 0);
}

export function groupAssetsByType(assets: Asset[]): Record<AssetType, number> {
  const result = {} as Record<AssetType, number>;
  for (const a of assets) {
    result[a.asset_type] = (result[a.asset_type] ?? 0) + a.current_value;
  }
  return result;
}

export function totalMonthlyLiabilities(liabilities: Liability[]): number {
  return liabilities.reduce((sum, l) => sum + (l.is_active ? l.monthly_payment : 0), 0);
}

/**
 * 計算負債項目的剩餘總額
 * 如果 total_remaining 存在則直接使用，否則根據每月還款與到期日進行估算
 */
export const APP_VERSION = "v1.2.0-final-forced";

export function getLiabilityBalance(l: Liability): number {
  try {
    const remaining = l.total_remaining;
    if (remaining !== null && remaining !== undefined && String(remaining).trim() !== "" && Number(remaining) > 0) {
      return Number(remaining);
    }
    
    const payment = Number(l.monthly_payment || 0);
    if (l.due_date && payment > 0) {
      const months = diffInMonths(new Date(), l.due_date);
      // 如果月份 <= 0 說明已過期，回傳 0
      const est = Math.max(0, months * payment);
      console.log(`[Calc] ${l.name}: payment=${payment}, months=${months}, est=${est}`);
      return est;
    }
  } catch (err) {
    console.error("getLiabilityBalance error:", err);
  }
  return 0;
}

export function totalLiabilitiesRemaining(liabilities: Liability[]): number {
  if (!liabilities || liabilities.length === 0) return 0;
  return liabilities.reduce((sum, l) => sum + (l.is_active !== false ? getLiabilityBalance(l) : 0), 0);
}

export function fmtMoney(n: number): string {
  return `NT$${n.toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ══════════════════════════════════════════════════════════
// Query: Expenses (Couple Finance)
// ══════════════════════════════════════════════════════════

export async function fetchTodayExpenses(): Promise<Expense[]> {
  const tw = getTWDate();
  const yr = tw.getUTCFullYear();
  const mo = String(tw.getUTCMonth() + 1).padStart(2, "0");
  const da = String(tw.getUTCDate()).padStart(2, "0");
  const twDateStr = `${yr}-${mo}-${da}`;

  const startUTC = new Date(`${twDateStr}T00:00:00+08:00`).toISOString();
  const endUTC   = new Date(new Date(startUTC).getTime() + 24 * 3600_000).toISOString();

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("created_at", startUTC)
    .lt("created_at", endUTC)
    .order("created_at", { ascending: true });
  if (error) throw toError(error);
  return data ?? [];
}

export function totalAmount(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount_twd, 0);
}

export function groupByCategory(expenses: Expense[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of expenses) {
    result[e.category] = (result[e.category] ?? 0) + e.amount_twd;
  }
  return result;
}

export function groupByDay(expenses: Expense[]): Array<{ date: string; total: number }> {
  const grouped: Record<string, number> = {};
  for (const e of expenses) {
    const d = e.created_at.split("T")[0];
    grouped[d] = (grouped[d] ?? 0) + e.amount_twd;
  }
  return Object.entries(grouped).map(([date, total]) => ({ date, total }));
}

export async function fetchMonthExpenses(year: number, month: number): Promise<Expense[]> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear  = month === 12 ? year + 1 : year;
  const startUTC = new Date(`${year}-${pad(month)}-01T00:00:00+08:00`).toISOString();
  const endUTC   = new Date(`${endYear}-${pad(endMonth)}-01T00:00:00+08:00`).toISOString();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("created_at", startUTC)
    .lt("created_at", endUTC)
    .order("created_at", { ascending: true });
  if (error) throw toError(error);
  return data ?? [];
}

export async function updateExpense(id: number, updates: Partial<Pick<Expense, "amount_twd" | "category" | "note">>) {
  const { data, error } = await supabase.from("expenses").update(updates).eq("id", id).select();
  if (error) throw toError(error);
  return data?.[0];
}

export async function deleteExpense(id: number) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw toError(error);
  return true;
}

// ══════════════════════════════════════════════════════════
// Query: Wealth Manager
// ══════════════════════════════════════════════════════════

export async function fetchActiveIncomeSources(): Promise<IncomeSource[]> {
  const { data, error } = await supabase
    .from("income_sources")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("name");
  if (error) throw toError(error);
  return data ?? [];
}

export async function insertIncomeSource(payload: Omit<IncomeSource, "id" | "created_at" | "updated_at">): Promise<IncomeSource> {
  const { data, error } = await supabase.from("income_sources").insert(payload).select().single();
  if (error) throw toError(error);
  return data;
}

export async function updateIncomeSource(id: number, payload: Partial<Omit<IncomeSource, "id" | "created_at" | "updated_at">>): Promise<IncomeSource> {
  const { data, error } = await supabase.from("income_sources").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw toError(error);
  return data;
}

export async function deleteIncomeSource(id: number): Promise<void> {
  const { error } = await supabase.from("income_sources").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw toError(error);
}

export async function fetchAssets(): Promise<Asset[]> {
  const { data, error } = await supabase.from("assets").select("*").order("asset_type").order("current_value", { ascending: false });
  if (error) throw toError(error);
  return data ?? [];
}

export async function insertAsset(payload: Omit<Asset, "id" | "created_at" | "updated_at">): Promise<Asset> {
  const { data, error } = await supabase.from("assets").insert(payload).select().single();
  if (error) throw toError(error);
  return data;
}

export async function updateAsset(id: number, payload: Partial<Omit<Asset, "id" | "created_at" | "updated_at">>): Promise<Asset> {
  const { data, error } = await supabase.from("assets").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw toError(error);
  return data;
}

export async function deleteAsset(id: number): Promise<void> {
  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) throw toError(error);
}

export async function fetchActiveLiabilities(): Promise<Liability[]> {
  const { data, error } = await supabase.from("liabilities").select("*").eq("is_active", true).order("liability_type").order("monthly_payment", { ascending: false });
  if (error) throw toError(error);
  return data ?? [];
}

export async function insertLiability(payload: Omit<Liability, "id" | "created_at" | "updated_at">): Promise<Liability> {
  const { data, error } = await supabase.from("liabilities").insert(payload).select().single();
  if (error) throw toError(error);
  return data;
}

export async function updateLiability(id: number, payload: Partial<Omit<Liability, "id" | "created_at" | "updated_at">>): Promise<Liability> {
  const { data, error } = await supabase.from("liabilities").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw toError(error);
  return data;
}

export async function deleteLiability(id: number): Promise<void> {
  const { error } = await supabase.from("liabilities").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw toError(error);
}

export async function fetchNetWorthSnapshots(months = 24): Promise<NetWorthSnapshot[]> {
  const { data, error } = await supabase.from("net_worth_snapshots").select("*").order("snapshot_date", { ascending: true }).limit(months);
  if (error) throw toError(error);
  return data ?? [];
}

export async function upsertNetWorthSnapshot(payload: Omit<NetWorthSnapshot, "id" | "created_at">): Promise<NetWorthSnapshot> {
  const { data, error } = await supabase.from("net_worth_snapshots").upsert(payload, { onConflict: "snapshot_date" }).select().single();
  if (error) throw toError(error);
  return data;
}

export async function fetchActiveRetirementGoal(): Promise<RetirementGoal | null> {
  const { data, error } = await supabase.from("retirement_goals").select("*").eq("is_active", true).limit(1).maybeSingle();
  if (error) throw toError(error);
  return data;
}

export async function upsertRetirementGoal(payload: Omit<RetirementGoal, "id" | "created_at" | "updated_at"> & { id?: number }): Promise<RetirementGoal> {
  if (payload.id) {
    const { data, error } = await supabase.from("retirement_goals").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", payload.id).select().single();
    if (error) throw toError(error);
    return data;
  }
  const { data, error } = await supabase.from("retirement_goals").insert(payload).select().single();
  if (error) throw toError(error);
  return data;
}

export async function fetchAvgMonthlyExpenses(lookbackMonths = 3): Promise<number> {
  const start = pastMonthsStart(lookbackMonths);
  const end = currentMonthStart();
  const startUTC = new Date(`${start}T00:00:00+08:00`).toISOString();
  const endUTC   = new Date(`${end}T00:00:00+08:00`).toISOString();
  const { data, error } = await supabase.from("expenses").select("amount_twd").gte("created_at", startUTC).lt("created_at", endUTC);
  if (error) throw toError(error);
  if (data && data.length > 0) {
    const total = data.reduce((sum: number, e: { amount_twd: number }) => sum + e.amount_twd, 0);
    return total / lookbackMonths;
  }
  // No complete historical months — fall back to current month total
  const { year: yr, month: mo } = currentYearMonth();
  const curStartUTC = new Date(`${yr}-${String(mo).padStart(2, "0")}-01T00:00:00+08:00`).toISOString();
  const { data: cur, error: curErr } = await supabase.from("expenses").select("amount_twd").gte("created_at", curStartUTC);
  if (curErr) throw toError(curErr);
  if (!cur || cur.length === 0) return 0;
  return cur.reduce((sum: number, e: { amount_twd: number }) => sum + e.amount_twd, 0);
}
