"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Gamepad2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "游戏库", icon: Gamepad2 },
  { href: "/stats", label: "统计", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight">
          我的游戏库
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" || pathname.startsWith("/games") : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  active && "bg-muted text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
