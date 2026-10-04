"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ShieldCheck, KeyRound, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [showPinInput, setShowPinInput] = useState(false);
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
    // 動態載入 Telegram Login Widget 官方腳本
    if (containerRef.current && containerRef.current.children.length === 0) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", "PH_pay_bot");
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "12");
      script.setAttribute("data-auth-url", "/api/auth/telegram");
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

        <div className="relative glass-card border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Logo 與標題 */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 shadow-inner mb-2">
              <span className="text-2xl">💎</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Family Wealth Manager
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              私人家庭財務辦公室 · 安全認證存取
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

          {/* 主要登入方式：Telegram Login Widget */}
          <div className="space-y-3 pt-2 text-center">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
              點擊以 Telegram 驗證登入
            </p>
            <div
              ref={containerRef}
              className="flex justify-center min-h-[44px] items-center"
            >
              {/* Telegram Widget Script 自動載入於此 */}
            </div>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-zinc-950 px-3 text-zinc-600">OR</span>
            </div>
          </div>

          {/* 備援方式：家庭 PIN 碼 */}
          <div>
            {!showPinInput ? (
              <button
                type="button"
                onClick={() => setShowPinInput(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all flex items-center justify-center gap-2"
              >
                <KeyRound size={14} />
                使用家庭備援 PIN 碼登入
              </button>
            ) : (
              <form onSubmit={handlePinSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="password"
                    placeholder="輸入專屬 PIN 碼..."
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    autoFocus
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loadingPin || !pin}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1"
                  >
                    <span>{loadingPin ? "驗證中" : "進入"}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
                <div className="flex justify-between items-center text-[10px] text-zinc-500 px-1">
                  <span>預設 PIN 碼: 5201314</span>
                  <button
                    type="button"
                    onClick={() => setShowPinInput(false)}
                    className="text-zinc-400 hover:text-zinc-200 underline"
                  >
                    返回
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 底部小字 */}
          <div className="pt-2 text-center text-[10px] text-zinc-700 flex items-center justify-center gap-1.5">
            <Lock size={10} />
            <span>30 天免重複驗證 · 端到端安全簽名保護</span>
          </div>
        </div>
      </div>
    </div>
  );
}
