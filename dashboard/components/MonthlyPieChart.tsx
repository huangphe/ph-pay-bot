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

export default function MonthlyPieChart({ data }: { data: DataItem[] }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={105}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
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
          iconType="circle"
          formatter={(value, entry: any) => (
            <span style={{ color: "#d1d1d6", fontSize: "11px", fontWeight: 600 }}>
              {entry.payload.icon} {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
