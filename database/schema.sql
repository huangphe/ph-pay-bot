-- =====================================================
-- 夫妻記帳本 — Supabase Schema
-- 在 Supabase Dashboard > SQL Editor 執行此檔案
-- =====================================================

-- 類別表
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  icon       TEXT DEFAULT '💰',
  color      TEXT DEFAULT '#6366F1',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 支出記錄表
CREATE TABLE IF NOT EXISTS expenses (
  id              BIGSERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL,
  user_name       TEXT NOT NULL DEFAULT '',
  amount_twd      NUMERIC(12,2) NOT NULL,       -- 換算後 TWD 金額（輸出用）
  amount_original NUMERIC(12,2) NOT NULL,       -- 原始輸入金額
  currency        TEXT NOT NULL DEFAULT 'TWD',  -- 原始幣別
  exchange_rate   NUMERIC(12,4) NOT NULL DEFAULT 1.0,
  category        TEXT NOT NULL DEFAULT '其他',
  note            TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 索引加速查詢
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id    ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category   ON expenses(category);

-- 預設類別資料
INSERT INTO categories (name, icon, color, is_default) VALUES
  ('食', '🍜', '#F97316', TRUE),
  ('衣', '👗', '#EC4899', TRUE),
  ('住', '🏠', '#6366F1', TRUE),
  ('行', '🚗', '#3B82F6', TRUE),
  ('育', '📚', '#10B981', TRUE),
  ('樂', '🎮', '#8B5CF6', TRUE),
  ('其他', '💰', '#6B7280', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Row Level Security（使用 anon key 也能讀寫）
ALTER TABLE expenses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access on expenses"
  ON expenses FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Public full access on categories"
  ON categories FOR ALL USING (TRUE) WITH CHECK (TRUE);
