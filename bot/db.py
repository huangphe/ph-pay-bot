"""
資料庫操作層 — Supabase (PostgreSQL)
"""

import os
import logging
from datetime import date, datetime, timezone, timedelta
from supabase import create_client, Client

TW = timezone(timedelta(hours=8))

def _today_tw() -> str:
    """回傳台灣時區今日日期，格式 YYYY-MM-DD"""
    return datetime.now(TW).date().isoformat()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

_supabase: Client | None = None


def get_client() -> Client:
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("請設定 SUPABASE_URL 和 SUPABASE_KEY 環境變數")
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase


# ── 寫入 ──────────────────────────────────────────────────

def add_expense(
    user_id: int,
    user_name: str,
    amount_twd: float,
    amount_original: float,
    currency: str,
    exchange_rate: float,
    category: str,
    note: str,
) -> dict:
    """新增一筆支出，回傳插入後的資料"""
    sb = get_client()
    data = {
        "user_id": str(user_id),
        "user_name": user_name,
        "amount_twd": round(amount_twd, 2),
        "amount_original": round(amount_original, 2),
        "currency": currency,
        "exchange_rate": round(exchange_rate, 4),
        "category": category,
        "note": note,
    }
    result = sb.table("expenses").insert(data).execute()
    return result.data[0] if result.data else {}


def delete_last_expense(user_id: int) -> dict | None:
    """刪除該用戶最後一筆支出"""
    sb = get_client()
    # 先查最新一筆
    q = (
        sb.table("expenses")
        .select("id, amount_twd, category, note, created_at")
        .eq("user_id", str(user_id))
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not q.data:
        return None
    expense = q.data[0]
    sb.table("expenses").delete().eq("id", expense["id"]).execute()
    return expense


def add_category(name: str, icon: str = "💰", color: str = "#6B7280") -> dict:
    """新增自訂類別"""
    sb = get_client()
    result = sb.table("categories").insert(
        {"name": name, "icon": icon, "color": color}
    ).execute()
    return result.data[0] if result.data else {}


# ── 查詢 ──────────────────────────────────────────────────

def get_today_summary(target_date: str | None = None) -> list[dict]:
    """取得目標日期所有支出（以台灣時間 UTC+8 為基準）。
    若在凌晨 (00-04) 執行且未指定日期，自動回溯至昨天。
    """
    sb = get_client()
    if not target_date:
        now = datetime.now(TW)
        if now.hour < 4:
            target_date = (now - timedelta(days=1)).date().isoformat()
        else:
            target_date = now.date().isoformat()
    else:
        # 確保 target_date 只有日期部分
        if "T" in target_date:
            target_date = target_date.split("T")[0]
            
    logger.info(f"查詢今日摘要，日期: {target_date}")
    result = (
        sb.table("expenses")
        .select("*")
        .gte("created_at", f"{target_date}T00:00:00+08:00")
        .lt("created_at", f"{target_date}T23:59:59.999+08:00")
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


def get_user_last_expense(user_id: int) -> dict | None:
    """取得該用戶最後一筆（用於顯示當日累計，以台灣時間為基準）"""
    sb = get_client()
    today = _today_tw()
    result = (
        sb.table("expenses")
        .select("*")
        .eq("user_id", str(user_id))
        .gte("created_at", f"{today}T00:00:00+08:00")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_user_today_total(user_id: int) -> float:
    """取得該用戶今日累計（TWD，以台灣時間為基準）"""
    sb = get_client()
    today = _today_tw()
    result = (
        sb.table("expenses")
        .select("amount_twd")
        .eq("user_id", str(user_id))
        .gte("created_at", f"{today}T00:00:00+08:00")
        .execute()
    )
    return sum(r["amount_twd"] for r in (result.data or []))


def get_current_month_total(target_date: str | None = None) -> float:
    """取得本月累計支出（TWD，以台灣時間為基準）。
    若在月初凌晨執行且未指定日期，自動回溯至上個月。
    """
    sb = get_client()
    if target_date:
        try:
            # 支援 YYYY-MM-DD 或完整 ISO
            if "T" in target_date:
                now = datetime.fromisoformat(target_date.replace("Z", "+00:00")).astimezone(TW)
            else:
                now = datetime.strptime(target_date, "%Y-%m-%d").replace(tzinfo=TW)
        except Exception as e:
            logger.warning(f"解析目標日期失敗 ({target_date})，使用目前時間: {e}")
            now = datetime.now(TW)
    else:
        now = datetime.now(TW)
        if now.day == 1 and now.hour < 4:
            now = now - timedelta(days=1)
            
    year, month = now.year, now.month
    start = f"{year}-{month:02d}-01T00:00:00+08:00"
    
    if month == 12:
        end = f"{year + 1}-01-01T00:00:00+08:00"
    else:
        end = f"{year}-{month + 1:02d}-01T00:00:00+08:00"
        
    logger.info(f"查詢本月總計，範圍: {start} -> {end}")
    result = (
        sb.table("expenses")
        .select("amount_twd")
        .gte("created_at", start)
        .lt("created_at", end)
        .execute()
    )
    return sum(r["amount_twd"] for r in (result.data or []))


def get_month_expenses(year: int, month: int) -> list[dict]:
    """取得指定月份所有支出 (以台灣時間 UTC+8 為基準)"""
    sb = get_client()
    start = f"{year}-{month:02d}-01T00:00:00+08:00"
    if month == 12:
        end = f"{year + 1}-01-01T00:00:00+08:00"
    else:
        end = f"{year}-{month + 1:02d}-01T00:00:00+08:00"
    
    result = (
        sb.table("expenses")
        .select("*")
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


def get_categories() -> list[dict]:
    """取得所有類別"""
    sb = get_client()
    result = sb.table("categories").select("*").order("id").execute()
    return result.data or []
