// ── 格式化工具 ────────────────────────────────────────────

export function fmtMoney(n: number): string {
  return `NT$${Math.round(n).toLocaleString("zh-TW")}`;
}

export function fmtWan(n: number): string {
  const wan = n / 10000;
  if (Math.abs(wan) >= 10000) {
    return `${(wan / 10000).toFixed(0)}億`;
  }
  return `${wan.toFixed(wan >= 100 ? 0 : 1)}萬`;
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export function fmtPctChange(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(2)}%`;
}

export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// 取得過去 N 個已完成月份的起始日 (不含本月)
export function pastMonthsStart(lookback: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - lookback, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function currentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * 計算兩個日期相差的月份數
 * 常用於估算剩餘還款期數
 */
export function diffInMonths(startStr: string | Date, endStr: string | Date): number {
  try {
    const start = typeof startStr === "string" ? new Date(startStr) : startStr;
    const end = typeof endStr === "string" ? new Date(endStr) : endStr;
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    const total = yearDiff * 12 + monthDiff;
    
    // 如果今天還沒到那個月的日期，可以減少一個月，或者直接用整月計。
    // 這邊採用簡單估算：只要年份和月份有差就計算。
    return Math.max(0, total);
  } catch (e) {
    return 0;
  }
}
