"""
夫妻記帳本 — Telegram Bot (純 Polling 輪詢版 + Render 存活檢查)
專為 Render 免費層、Railway、VPS 或 Docker 長駐設計
功能支援：文字記帳、發票拍照、語音記帳、本月統計、底部常駐選單、AI 財務洞察
"""

import os
import re
import logging
import asyncio
from datetime import datetime, timezone, timedelta, time
from dotenv import load_dotenv

from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup, BotCommand,
    ReplyKeyboardMarkup
)
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, ContextTypes, filters,
)

import db
import classifier
import ai
import currency as fx

# 載入 .env（若存在）
load_dotenv()

# ── 設定 ──────────────────────────────────────────────────
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "").strip()
DASHBOARD_URL  = os.environ.get("DASHBOARD_URL", "https://dashboard-eight-woad-51.vercel.app").strip()
PUSH_TOKEN     = os.environ.get("PUSH_TOKEN", "default_token_please_change").strip()
WEBHOOK_URL    = os.environ.get("WEBHOOK_URL", os.environ.get("RENDER_EXTERNAL_URL", "")).strip()
PORT           = int(os.environ.get("PORT", 10000))

# 允許的使用者 ID（逗號分隔，若未設定則不限制）
raw_ids = os.environ.get("ALLOWED_USER_IDS", "")
ALLOWED_USER_IDS: set[int] = set(
    int(x.strip()) for x in raw_ids.split(",") if x.strip().isdigit()
)

