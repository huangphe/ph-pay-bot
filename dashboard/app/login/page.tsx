"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ShieldCheck, KeyRound, AlertCircle, ArrowRight, ExternalLink, Send } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [loadingPin, setLoadingPin] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      setError(decodeURIComponent(err));
    }
  }, [searchParams]);

  useEffect(() => {
    // 動態載入 Telegram Login Widget 官方腳本 (使用絕對 URL)
    if (containerRef.current && containerRef.current.children.length === 0) {
      const authUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/api/auth/telegram`
        : "/api/auth/telegram";

      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", "PH_pay_bot");
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "12");
      script.setAttribute("data-auth-url", authUrl);
      script.setAttribute("data-request-access", "write");
      script.async = true;
      containerRef.current.appendChild(script);
    }
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setLoadingPin(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "PIN 碼錯誤");
      }
    } catch {
      setError("網路連線失敗，請稍後再試");
    } finally {
      setLoadingPin(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md">
        {/* 背景光暈效果 */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative glass-card border border-white/10 rounded-2xl p-7 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Logo 與標題 */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 shadow-inner mb-2">
              <span className="text-2xl">💎</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Family Wealth Manager
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              私人家庭財務辦公室 · 專屬安全存取
            </p>
          </div>

          {/* 授權說明標籤 */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <ShieldCheck size={20} className="text-brand-400 shrink-0" />
            <div className="text-xs">
              <span className="text-zinc-300 font-bold">受保護的私密環境</span>
              <p className="text-zinc-500 text-[11px] mt-0.5">
                僅限 <span className="text-brand-400 font-mono">@HAO</span> 與{" "}
                <span className="text-brand-400 font-mono">@WU</span> 帳號登入
              </p>
            </div>
          </div>

          {/* 錯誤訊息提醒 */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 登入方式 1：家庭專屬 PIN 碼 (最快、最直接) */}
          <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
              <KeyRound size={15} className="text-brand-400" />
              <span>以家庭 PIN 碼快速登入</span>
            </div>
            <form onSubmit={handlePinSubmit} className="space-y-2.5">
              <div className="relative">
                <input
                  type="password"
                  placeholder="輸入專屬 PIN 碼 (預設: 5201314)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  autoFocus
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-400 font-mono"
                />
                <button
                  type="submit"
                  disabled={loadingPin || !pin}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 shadow-md"
                >
                  <span>{loadingPin ? "驗證中" : "進入"}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                💡 忘記密碼？預設 PIN 碼為 <span className="text-zinc-400 font-mono font-bold">5201314</span>
              </p>
            </form>
          </div>

          {/* 登入方式 2：Telegram Bot 免密碼一鍵直連 */}
          <div className="space-y-2.5 bg-sky-500/[0.03] border border-sky-500/10 rounded-xl p-4 text-center">
            <div className="flex items-center justify-between text-xs font-bold text-sky-400">
              <div className="flex items-center gap-1.5">
                <Send size={14} />
                <span>從 Telegram Bot 一鍵登入</span>
              </div>
              <span className="text-[10px] text-sky-500/80 bg-sky-500/10 px-2 py-0.5 rounded-full font-mono">
                免打密碼
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 text-left leading-relaxed">
              在 Telegram 對話中點擊底部選單的 <span className="text-zinc-200 font-bold">「🌐 開啟儀表板」</span>，即可自動透過加密憑證秒登入！
            </p>
            <a
              href="https://t.me/PH_pay_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all shadow-sm"
            >
              <span>前往 @PH_pay_bot 對話</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* 登入方式 3：Telegram 官方 Widget 授權 */}
          <div className="space-y-3 pt-1 text-center">
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-zinc-950 px-3 text-zinc-600">Telegram 官方小工具</span>
              </div>
            </div>

            <div
              ref={containerRef}
              className="flex justify-center min-h-[44px] items-center"
            >
              {/* Telegram Widget Script 自動載入於此 */}
            </div>

            <p className="text-[10px] text-zinc-600 leading-normal px-2">
              ⚠️ 若此處未出現藍色 Telegram 授權按鈕，代表尚未向 <span className="text-zinc-400">@BotFather</span> 輸入 <code className="text-brand-400 font-mono">/setdomain</code> 綁定此網站網域，請優先使用上方 PIN 碼或 Bot 登入。
            </p>
          </div>

          {/* 底部小字 */}
          <div className="pt-1 text-center text-[10px] text-zinc-600 flex items-center justify-center gap-1.5">
            <Lock size={10} />
            <span>登入後 30 天免重複驗證 · 端到端安全加密</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-500 text-xs font-mono">
          載入登入介面中...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
