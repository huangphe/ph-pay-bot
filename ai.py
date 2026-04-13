import os
import logging
import google.generativeai as genai
from typing import Optional, Dict

# ── 設定 ──────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    # 使用 1.5 Flash 速度快且免費額度高
    model = genai.GenerativeModel("gemini-1.5-flash")
else:
    model = None

logger = logging.getLogger(__name__)

# ── 核心邏輯 ───────────────────────────────────────────────

async def analyze_receipt(image_bytes: bytes) -> Optional[Dict]:
    """
    使用 Gemini Vision 辨識發票照片
    返回格式：{"amount": 100, "note": "晚餐", "success": True}
    """
    if not model:
        logger.error("GEMINI_API_KEY 未設定，無法使用拍照記帳")
        return None

    prompt = (
        "你是一個記帳助手。請從這張發票或收據照片中提取以下資訊：\n"
        "1. 總金額 (Total Amount)，必須是整數數字，單位為台幣 TWD。\n"
        "2. 消費內容簡述 (Note)，例如 '7-11 咖啡' 或 '全家午餐'。\n"
        "\n"
        "請只返回 JSON 格式，不要有其他文字說明。格式如下：\n"
        "{\"amount\": 123, \"note\": \"說明內容\"}\n"
        "如果辨識不出金額，請返回 {\"amount\": null, \"note\": \"辨識失敗\"}"
    )

    try:
        logger.info("正在連線 Gemini API 進行辨識...")
        # Gemini API 調用
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_bytes}
        ])
        
        text = response.text.strip()
        logger.info(f"Gemini 原始回應: {text}")

        # 清除可能存在的 markdown code block 標籤
        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "").strip()
        elif text.startswith("```"):
            text = text.replace("```", "").strip()

        import json
        try:
            data = json.loads(text)
        except Exception as json_err:
            logger.error(f"JSON 解析失敗: {json_err}. 原始文字: {text}")
            return None
        
        if data.get("amount") is not None:
            return {
                "amount": float(data["amount"]),
                "note": data.get("note", "發票記帳"),
                "success": True
            }
        logger.warning(f"AI 回應中缺少金額資訊: {data}")
        return None

    except Exception as e:
        logger.error(f"Gemini API 辨識錯誤: {e}")
        return None
