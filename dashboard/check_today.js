const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://tgsjxkleioivufbozfgw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnc2p4a2xlaW9pdnVmYm96Zmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODQ2NTksImV4cCI6MjA5MTU2MDY1OX0.i3YOmWXHNAQ1zkeHpdy7TZUPwTwj-O1jzKueDTMOu0s"
);

// 模擬 fetchMonthExpenses 的完整查詢
const year = 2026;
const month = 4;
const endMonth = 5;
const endYear = 2026;
const pad = (n) => String(n).padStart(2, "0");

const startUTC = new Date(`${year}-${pad(month)}-01T00:00:00+08:00`).toISOString();
const endUTC   = new Date(`${endYear}-${pad(endMonth)}-01T00:00:00+08:00`).toISOString();

console.log("fetchMonthExpenses 查詢範圍:");
console.log("  Start:", startUTC);
console.log("  End:  ", endUTC);
console.log("");

supabase
  .from("expenses")
  .select("id, created_at, amount_twd, category")
  .gte("created_at", startUTC)
  .lt("created_at", endUTC)
  .order("created_at", { ascending: false })
  .limit(20)
  .then(({ data, error }) => {
    if (error) {
      console.error("❌ 查詢失敗:", error.message);
      return;
    }
    
    console.log(`共 ${data.length} 筆 (最近20筆):`);
    
    // 模擬 formatTWDay
    const formatTWDay = (dateInput) => {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return "";
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
    };
    
    // 模擬 groupByDay
    const grouped = {};
    for (const e of data) {
      const d = formatTWDay(e.created_at);
      grouped[d] = (grouped[d] ?? 0) + e.amount_twd;
    }
    
    console.log("\ngroupByDay 結果:");
    Object.entries(grouped).sort().forEach(([date, total]) => {
      const marker = date === "2026-04-19" ? "  ← 今日" : "";
      console.log(`  ${date}: NT$${total}${marker}`);
    });
    
    console.log("\n最新10筆原始 created_at:");
    data.slice(0, 10).forEach(e => {
      const twDay = formatTWDay(e.created_at);
      console.log(`  raw: ${e.created_at}  →  TW day: ${twDay}  →  NT$${e.amount_twd}`);
    });
  });
