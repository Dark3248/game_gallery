import Link from "next/link";
import { Tag, Trophy } from "lucide-react";
import { GameCover } from "@/components/game-cover";
import { CategoryPicker, type CategoryOption } from "@/components/library/category-picker";
import { PlatformBadge } from "@/components/platform-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { coverSources } from "@/lib/covers";
import { completionPercent, formatDate, formatPlaytime } from "@/lib/format";
import type { LibraryGame } from "@/lib/queries";

function AchievementLine({ game }: { game: LibraryGame }) {
  if (game.achievementsTotal === 0) return null;
  const pct = completionPercent(game.achievementsUnlocked, game.achievementsTotal);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Trophy className="size-3" />
          {game.achievementsUnlocked}/{game.achievementsTotal}
        </span>
        <span>{pct}%</span>
      </div>
      <Progress value={pct} className={pct === 100 ? "[&>*]:bg-amber-400" : ""} />
    </div>
  );
}

function CategoryTags({ game, categories }: { game: LibraryGame; categories: CategoryOption[] }) {
  const names = categories.filter((c) => game.categoryIds.includes(c.id)).map((c) => c.name);
  if (names.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name) => (
        <span key={name} className="rounded bg-muted px-1.5 py-0.5 text-[0.7rem] leading-none text-muted-foreground">
          {name}
        </span>
      ))}
    </div>
  );
}

type Props = { games: LibraryGame[]; categories: CategoryOption[] };

export function GameGrid({ games, categories }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {games.map((game) => (
        <div key={game.id} className="group relative">
          <Link
            href={`/games/${game.id}`}
            className="flex h-full flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition group-hover:-translate-y-0.5 group-hover:ring-foreground/30"
          >
            <div className="relative aspect-[2/3] overflow-hidden bg-muted">
              <GameCover
                sources={coverSources(game)}
                title={game.title}
                className="size-full transition duration-300 group-hover:scale-105"
              />
              <PlatformBadge
                platform={game.platform}
                className="absolute top-2 left-2 bg-black/70 backdrop-blur"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <h3 className="line-clamp-2 text-sm leading-snug font-medium">{game.title}</h3>
              <CategoryTags game={game} categories={categories} />
              <p className="mt-auto text-xs text-muted-foreground">{formatPlaytime(game.playtimeMinutes)}</p>
              <AchievementLine game={game} />
            </div>
          </Link>
          <CategoryPicker gameId={game.id} categories={categories} selectedIds={game.categoryIds}>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="设置分类"
              className="absolute top-2 right-2 bg-black/70 text-white opacity-0 backdrop-blur transition group-hover:-translate-y-0.5 group-hover:opacity-100 hover:bg-black/90 focus-visible:opacity-100 aria-expanded:opacity-100"
            >
              <Tag />
            </Button>
          </CategoryPicker>
        </div>
      ))}
    </div>
  );
}

export function GameList({ games, categories }: Props) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">游戏</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">平台</th>
            <th className="hidden px-3 py-2 font-medium lg:table-cell">分类</th>
            <th className="px-3 py-2 text-right font-medium">时长</th>
            <th className="hidden px-3 py-2 text-right font-medium md:table-cell">最近游玩</th>
            <th className="w-40 px-3 py-2 font-medium">成就</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id} className="border-t transition-colors hover:bg-muted/40">
              <td className="px-3 py-2">
                <Link href={`/games/${game.id}`} className="flex items-center gap-3">
                  <GameCover
                    sources={[game.iconUrl, ...coverSources(game)]}
                    title=""
                    className="size-9 shrink-0 rounded"
                  />
                  <span className="line-clamp-1 font-medium hover:underline">{game.title}</span>
                </Link>
              </td>
              <td className="hidden px-3 py-2 sm:table-cell">
                <PlatformBadge platform={game.platform} />
              </td>
              <td className="hidden px-3 py-2 lg:table-cell">
                <div className="flex items-center gap-1.5">
                  <CategoryTags game={game} categories={categories} />
                  <CategoryPicker gameId={game.id} categories={categories} selectedIds={game.categoryIds}>
                    <Button variant="ghost" size="icon-xs" aria-label="设置分类" className="text-muted-foreground">
                      <Tag />
                    </Button>
                  </CategoryPicker>
                </div>
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                {formatPlaytime(game.playtimeMinutes)}
              </td>
              <td className="hidden px-3 py-2 text-right text-muted-foreground tabular-nums md:table-cell">
                {formatDate(game.lastPlayedAt)}
              </td>
              <td className="px-3 py-2">
                {game.achievementsTotal > 0 ? (
                  <AchievementLine game={game} />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
