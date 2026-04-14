import { fetchMonthExpenses, groupByCategory, groupByDay, totalAmount, fmtMoney, getCatMeta, Expense, getDisplayName } from "@/lib/supabase";
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
    const year = parseInt(searchParams.year ?? String(now.getFullYear()));
    const month = parseInt(searchParams.month ?? String(now.getMonth() + 1));

  const expenses = await fetchMonthExpenses(year, month);
    const total = totalAmount(expenses);
    const byCategory = groupByCategory(expenses);
    const byDay = groupByDay(expenses);

  const monthLabel = format(new Date(year, month - 1, 1), "yy-MM");
  
    const catEntries = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
    const pieData = catEntries.map(([cat, amt]) => ({
          name: cat, value: Math.round(amt), ...getCatMeta(cat),
    }));
  
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const barData = Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const found = byDay.find(x => x.date === key);
          return { day: d, total: found?.total ?? 0 };
    });
  
    return (
          <div className="space-y-6">
                <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                          {monthLabel} Overview
                        </h1>h1>
                </div>div>
          
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border">
                                  <h2 className="text-lg font-semibold mb-4">Categories</h2>h2>
                                  <div className="h-[300px]"><MonthlyPieChart data={pieData} /></div>div>
                        </div>div>
                        <div className="bg-white p-6 rounded-xl border">
                                  <h2 className="text-lg font-semibold mb-4">Daily Trend</h2>h2>
                                  <div className="h-[300px]"><MonthlyBarChart data={barData} /></div>div>
                        </div>div>
                </div>div>
          
                <div className="bg-white p-6 rounded-xl border">
                        <div className="flex items-center justify-between mb-6">
                                  <h2 className="text-lg font-semibold">Details</h2>h2>
                                  <div className="text-right">
                                              <span className="text-sm text-gray-500">Total</span>span>
                                              <div className="text-2xl font-bold">{fmtMoney(total)}</div>div>
                                  </div>div>
                        </div>div>
                        <ExpenseTable expenses={expenses} />
                </div>div>
          </div>div>
        );
}</div>yy
