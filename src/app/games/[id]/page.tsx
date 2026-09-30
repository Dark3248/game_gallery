import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, History, Tag, Trophy } from "lucide-react";
import { AchievementList } from "@/components/game/achievement-list";
import { GameCover } from "@/components/game-cover";
import { CategoryPicker } from "@/components/library/category-picker";
import { PlatformBadge } from "@/components/platform-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { bannerSources, coverSources } from "@/lib/covers";
import { completionPercent, formatDate, formatDateTime, formatPlaytime } from "@/lib/format";
import { getGame, getGameCategoryIds, listCategories } from "@/lib/queries";

function storeUrl(platform: string, platformGameId: string, title: string) {
  if (platform === "steam") return `https://store.steampowered.com/app/${platformGameId}`;
  return `https://store.epicgames.com/zh-CN/browse?q=${encodeURIComponent(title)}`;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = /^\d+$/.test(id) ? getGame(Number(id)) : null;
  if (!data) notFound();
  const { game, achievements } = data;
  const pct = completionPercent(game.achievementsUnlocked, game.achievementsTotal);
  const categories = listCategories().map(({ id, name }) => ({ id, name }));
  const categoryIds = getGameCategoryIds(game.id);
  const assigned = categories.filter((c) => categoryIds.includes(c.id));

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm">
        <Link href="/">
          <ArrowLeft />
          返回游戏库
        </Link>
      </Button>

      <section className="relative overflow-hidden rounded-2xl ring-1 ring-foreground/10">
        <GameCover
          sources={bannerSources(game)}
          title=""
          className="absolute inset-0 size-full opacity-30 blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end">
          <GameCover
            sources={coverSources(game)}
            title={game.title}
            className="aspect-[2/3] w-36 shrink-0 rounded-lg shadow-2xl ring-1 ring-foreground/10 sm:w-44"
          />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <PlatformBadge platform={game.platform} />
              <h1 className="text-3xl font-semibold tracking-tight">{game.title}</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                {assigned.map((c) => (
                  <Badge key={c.id} variant="secondary" asChild>
                    <Link href={`/?category=${c.id}`}>{c.name}</Link>
                  </Badge>
                ))}
                <CategoryPicker gameId={game.id} categories={categories} selectedIds={categoryIds}>
                  <Button variant="ghost" size="xs" className="text-muted-foreground">
                    <Tag />
                    {assigned.length > 0 ? "编辑分类" : "添加分类"}
                  </Button>
                </CategoryPicker>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Stat icon={Clock} label="游玩时长" value={formatPlaytime(game.playtimeMinutes)} />
              <Stat icon={History} label="最近游玩" value={formatDate(game.lastPlayedAt)} />
              {game.achievementsTotal > 0 && (
                <Stat
                  icon={Trophy}
                  label="成就"
                  value={`${game.achievementsUnlocked} / ${game.achievementsTotal}（${pct}%）`}
                />
              )}
            </div>
            {game.achievementsTotal > 0 && (
              <Progress value={pct} className="h-2 max-w-md [&>*]:bg-amber-400" />
            )}
            <Button asChild variant="outline" size="sm">
              <a href={storeUrl(game.platform, game.platformGameId, game.title)} target="_blank" rel="noreferrer">
                <ExternalLink />
                在商店中查看
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">成就</h2>
          {game.achievementsSyncedAt && (
            <span className="text-xs text-muted-foreground">
              更新于 {formatDateTime(game.achievementsSyncedAt)}
            </span>
          )}
        </div>
        {achievements.length === 0 ? (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            {game.achievementsSyncedAt ? "这款游戏没有成就" : "尚未同步成就，请在设置页同步"}
          </p>
        ) : (
          <AchievementList achievements={achievements} />
        )}
      </section>
    </div>
  );
}
