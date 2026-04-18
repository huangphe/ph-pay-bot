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

def get_today_summary() -> list[dict]:
    """取得今日所有支出（以台灣時間 UTC+8 為基準）"""
    sb = get_client()
    today = _today_tw()
    result = (
        sb.table("expenses")
        .select("*")
        .gte("created_at", f"{today}T00:00:00+08:00")
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


def get_month_expenses(year: int, month: int) -> list[dict]:
    """取得指定月份所有支出"""
    sb = get_client()
    start = f"{year}-{month:02d}-01T00:00:00+00:00"
    if month == 12:
        end = f"{year + 1}-01-01T00:00:00+00:00"
    else:
        end = f"{year}-{month + 1:02d}-01T00:00:00+00:00"
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
