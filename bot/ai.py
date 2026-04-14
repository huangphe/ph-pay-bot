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
    使用 Gemini Vision 辨識發票照片 (具備自動模型偵測機制)
    """
    if not genai:
        logger.error("Gemini SDK 未載入")
        return None

    model_name = None
    try:
        # 1. 動態偵測可用模型
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        logger.info(f"您的金鑰可用模型清單: {available_models}")
        
        # 2. 挑選最佳模型 (優先找 3.x Flash, 再找 2.x/1.x Flash)
        for target in ["gemini-3.1-flash", "gemini-3.0-flash", "gemini-3-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
            # 檢查清單中是否有符合的模型 (SDK 返回的名稱通常帶有 models/ 或是 v1/ 標籤)
            for m in available_models:
                if target in m:
                    model_name = m
                    break
            if model_name: break
            
        if not model_name:
            # 如果都沒找到，拿第一個可用的 Flash
            for m in available_models:
                if "flash" in m.lower():
                    model_name = m
                    break
        
        if not model_name:
            model_name = "models/gemini-1.5-flash" # 最後的保底
            
        logger.info(f"最終決定呼叫模型: {model_name}")

    except Exception as list_err:
        logger.error(f"偵測模型失敗: {list_err}，將嘗試使用預設值")
        model_name = "models/gemini-1.5-flash"

    prompt = (
        "你是一個記帳助手。請從這張發票或收據照片中提取以下資訊：\n"
        "1. 總金額 (Total Amount)，必須是整數數字，單位為台幣 TWD。\n"
        "2. 消費內容簡述 (Note)，例如 '7-11 咖啡' 或 '全家午餐'。\n"
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
        logger.info(f"模型 {model_name} 原始回應: {text}")

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
        logger.error(f"模型 {model_name} 執行錯誤: {e}")
        return None
