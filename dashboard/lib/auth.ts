import crypto from "crypto";

export const ALLOWED_USER_IDS = (
  process.env.ALLOWED_USER_IDS || "5725029188,8514343851"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.TELEGRAM_TOKEN ||
  "";

export const AUTH_SECRET =
  process.env.AUTH_SECRET || "couple_wealth_family_secret_key_2026_xyz";

export const BACKUP_PIN = process.env.FAMILY_PIN || "5201314";

/**
 * 驗證來自 Telegram Login Widget 的回傳資料
 */
export function verifyTelegramAuth(data: Record<string, string>): {
  valid: boolean;
  user?: { id: string; first_name?: string; username?: string };
  reason?: string;
} {
  if (!BOT_TOKEN) {
    return { valid: false, reason: "伺服器未設定 TELEGRAM_BOT_TOKEN 環境變數" };
  }

  const { hash, ...rest } = data;
  if (!hash) {
    return { valid: false, reason: "缺少驗證 Hash" };
  }

  // 1. 檢查授權時間是否超過 24 小時
  const authDate = parseInt(rest.auth_date, 10);
  if (isNaN(authDate) || Date.now() / 1000 - authDate > 86400) {
    return { valid: false, reason: "授權過期，請重新嘗試" };
  }

  // 2. 字母排序組成校驗字串
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");

  // 3. 計算 Secret Key = SHA256(bot_token)
  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();

  // 4. 計算 HMAC-SHA256
  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  if (hmac !== hash) {
    return { valid: false, reason: "簽名校驗失敗，非 Telegram 官方請求" };
  }

  // 5. 檢查是否在夫妻白名單內
  const userId = String(rest.id);
  if (!ALLOWED_USER_IDS.includes(userId)) {
    return {
      valid: false,
      reason: `未獲授權的 Telegram ID (${userId})，非家庭成員`,
    };
  }

  return {
    valid: true,
    user: {
      id: userId,
      first_name: rest.first_name,
      username: rest.username,
    },
  };
}

/**
 * 建立 30 天效期的安全 Session Token (格式: userId.timestamp.signature)
 */
export function createSessionToken(userId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const data = `${userId}.${timestamp}`;
  const sig = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(data)
    .digest("hex");
  return `${data}.${sig}`;
}

/**
 * 驗證 Session Token
 */
export function verifySessionToken(token: string): {
  valid: boolean;
  userId?: string;
} {
  if (!token) return { valid: false };
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };

  const [userId, tsStr, sig] = parts;
  const timestamp = parseInt(tsStr, 10);

  // 30 天效期
  if (isNaN(timestamp) || Date.now() / 1000 - timestamp > 30 * 86400) {
    return { valid: false };
  }

  const expectedSig = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${userId}.${timestamp}`)
    .digest("hex");

  if (expectedSig !== sig) return { valid: false };
  if (!ALLOWED_USER_IDS.includes(userId)) return { valid: false };

  return { valid: true, userId };
}
