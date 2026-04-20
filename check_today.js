const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://tgsjxkleioivufbozfgw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnc2p4a2xlaW9pdnVmYm96Zmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODQ2NTksImV4cCI6MjA5MTU2MDY1OX0.i3YOmWXHNAQ1zkeHpdy7TZUPwTwj-O1jzKueDTMOu0s"
);

// 今天台灣時間 4/19 的 UTC 範圍
// 4/19 00:00 TW = 4/18 16:00 UTC
// 4/20 00:00 TW = 4/19 16:00 UTC
const startUTC = new Date("2026-04-19T00:00:00+08:00").toISOString();
const endUTC   = new Date("2026-04-20T00:00:00+08:00").toISOString();

console.log("查詢範圍 (UTC):", startUTC, "→", endUTC);

supabase
  .from("expenses")
  .select("id, created_at, amount_twd, category, note, user_name")
  .gte("created_at", startUTC)
  .lt("created_at", endUTC)
  .order("created_at", { ascending: true })
  .then(({ data, error }) => {
    if (error) {
      console.error("❌ 查詢失敗:", error.message);
      return;
    }
    if (!data || data.length === 0) {
      console.log("⚠️  今日 (4/19 台灣時間) 尚無支出記錄");
    } else {
      console.log(`✅ 找到 ${data.length} 筆今日支出：`);
      data.forEach(e => {
        // 轉換 UTC 為台灣時間顯示
        const twTime = new Intl.DateTimeFormat("zh-TW", {
          timeZone: "Asia/Taipei",
          month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit"
        }).format(new Date(e.created_at));
        console.log(`  [${twTime}] ${e.category} - ${e.note} - NT$${e.amount_twd} (${e.user_name})`);
      });
    }
  });
