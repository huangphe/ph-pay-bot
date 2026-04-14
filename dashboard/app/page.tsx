import { fetchTodayExpenses, groupByCategory, totalAmount, fmtMoney, getCatMeta, getDisplayName } from "@/lib/supabase";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import TodayPieChart from "@/components/TodayPieChart";
import ExpenseTable from "@/components/ExpenseTable";

export const revalidate = 60; // ISR: 每60秒重新抓取

export default async function HomePage() {
  const expenses = await fetchTodayExpenses();
  const total = totalAmount(expenses);
  const byCategory = groupByCategory(expenses);
  const today = format(new Date(), "yyyy年M月d日（EEEE）", { locale: zhTW });

  // 兩人各自合計
  const byUser: Record<string, number> = {};
  for (const e of expenses) {
    const displayName = getDisplayName(e);
    byUser[displayName] = (byUser[displayName] ?? 0) + e.amount_twd;
  }

  const catEntries = Object.entries(byCategory).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-1">Today's Summary</p>
        <h1 className="text-2xl font-black text-white">{today}</h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">今日總計</p>
          <p className="stat-value">{fmtMoney(total)}</p>
          <p className="text-xs text-zinc-600 mt-1">{expenses.length} 筆記錄</p>
        </div>
        {Object.entries(byUser).map(([displayName, amt]) => {
          return (
            <div key={displayName} className="glass-card p-5">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 truncate">
                {displayName}
              </p>
              <p className="stat-value">{fmtMoney(amt)}</p>
              <p className="text-xs text-zinc-600 mt-1">
                {total > 0 ? `佔比 ${(amt / total * 100).toFixed(0)}%` : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Category Breakdown + Pie Chart */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Bars */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">今日類別</h2>
            <div className="space-y-3">
              {catEntries.map(([cat, amt]) => {
                const { icon, color } = getCatMeta(cat);
                const pct = total > 0 ? (amt / total) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-zinc-300">{icon} {cat}</span>
                      <span className="text-sm font-black text-white font-mono">{fmtMoney(amt)}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-0.5 text-right">{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pie Chart */}
          <div className="glass-card p-6">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">分布圖</h2>
            <TodayPieChart data={catEntries.map(([cat, amt]) => ({
              name: cat,
              value: Math.round(amt),
              ...getCatMeta(cat),
            }))} />
          </div>
        </div>
      )}

      {/* Expense Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.04]">
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">今日明細</h2>
        </div>
        <ExpenseTable initialExpenses={expenses} />
      </div>
    </div>
  );
}

