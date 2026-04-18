import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Family Wealth Manager",
  description: "資產管理 · 淨資產追蹤 · 家庭收支",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>
        <div className="relative z-10 flex min-h-screen">
          <Navigation />
          <main className="flex-1 min-w-0 overflow-x-auto">
            <div className="min-w-[680px] max-w-5xl p-6 pt-24 lg:pt-8 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
