"""
夫妻記帳本 — Telegram Bot (純 Polling 輪詢版)
專為 Railway Worker、VPS、本機或 Docker 長駐設計，免 Webhook、免公網域名、無休眠阻礙
"""

import os
import re
import logging
import asyncio
from datetime import datetime, timezone, timedelta, time
from dotenv import load_dotenv

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, BotCommand
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
# 可將 Telegram ID 映射至暱稱標籤
USER_NAME_MAP = {
    5725029188: "@HAO",
    8514343851: "@WU",
}

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
        "📖 *快速記帳*\n"
        "• 直接輸入 `100 晚餐` 或 `便當 120` (順序不受限)\n"
        "• 支援一次多筆：以換行或逗號分隔，例如：\n"
        "  `50 飲料` \n"
        "  `150 午餐` \n\n"
        "📸 *拍照辨識*\n"
        "• 傳送發票或收據照片，AI 會自動辨識金額並紀錄。\n\n"
        "📊 *系統指令*\n"
        "• /today - 查看今日消費統計\n"
        "• /del - 刪除最後一筆紀錄\n"
        "• /id - 查看個人 Telegram ID\n\n"
        f"🔗 [點我前往網頁版儀表板]({DASHBOARD_URL}?token={PUSH_TOKEN})"
    )
    if update.message:
        await update.message.reply_text(welcome_text, parse_mode="Markdown", disable_web_page_preview=True)

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
    lines = [f"🌙 *今日累計：{fmt_money(total)}*"]
    for e in expenses:
        name = e.get("user_name", "User").replace("@", "")
        lines.append(f"• {classifier.get_icon(e['category'])} {e['note'] or e['category']}: {fmt_money(e['amount_twd'])} (@{name})")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

async def cmd_del(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_user or not is_allowed(update.effective_user.id) or not update.message:
        return
    deleted = db.delete_last_expense(update.effective_user.id)
    if deleted:
        await update.message.reply_text(f"🗑️ 已刪除：{deleted['note']} {fmt_money(deleted['amount_twd'])}")
    else:
        await update.message.reply_text("⚠️ 無可刪除紀錄。")

async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_user or not is_allowed(update.effective_user.id) or not update.message or not update.message.text:
        return
    user = update.effective_user
    full_text = update.message.text.strip()
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
    """每日定時推送當日及當月支出摘要"""
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

        # 若未設定白名單，則無法決定推送目標，故僅對白名單內的使用者推送
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
    """Bot 啟動後設置選單指令、清理殘留 Webhook 並啟動 HTTP 存活檢查端口"""
    logger.info("🔧 正在初始化 Bot 設定...")
    
    # 1. 啟動輕量原生 HTTP 伺服器供 Render 進行健康檢查及防止休眠
    port = int(os.environ.get("PORT", 10000))
    asyncio.create_task(start_http_server(port))
    
    # 2. 清理舊有 Webhook
    await application.bot.delete_webhook(drop_pending_updates=True)
    logger.info("✅ 已清除舊有 Webhook 狀態")

    commands = [
        BotCommand("today", "📊 查看今日消費摘要"),
        BotCommand("del", "🗑️ 刪除最後一筆紀錄"),
        BotCommand("id", "🧑‍💻 查看您的 Telegram ID"),
        BotCommand("start", "🏠 顯示使用說明"),
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

    # 註冊 Handlers
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("id", cmd_id))
    application.add_handler(CommandHandler("today", cmd_today))
    application.add_handler(CommandHandler("del", cmd_del))
    application.add_handler(CallbackQueryHandler(handle_callback))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    application.add_handler(MessageHandler(filters.PHOTO | filters.Document.IMAGE, handle_photo))

    # 排程任務 (每日台灣時間 23:58 推送總結)
    if application.job_queue:
        run_time = time(23, 58, 0, tzinfo=timezone(timedelta(hours=8)))
        application.job_queue.run_daily(daily_summary_push, time=run_time)
        logger.info(f"⏰ 已設定每日定時推送：台灣時間 {run_time.strftime('%H:%M')}")

    logger.info("🚀 夫妻記帳本 Bot 正式啟動（Polling 模式運行中）...")
    # drop_pending_updates=True 確保啟動時忽略離線期間的舊封包，立即進入最新狀態
    application.run_polling(drop_pending_updates=True)

if __name__ == "__main__":
    main()
