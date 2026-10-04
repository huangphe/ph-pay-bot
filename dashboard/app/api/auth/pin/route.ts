import { NextRequest, NextResponse } from "next/server";
import { BACKUP_PIN, createSessionToken, ALLOWED_USER_IDS } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin || pin.trim() !== BACKUP_PIN.trim()) {
      return NextResponse.json(
        { success: false, error: "PIN 碼不正確，請重新輸入" },
        { status: 401 }
      );
    }

    // 備援登入預設以主要成員身分授權
    const primaryId = ALLOWED_USER_IDS[0] || "5725029188";
    const token = createSessionToken(primaryId);

    const response = NextResponse.json({ success: true });
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
      { success: false, error: "系統錯誤" },
      { status: 500 }
    );
  }
}
