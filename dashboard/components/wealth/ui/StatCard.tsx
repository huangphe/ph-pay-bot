import GlassCard from "./GlassCard";

interface Props {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "green" | "red" | "amber";
}

const colorMap = {
  default: "stat-value",
  green: "text-emerald-400 text-2xl md:text-3xl font-extrabold tracking-tight",
  red: "text-red-400 text-2xl md:text-3xl font-extrabold tracking-tight",
  amber: "text-amber-400 text-2xl md:text-3xl font-extrabold tracking-tight",
};

export default function StatCard({ label, value, sub, color = "default" }: Props) {
  return (
    <GlassCard>
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={colorMap[color]}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </GlassCard>
  );
}
