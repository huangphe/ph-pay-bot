  fetchMonthExpenses, groupByCategory, groupByDay,
  totalAmount, fmtMoney, getCatMeta, Expense, getDisplayName
} from "@/lib/supabase";
import { format, getDaysInMonth } from "date-fns";
import { zhTW } from "date-fns/locale";
import MonthlyBarChart from "@/components/MonthlyBarChart";
import MonthlyPieChart from "@/components/MonthlyPieChart";
import ExpenseTable from "@/components/ExpenseTable";

export const revalidate = 300;

interface Props {
  searchParams: { year?: string; month?: string };
}

export default async function MonthlyPage({ searchParams }: Props) {
  const now = new Date();
  const year  = parseInt(searchParams.year  ?? String(now.getFullYear()));
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1));

  const expenses = await fetchMonthExpenses(year, month);
  const total = totalAmount(expenses);
  const byCategory = groupByCategory(expenses);
  const byDay = groupByDay(expenses);

  const monthLabel = format(new Date(year, month - 1, 1), "yyyy年M月", { locale: zhTW });

  const catEntries = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
  const pieData = catEntries.map(([cat, amt]) => ({
    name: cat, value: Math.round(amt), ...getCatMeta(cat),
  }));

  // 填充整月每天（無數據的天給 0）
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const barData = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const key = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const found = byDay.find(x => x.date === key);
    return { day: d, total: found?.total ?? 0 };
  });

  // 各人合計
  const byUser: Record<string, number> = {};
  for (const e of expenses) {
    byUser[e.user_name] = (byUser[e.user_name] ?? 0) + e.amount_twd;
  }

  // 月份導航連結
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear  = month === 12 ? year + 1 : year;
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="space-y-8">
      {/* Header + Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">Monthly Report</p>
          <h1 className="text-2xl font-black text-white">{monthLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/monthly?year=${prevYear}&month=${prevMonth}`}
            className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-sm font-bold"
          >
            ‹
          </a>
          {!isCurrentMonth && (
            <a
              href="/monthly"
              className="px-3 h-8 rounded-lg glass-card flex items-center text-[10px] font-black text-brand-400 uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              本月
            </a>
          )}
          <a
            href={`/monthly?year=${nextYear}&month=${nextMonth}`}
            className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-sm font-bold"
          >
            ›
          </a>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 col-span-2 sm:col-span-1">
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">月總計</p>
          <p className="stat-value">{fmtMoney(total)}</p>
          <p className="text-[10px] text-zinc-600 mt-1">{expenses.length} 筆</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">日均支出</p>
          <p className="stat-value text-2xl">{fmtMoney(total / daysInMonth)}</p>
        </div>
        {Object.entries(byUser).map(([name, amt]) => {
          const displayName = getDisplayName({ user_id: "", user_name: name });
          return (
            <div key={name} className="glass-card p-5">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 truncate">
                {displayName}
              </p>
              <p className="stat-value text-2xl">{fmtMoney(amt)}</p>
              <p className="text-[10px] text-zinc-600 mt-1">{total > 0 ? `${(amt/total*100).toFixed(0)}%` : "—"}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {expenses.length > 0 ? (
        <>
          {/* Bar Chart */}
          <div className="glass-card p-6">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">每日支出趨勢</h2>
            <MonthlyBarChart data={barData} />
          </div>

          {/* Pie Chart + Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">類別分布</h2>
              <MonthlyPieChart data={pieData} />
            </div>

            <div className="glass-card p-6">
              <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">類別排名</h2>
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
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-0.5 text-right">{pct.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Monthly detail table */}
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">本月明細</h2>
            </div>
            <ExpenseTable initialExpenses={expenses} showDate />
          </div>
        </>
      ) : (
        <div className="glass-card py-32 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-xs font-bold text-zinc-700 uppercase tracking-widest">本月尚無記帳記錄</p>
        </div>
      )}
    </div>
  );
}
