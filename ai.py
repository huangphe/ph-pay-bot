import os
import logging
import google.generativeai as genai
from typing import Optional, Dict

# ── 設定 ──────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    # 使用最新的 2.0 Flash (Experimental) 辨識更強更準
    model = genai.GenerativeModel("gemini-2.0-flash-exp")
else:
    model = None

logger = logging.getLogger(__name__)

# ── 核心邏輯 ───────────────────────────────────────────────

async def analyze_receipt(image_bytes: bytes) -> Optional[Dict]:
    """
    使用 Gemini Vision 辨識發票照片 (具備自動備案機制)
    """
    if not genai:
        logger.error("Gemini SDK 未載入")
        return None

    # 嘗試模型清單，按優先順序排列
    models_to_try = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash-exp"
    ]

    prompt = (
        "你是一個記帳助手。請從這張發票或收據照片中提取以下資訊：\n"
        "1. 總金額 (Total Amount)，必須是整數數字，單位為台幣 TWD。\n"
        "2. 消費內容簡述 (Note)，例如 '7-11 咖啡' 或 '全家午餐'。\n"
        "\n"
        "請只返回 JSON 格式，不要有其他文字說明。格式如下：\n"
        "{\"amount\": 123, \"note\": \"說明內容\"}\n"
    )

    last_error = None
    for model_name in models_to_try:
        try:
            logger.info(f"正在嘗試模型 {model_name} 進行辨識...")
            current_model = genai.GenerativeModel(model_name)
            response = current_model.generate_content([
                prompt,
                {"mime_type": "image/jpeg", "data": image_bytes}
            ])
            
            text = response.text.strip()
            logger.info(f"模型 {model_name} 回應: {text}")

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
        except Exception as e:
            last_error = e
            logger.warning(f"模型 {model_name} 失敗: {e}")
            continue # 嘗試下一個模型

    logger.error(f"所有模型皆辨識失敗。最後一個錯誤: {last_error}")
    return None
