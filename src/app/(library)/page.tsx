import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { GameGrid, GameList } from "@/components/library/game-grid";
import { Button } from "@/components/ui/button";
import { PLATFORMS, type Platform } from "@/db/schema";
import { formatHours } from "@/lib/format";
import { listGames, SORTS, type Sort } from "@/lib/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const platform = pick<Platform>(params.platform, PLATFORMS);
  const sort = pick<Sort>(params.sort, SORTS) ?? "playtime";
  const view = params.view === "list" ? "list" : "grid";

  const games = listGames({ q: q || undefined, platform, sort });
  const totalMinutes = games.reduce((sum, g) => sum + g.playtimeMinutes, 0);
  const libraryEmpty = games.length === 0 && !q && !platform;

  if (libraryEmpty) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
        <Gamepad2 className="size-10 text-muted-foreground" />
        <div>
          <p className="font-medium">游戏库还是空的</p>
          <p className="text-sm text-muted-foreground">先去设置页连接 Steam 或 Epic 账户并同步。</p>
        </div>
        <Button asChild>
          <Link href="/settings">前往设置</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {games.length} 款游戏 · 共 {formatHours(totalMinutes)} 小时
      </p>
      {games.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">没有符合条件的游戏</p>
      ) : view === "list" ? (
        <GameList games={games} />
      ) : (
        <GameGrid games={games} />
      )}
    </div>
  );
}
