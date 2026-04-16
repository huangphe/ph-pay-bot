"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AssetType, ASSET_TYPE_META } from "@/lib/supabase";
import { fmtMoney, fmtWan } from "@/lib/utils";

interface Props {
  byType: Record<string, number>;
}

export default function AllocationPie({ byType }: Props) {
  const data = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => {
      const meta = ASSET_TYPE_META[type as AssetType];
      return { name: meta.label, value, color: meta.color };
    })
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
          label={({ name, percent }) =>
            percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
          }
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [fmtMoney(value), "現值"]}
          contentStyle={{
            background: "rgba(15,15,25,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            color: "#e4e4e7",
          }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: "#a1a1aa", fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
