"""
夫妻記帳本 — Telegram Bot (Render Webhook 版)
"""

import os
import re
import logging
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, BotCommand
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, ContextTypes, filters,
)

import db
import classifier
import ai
import currency as fx

# ── 設定 ──────────────────────────────────────────────────
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
DASHBOARD_URL  = os.environ.get("DASHBOARD_URL", "https://your-app.vercel.app")
RENDER_EXTERNAL_URL = os.environ.get("RENDER_EXTERNAL_URL", "") # Render 自動提供的網址

ALLOWED_USER_IDS: set[int] = set(
    int(x) for x in os.environ.get("ALLOWED_USER_IDS", "").split(",") if x.strip()
)

logging.basicConfig(
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# ── 工具函數 ───────────────────────────────────────────────

def is_allowed(user_id: int) -> bool:
    if not ALLOWED_USER_IDS: return True
    return user_id in ALLOWED_USER_IDS

def fmt_money(amount: float) -> str:
    return f"NT${amount:,.0f}"

def fmt_time(dt_str: str) -> str:
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        dt_tw = dt.astimezone(timezone.utc).replace(tzinfo=None) + timedelta(hours=8)
        return dt_tw.strftime("%H:%M")
    except Exception: return ""

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
    if not text: return None
    match_start = re.match(r"^(\d+(?:\.\d{1,2})?)\s*(.*)$", text)
    match_end   = re.match(r"^(.*?)\s*(\d+(?:\.\d{1,2})?)$", text)
    if match_start:
        amount_raw = float(match_start.group(1)); rest = match_start.group(2).strip()
    elif match_end:
        amount_raw = float(match_end.group(2)); rest = match_end.group(1).strip()
    else: return None
    tokens = rest.split(); currency_code = "TWD"; explicit_category = None; note = rest
    if tokens:
        detected = fx.parse_currency(tokens[0])
        if detected:
            currency_code = detected; rest = " ".join(tokens[1:]); tokens = rest.split()
    if tokens and classifier.is_valid_category(tokens[0]):
        explicit_category = tokens[0]; note = " ".join(tokens[1:])
    else: note = rest
    rate = await fx.get_twd_rate(currency_code)
    return {
        "amount_original": amount_raw, "currency": currency_code, "exchange_rate": rate,
        "amount_twd": amount_raw * rate, "category": explicit_category or classifier.classify(note) if note else "其他",
        "note": note, "is_foreign": currency_code != "TWD",
    }

# ── 指令處理 ────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_allowed(update.effective_user.id): return
    
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
        f"🔗 [點我前往網頁版儀表板]({DASHBOARD_URL})"
    )
    await update.message.reply_text(welcome_text, parse_mode="Markdown", disable_web_page_preview=True)

