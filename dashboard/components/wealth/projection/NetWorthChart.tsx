"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ProjectionPoint } from "@/lib/projection";
import { fmtMoney, fmtWan } from "@/lib/utils";

interface Props {
  points: ProjectionPoint[];
  retirementYear: number;
  targetAmount: number;
}

export default function NetWorthChart({ points, retirementYear, targetAmount }: Props) {
  // Split into historical and projected datasets for different styling
  const chartData = points.map((p) => ({
    year: p.year,
    age: p.age,
    historical: !p.projected ? p.netWorth : undefined,
    projected: p.projected ? p.netWorth : undefined,
    // For tooltip we want both
    netWorth: p.netWorth,
    isProjected: p.projected,
  }));

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { age: number; netWorth: number; isProjected: boolean } }>;
    label?: number;
  }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-zinc-900/95 border border-white/10 rounded-lg p-3 text-sm">
        <p className="text-zinc-400 mb-1">
          {label}年 · {d.age}歲 {d.isProjected ? <span className="text-brand-400">(預測)</span> : ""}
        </p>
        <p className="text-zinc-100 font-bold">{fmtMoney(d.netWorth)}</p>
        <p className="text-zinc-500 text-xs">{fmtWan(d.netWorth)}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="historicalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="year"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtWan}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Historical area */}
        <Area
          type="monotone"
          dataKey="historical"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#historicalGrad)"
          connectNulls={false}
          name="實際淨資產"
          dot={false}
        />

        {/* Projected line (dashed) */}
        <Line
          type="monotone"
          dataKey="projected"
          stroke="#8b5cf6"
          strokeWidth={2}
          strokeDasharray="6 3"
          connectNulls={false}
          name="預測淨資產"
          dot={false}
        />

        {/* Retirement year reference */}
        <ReferenceLine
          x={retirementYear}
          stroke="#f59e0b"
          strokeDasharray="4 2"
          label={{ value: "退休", fill: "#f59e0b", fontSize: 11, position: "top" }}
        />

        {/* Target amount reference */}
        <ReferenceLine
          y={targetAmount}
          stroke="#34d399"
          strokeDasharray="4 2"
          label={{ value: `目標 ${fmtWan(targetAmount)}`, fill: "#34d399", fontSize: 11, position: "right" }}
        />

        <Legend
          formatter={(value) => (
            <span style={{ color: "#a1a1aa", fontSize: 12 }}>{value}</span>
          )}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