logging.basicConfig(
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# ── 紀錄者名稱對照表 ──────────────────────────────────────
USER_NAME_MAP = {
    5725029188: "@HAO",
    8514343851: "@WU",
}

# ── Telegram 底部常駐選單按鈕 (功能 3) ───────────────────────
MAIN_MENU_KEYBOARD = ReplyKeyboardMarkup(
    [
        ["📊 今日消費", "📅 本月統計"],
        ["🗑️ 刪除上一筆", "🌐 開啟儀表板"],
    ],
    resize_keyboard=True,
    is_persistent=True,
)

# ── 工具函數 ───────────────────────────────────────────────

def is_allowed(user_id: int) -> bool:
    if not ALLOWED_USER_IDS:
        return True
    return user_id in ALLOWED_USER_IDS

def fmt_money(amount: float) -> str:
    return f"NT${amount:,.0f}"

def fmt_time(dt_str: str) -> str:
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        dt_tw = dt.astimezone(timezone.utc).replace(tzinfo=None) + timedelta(hours=8)
        return dt_tw.strftime("%H:%M")
    except Exception:
        return ""

def create_dashboard_token(user_id: int) -> str:
    """建立與 Web 儀表板相容的 HMAC-SHA256 免密碼安全登入憑證"""
    import hmac, hashlib, time
    secret = os.environ.get("AUTH_SECRET", "couple_wealth_family_secret_key_2026_xyz")
    ts = int(time.time())
    data = f"{user_id}.{ts}"
    sig = hmac.new(secret.encode("utf-8"), data.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{data}.{sig}"

def build_category_keyboard(selected: str | None = None) -> InlineKeyboardMarkup:
    cats = ["食", "衣", "住", "行", "育", "樂", "其他"]
    buttons = []
    for cat in cats:
        icon = classifier.get_icon(cat)
        label = f"✅ {icon}{cat}" if cat == selected else f"{icon}{cat}"
        buttons.append(InlineKeyboardButton(label, callback_data=f"cat:{cat}"))
    rows = [buttons[:4], buttons[4:]]
    return InlineKeyboardMarkup(rows)

# ── 訊息解析 ────────────────────────────────────────────────

async def parse_quick_add(text: str) -> dict | None:
    text = text.strip()
    if not text:
        return None
    
    # 1. 日期過濾：若字串開頭是 10/17 或 4-12，先將其移除以避免誤判為金額
    text = re.sub(r"^\d{1,2}\s*[/\-]\s*\d{1,2}\s*", "", text).strip()
    
    # 2. 解析金額與內容
    match_start = re.match(r"^(\d+(?:\.\d{1,2})?)\s*(.*)$", text)
    match_end   = re.match(r"^(.*?)\s*(\d+(?:\.\d{1,2})?)$", text)
    
    if match_end:
        amount_raw = float(match_end.group(2))
        rest = match_end.group(1).strip()
    elif match_start:
        amount_raw = float(match_start.group(1))
        rest = match_start.group(2).strip()
    else:
        return None
        
    tokens = rest.split()
    currency_code = "TWD"
    explicit_category = None
    note = rest
    
    # 檢查幣別
    if tokens:
        detected = fx.parse_currency(tokens[0])
        if detected:
            currency_code = detected
            rest = " ".join(tokens[1:])
            tokens = rest.split()
            
    # 檢查明確分類
    if rest:
        if tokens and classifier.is_valid_category(tokens[0]):
            explicit_category = tokens[0]
            note = " ".join(tokens[1:])
        elif classifier.is_valid_category(rest[0]):
            explicit_category = rest[0]
            note = rest[1:].strip()
        else:
            note = rest

    rate = await fx.get_twd_rate(currency_code)
    return {
        "amount_original": amount_raw,
        "currency": currency_code,
        "exchange_rate": rate,
        "amount_twd": amount_raw * rate,
        "category": explicit_category or classifier.classify(note) if note else "其他",
        "note": note,
        "is_foreign": currency_code != "TWD",
    }

# ── 指令處理 ────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_user or not is_allowed(update.effective_user.id):
        return
    
    welcome_text = (
        "👋 *歡迎使用夫妻記帳本！*\n\n"
        "這是您的專屬記帳助理，支援以下輸入方式：\n\n"
        "📖 *快速文字記帳*\n"
        "• 直接輸入 `100 晚餐` 或 `便當 120` (順序不受限)\n"
        "• 支援一次多筆：以換行或逗號分隔，例如：\n"
        "  `50 飲料` \n"
        "  `150 午餐` \n\n"
        "🎙️ *語音記帳*\n"
        "• 直接錄製一段語音（如「晚餐 120」），AI 會自動轉文字並記錄。\n\n"
        "📸 *拍照辨識*\n"
        "• 傳送發票或收據照片，AI 自動辨識金額與品項。\n\n"
        "📊 *系統指令與按鈕*\n"
        "• /today - 查看今日消費統計\n"
        "• /month - 查看本月詳細概況與 AI 財務評語\n"
        "• /del - 刪除最後一筆紀錄\n"
        "• /id - 查看個人 Telegram ID\n\n"
        f"🔗 [點我一鍵免密碼進入儀表板]({DASHBOARD_URL.rstrip('/')}/api/auth/token?token={create_dashboard_token(update.effective_user.id)})"
    )
    if update.message:
        await update.message.reply_text(
            welcome_text,
            parse_mode="Markdown",
            disable_web_page_preview=True,
            reply_markup=MAIN_MENU_KEYBOARD  # 附帶常駐底部按鈕
        )

async def cmd_id(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if update.effective_user and update.message:
        await update.message.reply_text(f"🧑‍💻 user_id: `{update.effective_user.id}`", parse_mode="Markdown")

async def cmd_today(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_user or not is_allowed(update.effective_user.id) or not update.message:
        return
    expenses = db.get_today_summary()
    if not expenses:
        await update.message.reply_text("📊 今日尚無記帳紀錄。")
        return
    total = sum(e["amount_twd"] for e in expenses)
    lines = [f"🌙 *今日累計：{fmt_money(total)}* (共 {len(expenses)} 筆)"]
    for e in expenses:
        name = e.get("user_name", "User").replace("@", "")
        lines.append(f"• {classifier.get_icon(e['category'])} {e['note'] or e['category']}: {fmt_money(e['amount_twd'])} (@{name})")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

# ── 功能 1 & 6：本月概況指令與 AI 財務點評 ─────────────────────

async def cmd_month(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """查詢當月消費詳細概況與 AI 財務洞察"""
    if not update.effective_user or not is_allowed(update.effective_user.id) or not update.message:
        return
    
    status_msg = await update.message.reply_text("⏳ *正在整理本月消費統計與 AI 分析...*", parse_mode="Markdown")
    try:
        m_data = db.get_month_detail_summary()
        total = m_data.get("total", 0)
        count = m_data.get("count", 0)
        year = m_data.get("year", 2026)
        month = m_data.get("month", 10)
        
        if count == 0:
            await status_msg.edit_text(f"📅 *{year} 年 {month} 月尚無任何消費紀錄。*")
            return
            
        lines = [
            f"📅 *{year} 年 {month} 月消費概況*",
            f"💰 *本月累計支出：{fmt_money(total)}* (共 {count} 筆)",
        ]
        
        # 兩人分攤
        by_user = m_data.get("by_user", {})
        if by_user and total > 0:
            lines.append("\n👥 *成員各自支出*：")
            for user_name, amt in by_user.items():
                clean_name = user_name.replace("@", "")
                pct = (amt / total) * 100
                lines.append(f"• @{clean_name}: {fmt_money(amt)} ({pct:.0f}%)")
                
        # 類別排行
        by_cat = m_data.get("by_cat", [])
        if by_cat and total > 0:
            lines.append("\n🏷️ *類別支出排行 (Top 4)*：")
            for i, (cat, amt) in enumerate(by_cat[:4], 1):
                pct = (amt / total) * 100
                lines.append(f"{i}. {classifier.get_icon(cat)} {cat}: {fmt_money(amt)} ({pct:.0f}%)")
                
        # 呼叫 Gemini 生成財務洞察評語 (功能 6)
        insight = await ai.generate_financial_insight(m_data)
        if insight:
            lines.append(f"\n💡 *AI 財務管家點評*：\n{insight}")
            
        await status_msg.edit_text("\n".join(lines), parse_mode="Markdown")
    except Exception as e:
        logger.error(f"cmd_month error: {e}", exc_info=True)
        await status_msg.edit_text("⚠️ 查詢本月統計失敗，請稍後再試。")

async def cmd_del(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_user or not is_allowed(update.effective_user.id) or not update.message:
        return
    deleted = db.delete_last_expense(update.effective_user.id)
    if deleted:
        await update.message.reply_text(f"🗑️ 已刪除：{deleted['note']} {fmt_money(deleted['amount_twd'])}")
    else:
        await update.message.reply_text("⚠️ 無可刪除紀錄。")

# ── 訊息與常駐按鈕處理 (功能 3) ─────────────────────────────

async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_user or not is_allowed(update.effective_user.id) or not update.message or not update.message.text:
        return
    user = update.effective_user
    full_text = update.message.text.strip()
    
    # 攔截底部快捷選單按鈕
    if full_text == "📊 今日消費":
        await cmd_today(update, ctx)
        return
    elif full_text == "📅 本月統計":
        await cmd_month(update, ctx)
        return
    elif full_text == "🗑️ 刪除上一筆":
        await cmd_del(update, ctx)
        return
    elif full_text == "🌐 開啟儀表板":
        token = create_dashboard_token(user.id)
        dashboard_url = f"{DASHBOARD_URL.rstrip('/')}/api/auth/token?token={token}"
        dashboard_msg = (
            "💎 *專屬家庭財富儀表板*\n\n"
            f"🔗 [點我一鍵免密碼進入儀表板]({dashboard_url})\n\n"
            "💡 *提示*：此專屬連結已自動為您綁定 30 天安全憑證，點擊即可直達儀表板，無需輸入密碼！"
        )
        await update.message.reply_text(dashboard_msg, parse_mode="Markdown", disable_web_page_preview=True)
        return
    
    # 走一般快速文字記帳
    segments = re.split(r'[,，\n；;]', full_text)
    results = []
    
    for s in [seg.strip() for seg in segments if seg.strip()]:
        p = await parse_quick_add(s)
        if p:
            mapped_name = USER_NAME_MAP.get(user.id)
            if mapped_name:
                recorder_name = mapped_name
            elif "wu" in (user.full_name or "").lower() or "wu" in (user.username or "").lower():
                recorder_name = "@WU"
            else:
                raw_name = user.full_name or user.username or user.first_name or str(user.id)
                recorder_name = f"@{raw_name}" if not raw_name.startswith("@") else raw_name
                
            record = db.add_expense(
                user.id, recorder_name,
                p["amount_twd"], p["amount_original"],
                p["currency"], p["exchange_rate"],
                p["category"], p["note"]
            )
            results.append((p, record.get("id")))

    if results:
        msg = f"✅ 成功記錄 {len(results)} 筆！\n" + "\n".join([
            f"{classifier.get_icon(p[0]['category'])} {p[0]['note']}: {fmt_money(p[0]['amount_twd'])} ({p[1] if isinstance(p[1], str) else recorder_name})" 
            for p in results
        ])
        await update.message.reply_text(msg, parse_mode="Markdown")

# ── 功能 5：AI 語音記帳處理器 ────────────────────────────────

async def handle_voice(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """接收並解析語音訊息，自動轉文字並完成記帳"""
    if not update.effective_user or not is_allowed(update.effective_user.id) or not update.message:
        return
    
    user = update.effective_user
    voice = update.message.voice or update.message.audio
    if not voice:
        return
        
    status_msg = await update.message.reply_text("🎙️ *正在聆聽並辨識語音記帳...*", parse_mode="Markdown")
    try:
        import io
        file = await voice.get_file()
        buf = io.BytesIO()
        await file.download_to_memory(out=buf)
        audio_bytes = buf.getvalue()
        
        mime = getattr(voice, "mime_type", "audio/ogg") or "audio/ogg"
        transcribed_text = await ai.transcribe_voice(audio_bytes, mime_type=mime)
        
        if not transcribed_text:
            await status_msg.edit_text("❌ 未能識別語音內容，請重試或以文字輸入。")
            return
            
        p = await parse_quick_add(transcribed_text)
        if not p:
            await status_msg.edit_text(f"🎙️ 語音辨識：`{transcribed_text}`\n⚠️ 未能辨識出有效金額與品項，請手動確認。")
            return
            
        mapped_name = USER_NAME_MAP.get(user.id)
        if mapped_name:
            recorder_name = mapped_name
        elif "wu" in (user.full_name or "").lower() or "wu" in (user.username or "").lower():
            recorder_name = "@WU"
        else:
            raw_name = user.full_name or user.username or user.first_name or str(user.id)
            recorder_name = f"@{raw_name}" if not raw_name.startswith("@") else raw_name
            
        record = db.add_expense(
            user.id, recorder_name,
            p["amount_twd"], p["amount_original"],
            p["currency"], p["exchange_rate"],
            p["category"], p["note"]
        )
        
        cat_icon = classifier.get_icon(p["category"])
        reply_text = (
            f"🎙️ *語音記帳成功！*\n"
            f"🗣️ 語音辨識：`{transcribed_text}`\n\n"
            f"{cat_icon} {p['note']}: {fmt_money(p['amount_twd'])} ({recorder_name})"
        )
        await status_msg.edit_text(reply_text, parse_mode="Markdown")
        
    except Exception as e:
        logger.error(f"Voice handling error: {e}", exc_info=True)
        await status_msg.edit_text("⚠️ 語音辨識處理失敗，請稍後再試。")

async def handle_photo(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_user or not is_allowed(update.effective_user.id) or not update.message:
        return
    
    photo = update.message.photo[-1] if update.message.photo else update.message.document
    if not photo:
        return
        
    status_msg = await update.message.reply_text("🔍 *正在辨識發票...*", parse_mode="Markdown")
    try:
        import io
        file = await photo.get_file()
        buf = io.BytesIO()
        await file.download_to_memory(out=buf)
        img_bytes = buf.getvalue()
        result = await ai.analyze_receipt(img_bytes)
        
        if result and result.get("success"):
            auto_cat = classifier.classify(result["note"])
            db.add_expense(
                update.effective_user.id,
                update.effective_user.full_name or "User",
                result["amount"], result["amount"],
                "TWD", 1.0,
                auto_cat, result["note"]
            )
            await status_msg.edit_text(
                f"📸 *辨識成功！*\n{classifier.get_icon(auto_cat)} {result['note']}\n💵 {fmt_money(result['amount'])}",
                parse_mode="Markdown"
            )
        else:
            await status_msg.edit_text("❌ 辨識失敗，請手動輸入。")
    except Exception as e:
        logger.error(f"Photo error: {e}")
        await status_msg.edit_text("⚠️ 系統繁忙中，請稍後再試。")

async def handle_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.callback_query:
        return
    query = update.callback_query
    await query.answer()
    data = query.data or ""
    if data.startswith("cat:"):
        new_cat = data.split(":")[1]
        expense_id = ctx.user_data.get("editing_expense_id") if ctx.user_data else None
        if expense_id:
            db.get_client().table("expenses").update({"category": new_cat}).eq("id", expense_id).execute()
            await query.edit_message_text(f"✅ 類別已更新為 {new_cat}")

# ── 每日定時推送任務 ────────────────────────────────────────

async def daily_summary_push(context: ContextTypes.DEFAULT_TYPE) -> None:
    """每日定時推送當日及當月支出摘要，週日自動附帶 AI 財務週報洞察"""
    try:
        logger.info("🚀 開始執行每日自動推送任務")
        bot = context.bot
        expenses = db.get_today_summary()
        month_total = db.get_current_month_total()
        
        if not expenses:
            msg = "🌙 *今日結算*\n今日無支出紀錄，早點休息吧！"
        else:
            total = sum(e["amount_twd"] for e in expenses)
            lines = [f"🌙 *今日支出結算：{fmt_money(total)}*"]
            for e in expenses:
                name = e.get("user_name", "User").replace("@", "")
                lines.append(f"• {classifier.get_icon(e['category'])} {e['note'] or e['category']}: {fmt_money(e['amount_twd'])} (@{name})")
            msg = "\n".join(lines)

        msg += f"\n\n📊 *本月累計支出：{fmt_money(month_total)}*"

        # 功能 6：每週日自動附帶 AI 財務週報洞察
        now_tw = datetime.now(timezone(timedelta(hours=8)))
        if now_tw.weekday() == 6:  # 0=週一, 6=週日
            m_data = db.get_month_detail_summary()
            insight = await ai.generate_financial_insight(m_data)
            if insight:
                msg += f"\n\n🌟 *本週 AI 財務管家洞察評語*：\n{insight}"

        targets = ALLOWED_USER_IDS or set(USER_NAME_MAP.keys())
        for user_id in targets:
            try:
                await bot.send_message(chat_id=user_id, text=msg, parse_mode="Markdown")
                logger.info(f"📨 已向 ID:{user_id} 發送推送")
            except Exception as e:
                logger.error(f"❌ 發送每日推送失敗 (user_id: {user_id}): {e}")
                
    except Exception as e:
        logger.error(f"💥 daily_summary_push 發生未預期錯誤: {e}", exc_info=True)

# ── Render HTTP 存活檢查服務 ─────────────────────────────

async def _handle_http_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        await reader.readline()
        response = (
            b"HTTP/1.1 200 OK\r\n"
            b"Content-Type: application/json; charset=utf-8\r\n"
            b"Content-Length: 32\r\n"
            b"Connection: close\r\n\r\n"
            b'{"status":"ok","bot":"ph-pay-bot"}'
        )
        writer.write(response)
        await writer.drain()
    except Exception:
        pass
    finally:
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass

async def start_http_server(port: int) -> None:
    try:
        server = await asyncio.start_server(_handle_http_client, "0.0.0.0", port)
        logger.info(f"🌐 Render 存活檢查 HTTP 伺服器已啟動於 0.0.0.0:{port}")
        async with server:
            await server.serve_forever()
    except Exception as e:
        logger.error(f"❌ HTTP 伺服器啟動失敗: {e}")

# ── 生命週期管理 ────────────────────────────────────────────

async def post_init(application: Application) -> None:
    """Bot 啟動後設置選單指令、清除殘留 Webhook 並啟動 HTTP 存活檢查端口"""
    logger.info("🔧 正在初始化 Bot 設定...")

    # 1. 立即啟動原生 HTTP 伺服器供 Render 進行健康檢查及 Keepalive
    port = int(os.environ.get("PORT", 10000))
    asyncio.create_task(start_http_server(port))

    # 2. 清理舊有 Webhook，但不清空待處理訊息 (drop_pending_updates=False)
    await application.bot.delete_webhook(drop_pending_updates=False)
    logger.info("✅ 已清除舊有 Webhook 狀態並保留訊息隊列")

    # 3. 註冊 Telegram 指令選單
    commands = [
        BotCommand("today", "📊 查看今日消費統計"),
        BotCommand("month", "📅 查看本月消費概況與洞察"),
        BotCommand("del", "🗑️ 刪除最後一筆紀錄"),
        BotCommand("id", "🧑‍💻 查看您的 Telegram ID"),
        BotCommand("start", "🏠 顯示使用說明與鍵盤"),
    ]
    await application.bot.set_my_commands(commands)
    logger.info("✅ 指令選單已註冊完成")

def main():
    if not TELEGRAM_TOKEN:
        logger.error("❌ 找不到 TELEGRAM_TOKEN！請在環境變數或 .env 填入有效的 Bot Token。")
        return

    logger.info("🤖 正在建立 Telegram Application...")
    application = (
        Application.builder()
        .token(TELEGRAM_TOKEN)
        .post_init(post_init)
        .build()
    )

    # 註冊指令 Handlers
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("id", cmd_id))
    application.add_handler(CommandHandler("today", cmd_today))
    application.add_handler(CommandHandler("month", cmd_month))  # 功能 1
    application.add_handler(CommandHandler("del", cmd_del))
    application.add_handler(CallbackQueryHandler(handle_callback))

    # 註冊訊息 Handlers
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    application.add_handler(MessageHandler(filters.PHOTO | filters.Document.IMAGE, handle_photo))
    application.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, handle_voice))  # 功能 5 語音記帳

    # 排程任務 (每日台灣時間 23:58 推送總結)
    if application.job_queue:
        run_time = time(23, 58, 0, tzinfo=timezone(timedelta(hours=8)))
        application.job_queue.run_daily(daily_summary_push, time=run_time)
        logger.info(f"⏰ 已設定每日定時推送：台灣時間 {run_time.strftime('%H:%M')}")

    logger.info("🚀 夫妻記帳本 Bot 正式啟動（支援 Polling + 存活保活 + 魔法 Token 直連）...")
    application.run_polling(drop_pending_updates=False)

if __name__ == "__main__":
    main()