async def cmd_id(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(f"👤 user_id: `{update.effective_user.id}`", parse_mode="Markdown")

async def cmd_today(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_allowed(update.effective_user.id): return
    expenses = db.get_today_summary()
    if not expenses: await update.message.reply_text("📊 今日尚無記帳紀錄。"); return
    total = sum(e["amount_twd"] for e in expenses)
    lines = [f"💰 *今日總計：{fmt_money(total)}*"]
    for e in expenses: lines.append(f"• {classifier.get_icon(e['category'])} {e['note'] or e['category']}: {fmt_money(e['amount_twd'])}")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

async def cmd_del(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_allowed(update.effective_user.id): return
    deleted = db.delete_last_expense(update.effective_user.id)
    if deleted: await update.message.reply_text(f"🗑️ 已刪除：{deleted['note']} {fmt_money(deleted['amount_twd'])}")
    else: await update.message.reply_text("⚠️ 無可刪除紀錄。")

async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not is_allowed(user.id): return
    full_text = update.message.text.strip()
    segments = re.split(r'[,\n，；;]', full_text)
    results = []
    for s in [seg.strip() for seg in segments if seg.strip()]:
        p = await parse_quick_add(s)
        if p:
            record = db.add_expense(user.id, user.username or str(user.id), p["amount_twd"], p["amount_original"], p["currency"], p["exchange_rate"], p["category"], p["note"])
            results.append((p, record.get("id")))
    if results:
        msg = f"✅ 成功記錄 {len(results)} 筆！\n" + "\n".join([f"{classifier.get_icon(p[0]['category'])} {p[0]['note']}: {fmt_money(p[0]['amount_twd'])}" for p in results])
        await update.message.reply_text(msg, parse_mode="Markdown")

async def handle_photo(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_allowed(update.effective_user.id): return
    photo = update.message.photo[-1] if update.message.photo else update.message.document
    status_msg = await update.message.reply_text("🔍 *正在辨識發票...*", parse_mode="Markdown")
    try:
        file = await photo.get_file()
        import io
        buf = io.BytesIO()
        await file.download_to_memory(out=buf)
        img_bytes = buf.getvalue()
        result = await ai.analyze_receipt(img_bytes)
        if result and result["success"]:
            auto_cat = classifier.classify(result["note"])
            db.add_expense(update.effective_user.id, update.effective_user.username or "User", result["amount"], result["amount"], "TWD", 1.0, auto_cat, result["note"])
            await status_msg.edit_text(f"📸 *辨識成功！*\n{classifier.get_icon(auto_cat)} {result['note']}\n💰 {fmt_money(result['amount'])}", parse_mode="Markdown")
        else: await status_msg.edit_text("❌ 辨識失敗，請手動輸入。")
    except Exception as e:
        logger.error(f"Photo error: {e}")
        await status_msg.edit_text("⚠️ 系統忙碌中，請稍後再試。")

async def handle_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query; await query.answer(); data = query.data
    if data.startswith("cat:"):
        new_cat = data.split(":")[1]; expense_id = ctx.user_data.get("editing_expense_id")
        if expense_id:
            db.get_client().table("expenses").update({"category": new_cat}).eq("id", expense_id).execute()
            await query.edit_message_text(f"✅ 類別已更新為 {new_cat}")

# ── Webhook & FastAPI ──────────────────────────────────────

# 初始化 Telegram Application (不啟動 Polling)
t_app = Application.builder().token(TELEGRAM_TOKEN).build()
t_app.add_handler(CommandHandler("start", cmd_start))
t_app.add_handler(CommandHandler("id", cmd_id))
t_app.add_handler(CommandHandler("today", cmd_today))
t_app.add_handler(CommandHandler("del", cmd_del))
t_app.add_handler(CallbackQueryHandler(handle_callback))
t_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
t_app.add_handler(MessageHandler(filters.PHOTO | filters.Document.IMAGE, handle_photo))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. 註冊指令選單 (輸入 / 會自動跳出)
    commands = [
        BotCommand("today", "📊 查看今日消費摘要"),
        BotCommand("del", "🗑️ 刪除最後一筆紀錄"),
        BotCommand("id", "👤 查看您的 Telegram ID"),
        BotCommand("start", "🏠 顯示使用幫助")
    ]
    await t_app.bot.set_my_commands(commands)
    logger.info("已更新 Telegram 指令選單")

    # 2. 啟動時設定 Webhook
    if RENDER_EXTERNAL_URL:
        webhook_url = f"{RENDER_EXTERNAL_URL}/webhook"
        logger.info(f"正在設定 Webhook: {webhook_url}")
        await t_app.bot.set_webhook(url=webhook_url)
    
    await t_app.initialize()
    await t_app.start()
    yield
    # 關閉時停止
    await t_app.stop()
    await t_app.shutdown()

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def index():
    return {"status": "ok", "bot": "PH_Pay_Bot"}

@app.post("/webhook")
async def webhook(request: Request):
    data = await request.json()
    update = Update.de_json(data, t_app.bot)
    await t_app.process_update(update)
    return Response(status_code=200)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
