import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=缺少登入憑證", request.url));
  }

  const { valid, userId } = verifySessionToken(token);
  if (!valid || !userId) {
    return NextResponse.redirect(
      new URL("/login?error=登入憑證無效或已過期，請重試", request.url)
    );
  }

  // 憑證合法，設定 30 天 Cookie 並導向首頁
  const response = NextResponse.redirect(new URL("/", request.url));
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
}
