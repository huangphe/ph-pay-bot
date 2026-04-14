"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface DayData {
  day: number;
  total: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "rgba(10,10,20,0.95)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "0.5rem",
        padding: "0.5rem 0.75rem",
        fontSize: "12px",
        fontWeight: 700,
        color: "#e4e4e7",
      }}>
        <p style={{ color: "#6b7280", fontSize: "10px", marginBottom: "2px" }}>{label}日</p>
        <p style={{ color: "#a5b4fc" }}>NT${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function MonthlyBarChart({ data }: { data: DayData[] }) {
  const maxVal = Math.max(...data.map(d => d.total), 1);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={8}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fill: "#a1a1aa", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v === 0 ? "" : `${(v/1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
        <Bar dataKey="total" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.total === 0
                ? "rgba(255,255,255,0.04)"
                : entry.total >= maxVal * 0.8
                  ? "#f97316"
                  : "#6366f1"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
