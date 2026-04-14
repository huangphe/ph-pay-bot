import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 型別定義 ──────────────────────────────────────────────

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

// ── 類別圖示與顏色 ────────────────────────────────────────

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

// ── 名稱映射 ─────────────────────────────────────────────

export const USER_MAP: Record<string, string> = {
  "5725029188": "@HAO",
  // 若有其他人的 ID 可補在此處
};

export function getDisplayName(expense: { user_id: string | number; user_name: string }) {
  const mapped = USER_MAP[String(expense.user_id)];
  if (mapped) return mapped;
  
  // 模糊比對
  const lowerName = expense.user_name.toLowerCase();
  if (lowerName.includes("hao")) return "@HAO";
  if (lowerName.includes("wu")) return "@WU";
  
  return expense.user_name.startsWith("@") ? expense.user_name : `@${expense.user_name}`;
}

// ── 查詢函數 ─────────────────────────────────────────────

export async function fetchTodayExpenses(): Promise<Expense[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("created_at", `${today}T00:00:00+00:00`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMonthExpenses(
  year: number,
  month: number
): Promise<Expense[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+00:00`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00+00:00`;

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ── 計算函數 ─────────────────────────────────────────────

export function groupByCategory(expenses: Expense[]): Record<string, number> {
  return expenses.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount_twd;
      return acc;
    },
    {} as Record<string, number>
  );
}

export function groupByDay(expenses: Expense[]): { date: string; total: number }[] {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    const day = e.created_at.split("T")[0];
    map[day] = (map[day] ?? 0) + e.amount_twd;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));
}

export function totalAmount(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount_twd, 0);
}

export function fmtMoney(n: number): string {
  return `NT$${n.toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export async function updateExpense(
  id: number,
  updates: Partial<Pick<Expense, "amount_twd" | "category" | "note">>
) {
  const { data, error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", id)
    .select();
  if (error) throw error;
  return data?.[0];
}

