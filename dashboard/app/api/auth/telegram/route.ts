import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramAuth, createSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const data: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    data[key] = val;
  });

  const result = verifyTelegramAuth(data);

  if (!result.valid || !result.user) {
    const errorMsg = encodeURIComponent(result.reason || "登入失敗");
    return NextResponse.redirect(new URL(`/login?error=${errorMsg}`, request.url));
  }

  // 驗證成功，簽發 30 天 Cookie
  const token = createSessionToken(result.user.id);
  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set({
    name: "family_session",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 天
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = verifyTelegramAuth(body);

    if (!result.valid || !result.user) {
      return NextResponse.json(
        { success: false, error: result.reason || "驗證失敗" },
        { status: 403 }
      );
    }

    const token = createSessionToken(result.user.id);
    const response = NextResponse.json({ success: true, user: result.user });

    response.cookies.set({
      name: "family_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "處理請求失敗" },
      { status: 500 }
    );
  }
}
