"""
匯率轉換模組 — 使用 open.er-api.com（免費，無需 API Key）
預設幣別：TWD，輸出固定為 TWD
"""

import httpx
import logging
from functools import lru_cache
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# 支援的幣別代號
SUPPORTED_CURRENCIES = {
    "TWD", "USD", "JPY", "EUR", "CNY", "HKD",
    "GBP", "AUD", "SGD", "KRW", "THB",
}

# 簡單快取，避免頻繁呼叫（60 分鐘 TTL）
_rate_cache: dict[str, tuple[float, datetime]] = {}
CACHE_TTL = timedelta(minutes=60)


async def get_twd_rate(from_currency: str) -> float:
    """取得 from_currency → TWD 的匯率"""
    from_currency = from_currency.upper()

    if from_currency == "TWD":
        return 1.0

    if from_currency not in SUPPORTED_CURRENCIES:
        raise ValueError(f"不支援的幣別：{from_currency}")

    # 檢查快取
    if from_currency in _rate_cache:
        rate, cached_at = _rate_cache[from_currency]
        if datetime.now() - cached_at < CACHE_TTL:
            return rate

    # 呼叫免費 API
    url = f"https://open.er-api.com/v6/latest/{from_currency}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            rate = float(data["rates"]["TWD"])
            _rate_cache[from_currency] = (rate, datetime.now())
            logger.info(f"匯率更新: 1 {from_currency} = {rate:.4f} TWD")
            return rate
    except Exception as e:
        logger.error(f"匯率查詢失敗: {e}")
        # 若快取有舊資料，仍使用
        if from_currency in _rate_cache:
            return _rate_cache[from_currency][0]
        raise


def parse_currency(token: str) -> str | None:
    """判斷 token 是否為貨幣代號"""
    upper = token.upper()
    if upper in SUPPORTED_CURRENCIES:
        return upper
    return None
