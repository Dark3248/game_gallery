import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "我的游戏库",
  description: "Steam 与 Epic 游戏库汇总",
};

// Every page reads the local SQLite database, so nothing can be prerendered at build time.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen antialiased">
        <TooltipProvider>
          <SiteNav />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
