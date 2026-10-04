import os
import logging
import google.generativeai as genai
from typing import Optional, Dict

# ── 設定 ──────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    genai = None

logger = logging.getLogger(__name__)

_cached_model_name: str | None = None


def _get_best_model_name() -> str:
    """動態偵測並快取最佳可用模型"""
    global _cached_model_name
    if _cached_model_name:
        return _cached_model_name

    try:
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        logger.info(f"可用模型清單: {available_models}")

        for target in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
            for m in available_models:
                if target in m:
                    _cached_model_name = m
                    return _cached_model_name

        for m in available_models:
            if "flash" in m.lower():
                _cached_model_name = m
                return _cached_model_name

        _cached_model_name = "models/gemini-1.5-flash"
    except Exception as e:
        logger.warning(f"偵測模型清單失敗: {e}，回退使用預設模型")
        _cached_model_name = "models/gemini-1.5-flash"

    return _cached_model_name


# ── 核心邏輯 ───────────────────────────────────────────────

async def analyze_receipt(image_bytes: bytes) -> Optional[Dict]:
    """
    使用 Gemini Vision 辨識發票/收據照片
    """
    if not genai or not GEMINI_API_KEY:
        logger.error("Gemini API Key 未設定或 SDK 未載入")
        return None

    model_name = _get_best_model_name()
    prompt = (
        "你是一個記帳助手。請從這張發票或收據照片中提取以下資訊：\n"
        "1. 總金額 (Total Amount)，必須是整數數字，單位為台幣 TWD。\n"
        "2. 消費內容簡述 (Note)，例如 '7-11 咖啡' 或 '全家便當'。\n"
        "\n"
        "請只返回 JSON 格式，不要有其他文字說明。格式如下：\n"
        "{\"amount\": 123, \"note\": \"說明內容\"}\n"
    )

    try:
        current_model = genai.GenerativeModel(model_name)
        response = current_model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_bytes}
        ])

        text = response.text.strip()
        logger.info(f"發票辨識原始回覆: {text}")

        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "").strip()
        elif text.startswith("```"):
            text = text.replace("```", "").strip()

        import json
        data = json.loads(text)

        if data.get("amount") is not None:
            return {
                "amount": float(data["amount"]),
                "note": data.get("note", "發票記帳"),
                "success": True
            }
        return None

    except Exception as e:
        logger.error(f"發票辨識執行錯誤: {e}")
        return None


async def transcribe_voice(audio_bytes: bytes, mime_type: str = "audio/ogg") -> Optional[str]:
    """
    使用 Gemini Audio 多模態將語音訊息轉為記帳文字
    """
    if not genai or not GEMINI_API_KEY:
        logger.error("Gemini API Key 未設定或 SDK 未載入")
        return None

    model_name = _get_best_model_name()
    prompt = (
        "你是一個精準的繁體中文語音記帳辨識器。\n"
        "請將這段語音轉為文字。語音內容通常是簡短的日常消費，例如：\n"
        "『午餐便當 120』、『買咖啡 65 塊』、『加油 1500』、『全家飲料 45』。\n"
        "規則：\n"
        "1. 請只返回辨識出來的記帳文字，格式通常為『品項 金額』或『金額 品項』，例如：'便當 120'。\n"
        "2. 請勿輸出任何多餘的引言、標點符號或解釋。\n"
    )

    try:
        current_model = genai.GenerativeModel(model_name)
        response = current_model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": audio_bytes}
        ])

        text = response.text.strip()
        # 清理多餘符號
        text = text.replace("`", "").replace('"', '').replace("'", "").strip()
        logger.info(f"語音辨識結果: {text}")
        return text if text else None

    except Exception as e:
        logger.error(f"語音辨識錯誤: {e}")
        return None


async def generate_financial_insight(summary_data: dict) -> str:
    """
    使用 Gemini 生成每週/每月幽默實用的家庭財務洞察評語
    """
    if not genai or not GEMINI_API_KEY:
        return ""

    model_name = _get_best_model_name()
    prompt = (
        "你是一位溫暖、幽默且精明的家庭財務管家。\n"
        "以下是這對夫妻近期的真實消費統計數據：\n"
        f"- 總支出：NT${summary_data.get('total', 0):,.0f}\n"
        f"- 總筆數：{summary_data.get('count', 0)} 筆\n"
        f"- 兩人分攤狀況：{summary_data.get('by_user', {})}\n"
        f"- 類別排行：{summary_data.get('by_cat', [])[:4]}\n"
        "\n"
        "請用繁體中文給出 2~3 句幽默、實用且富有人情味的評語與理財建議。\n"
        "語氣輕鬆親切，請適當搭配 emoji。請直接給出建議內容，不需要任何前言。"
    )

    try:
        current_model = genai.GenerativeModel(model_name)
        response = current_model.generate_content(prompt)
        text = response.text.strip()
        return text
    except Exception as e:
        logger.error(f"生成財務洞察失敗: {e}")
        return ""
