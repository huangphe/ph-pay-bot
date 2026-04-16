"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { NetWorthSnapshot } from "@/lib/supabase";
import { fmtMoney, fmtWan } from "@/lib/utils";

interface Props {
  snapshots: NetWorthSnapshot[];
}

export default function MiniNetWorthChart({ snapshots }: Props) {
  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
        尚無快照資料 — 前往現金流頁面儲存本月快照
      </div>
    );
  }

  const data = snapshots.map((s) => ({
    date: s.snapshot_date.slice(0, 7), // YYYY-MM
    netWorth: s.net_worth,
  }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtWan} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          formatter={(v: number) => [fmtMoney(v), "淨資產"]}
          contentStyle={{
            background: "rgba(15,15,25,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            color: "#e4e4e7",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="netWorth"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#nwGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
