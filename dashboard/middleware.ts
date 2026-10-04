import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 公開路徑：靜態資源與驗證相關 API 不阻擋
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("family_session")?.value;

  // 2. 若正在訪問登入頁
  if (pathname === "/login") {
    // 若已有 session，直接導向首頁
    if (session && session.split(".").length === 3) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 3. 其他所有頁面（受保護頁面）：檢查是否有合法 session
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const parts = session.split(".");
  if (parts.length !== 3) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const [userId, tsStr] = parts;
  const timestamp = parseInt(tsStr, 10);

  // 檢查時間戳記是否超過 30 天
  if (isNaN(timestamp) || Date.now() / 1000 - timestamp > 30 * 86400) {
    return NextResponse.redirect(new URL("/login?error=登入憑證已逾期，請重新驗證", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
