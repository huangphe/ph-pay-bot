import { Asset, Liability, ASSET_TYPE_META, LIABILITY_TYPE_META, getLiabilityBalance } from "@/lib/supabase";
import { fmtMoney } from "@/lib/utils";

interface Props {
  assets: Asset[];
  liabilities: Liability[];
}

export default function BalanceSheetSummary({ assets, liabilities }: Props) {
  const totalAssets = assets.reduce((s, a) => s + a.current_value, 0);
  const totalLiabilitiesRemaining = liabilities.reduce((s, l) => s + getLiabilityBalance(l), 0);
  const netWorth = totalAssets - totalLiabilitiesRemaining;

  // Group assets by type
  const assetGroups: Record<string, { label: string; icon: string; total: number }> = {};
  for (const a of assets) {
    const meta = ASSET_TYPE_META[a.asset_type];
    if (!assetGroups[a.asset_type]) {
      assetGroups[a.asset_type] = { label: meta.label, icon: meta.icon, total: 0 };
    }
    assetGroups[a.asset_type].total += a.current_value;
  }

  // Group liabilities by type
  const liabGroups: Record<string, { label: string; icon: string; total: number }> = {};
  for (const l of liabilities) {
    const meta = LIABILITY_TYPE_META[l.liability_type];
    if (!liabGroups[l.liability_type]) {
      liabGroups[l.liability_type] = { label: meta.label, icon: meta.icon, total: 0 };
    }
    liabGroups[l.liability_type].total += getLiabilityBalance(l);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Assets column */}
      <div>
        <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">資產</h3>
        <div className="space-y-2">
          {Object.entries(assetGroups).map(([type, g]) => (
            <div key={type} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-300">
                <span>{g.icon}</span>
                {g.label}
              </span>
              <span className="text-zinc-200">{fmtMoney(g.total)}</span>
            </div>
          ))}
          {assets.length === 0 && (
            <p className="text-xs text-zinc-600">尚無資產</p>
          )}
          <div className="border-t border-white/10 pt-2 flex items-center justify-between text-sm font-semibold">
            <span className="text-zinc-300">總資產</span>
            <span className="text-emerald-400">{fmtMoney(totalAssets)}</span>
          </div>
        </div>
      </div>

      {/* Liabilities column */}
      <div>
        <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">負債</h3>
        <div className="space-y-2">
          {Object.entries(liabGroups).map(([type, g]) => (
            <div key={type} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-300">
                <span>{g.icon}</span>
                {g.label}
              </span>
              <span className="text-red-400">-{fmtMoney(g.total)}</span>
            </div>
          ))}
          {liabilities.length === 0 && (
            <p className="text-xs text-zinc-600">尚無負債</p>
          )}
          <div className="border-t border-white/10 pt-2 flex items-center justify-between text-sm font-semibold">
            <span className="text-zinc-300">總負債</span>
            <span className="text-red-400">-{fmtMoney(totalLiabilitiesRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Net Worth row */}
      <div className="md:col-span-2 border-t border-white/10 pt-4 flex items-center justify-between">
        <span className="text-zinc-200 font-semibold">淨資產 (資產 − 負債)</span>
        <span className={`text-xl font-extrabold ${netWorth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {fmtMoney(netWorth)}
        </span>
      </div>
    </div>
  );
}
