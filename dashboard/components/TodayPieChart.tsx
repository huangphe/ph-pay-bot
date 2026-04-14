"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface DataItem {
  name: string;
  value: number;
  icon: string;
  color: string;
}

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, icon, value }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.65;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const displayVal = value >= 1000 ? `${(value/1000).toFixed(1).replace('.0', '')}k` : value;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {icon} {displayVal}
    </text>
  );
};

export default function TodayPieChart({ data }: { data: DataItem[] }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {data.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={entry.color} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [`NT$${v.toLocaleString()}`, ""]}
          contentStyle={{
            background: "rgba(10,10,20,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.5rem",
            color: "#e4e4e7",
            fontSize: "12px",
            fontWeight: 700,
          }}
          itemStyle={{ color: "#e4e4e7" }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: "#d1d1d6", fontSize: "11px", fontWeight: 600 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
