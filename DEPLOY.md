# 夫妻記帳本 — 部署指南

## 系統架構
```
Telegram → Railway Bot → Supabase DB ← Vercel Dashboard
```
全程雲端，不需要本地端開機。

---

## Step 1：建立 Telegram Bot

1. 在 Telegram 搜尋 `@BotFather`
2. 傳送 `/newbot`
3. 設定名稱（例如：`我家記帳本`）和 username（例如：`my_family_finance_bot`）
4. 複製取得的 **Token**（格式如：`1234567890:AAFxxx...`）
5. 分別傳訊息給 `@userinfobot` 取得你們兩人的 **user_id**

---

## Step 2：建立 Supabase 資料庫

1. 前往 [supabase.com](https://supabase.com) → Sign Up（免費）
2. **New Project** → 取名（如 `couple-finance`）→ 設密碼 → 選最近的 Region（如 Singapore）
3. 等待約 1 分鐘初始化完成
4. 左側選 **SQL Editor** → **New Query**
5. 複製貼上 `database/schema.sql` 的完整內容 → 點擊 **Run**
6. 取得連線資訊：
   - 左側 **Settings** → **API**
   - 複製 **Project URL** 和 **anon public key**

---

## Step 3：部署 Bot 到 Railway

[Railway.app](https://railway.app) 提供每月 $5 美金免費點數，足夠運行此 Bot。

1. 前往 [railway.app](https://railway.app) → GitHub 登入
2. **New Project** → **Deploy from GitHub Repo**
3. 選擇你的 repo → 選 `couple-finance/bot` 資料夾（若整個 repo 上傳，Railway 會自動找 `Procfile`）
4. 部署成功後，點選 **Variables** → **New Variable**，填入以下環境變數：

| 變數名稱 | 值 |
|---------|-----|
| `TELEGRAM_TOKEN` | 你的 Bot Token |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_KEY` | Supabase anon public key |
| `DASHBOARD_URL` | 先留空，Step 4 後填入 |
| `ALLOWED_USER_IDS` | 兩人的 user_id，逗號分隔（如 `123456,789012`） |

5. 點 **Deploy** → 等待幾分鐘
6. 查看 **Logs**，出現 `夫妻記帳本 Bot 已啟動 🚀` 即成功

---

## Step 4：部署 Dashboard 到 Vercel

1. 前往 [vercel.com](https://vercel.com) → GitHub 登入
2. **Add New Project** → 選擇你的 repo
3. **Root Directory** 選 `couple-finance/dashboard`
4. **Environment Variables** 填入：

| 變數名稱 | 值 |
|---------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_KEY` | Supabase anon public key |

5. 點 **Deploy** → 等待約 2 分鐘
6. 取得你的網域（如 `https://couple-finance-xxx.vercel.app`）

---

## Step 5：更新 Bot 的 Dashboard 連結

1. 回到 Railway → Variables
2. 更新 `DASHBOARD_URL` 為 Vercel 網域
3. Railway 會自動重新部署

---

## 使用方式

### 記帳（Telegram）
```
280 咖啡          → 自動分類為「食」，TWD 280
1200 住 房租      → 手動指定類別「住」
50 USD 紀念品     → 自動換算為 TWD，分類為「樂」
```

### 查詢（Telegram）
```
/today   → 今日彙總 + 各人花費
/month   → 本月報告 + 類別分布
/del     → 刪除最後一筆
/addcat 旅遊  → 新增自訂類別
/report  → 開啟儀表板連結
```

### 儀表板（瀏覽器/手機）
- **今日頁面**：今日支出卡片 + 類別圓餅圖 + 明細表
- **月報頁面**：每日長條圖 + 類別分布 + 完整明細

---

## 上傳到 GitHub（必要步驟）

Railway 和 Vercel 都需要從 GitHub 部署。在 Terminal 執行：

```bash
cd C:\Users\qru70\OneDrive\桌面\Claude
git init couple-finance-repo
cd couple-finance-repo
xcopy /E /H /I "..\couple-finance\*" "."
git add .
git commit -m "feat: 夫妻記帳本初始版本"
# 到 github.com 建立新 repo，複製 remote url
git remote add origin https://github.com/your-username/couple-finance.git
git push -u origin main
```

---

## 費用估計（月）

| 服務 | 費用 |
|------|------|
| Railway Bot 主機 | **$0**（$5 免費額度足夠） |
| Supabase 資料庫 | **$0**（免費方案 500MB） |
| Vercel 儀表板 | **$0**（永久免費） |
| 匯率 API | **$0**（open.er-api.com 無限免費） |
| **總計** | **$0 / 月** |
