import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Platform } from "@/db/schema";

const { accounts, achievements, games } = schema;

export const SORTS = ["playtime", "recent", "completion", "name"] as const;
export type Sort = (typeof SORTS)[number];

export type LibraryFilter = {
  q?: string;
  platform?: Platform;
  sort: Sort;
};

const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });

export function listGames({ q, platform, sort }: LibraryFilter) {
  const where = and(
    platform ? eq(games.platform, platform) : undefined,
    q ? sql`instr(lower(${games.title}), lower(${q})) > 0` : undefined,
  );
  const rows = getDb()
    .select({
      id: games.id,
      platform: games.platform,
      title: games.title,
      coverUrl: games.coverUrl,
      iconUrl: games.iconUrl,
      platformGameId: games.platformGameId,
      playtimeMinutes: games.playtimeMinutes,
      lastPlayedAt: games.lastPlayedAt,
      achievementsTotal: games.achievementsTotal,
      achievementsUnlocked: games.achievementsUnlocked,
    })
    .from(games)
    .where(where)
    .all();

  const ratio = (g: (typeof rows)[number]) =>
    g.achievementsTotal > 0 ? g.achievementsUnlocked / g.achievementsTotal : -1;

  const compare: Record<Sort, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
    playtime: (a, b) => b.playtimeMinutes - a.playtimeMinutes,
    recent: (a, b) => (b.lastPlayedAt?.getTime() ?? 0) - (a.lastPlayedAt?.getTime() ?? 0),
    completion: (a, b) => ratio(b) - ratio(a),
    name: () => 0,
  };

  return rows.sort((a, b) => compare[sort](a, b) || collator.compare(a.title, b.title));
}
export type LibraryGame = ReturnType<typeof listGames>[number];

export function getGame(id: number) {
  const db = getDb();
  const game = db.select().from(games).where(eq(games.id, id)).get();
  if (!game) return null;
  const list = db
    .select()
    .from(achievements)
    .where(eq(achievements.gameId, id))
    .orderBy(asc(achievements.id))
    .all();
  return { game, achievements: list };
}

export function getAccounts() {
  const rows = getDb().select().from(accounts).all();
  return Object.fromEntries(rows.map((r) => [r.platform, r])) as Partial<
    Record<Platform, (typeof rows)[number]>
  >;
}

export function countGamesByPlatform(): Record<Platform, number> {
  const rows = getDb()
    .select({ platform: games.platform, count: sql<number>`count(*)` })
    .from(games)
    .groupBy(games.platform)
    .all();
  const result: Record<Platform, number> = { steam: 0, epic: 0 };
  for (const r of rows) result[r.platform] = r.count;
  return result;
}

export function getStats() {
  const all = getDb()
    .select({
      id: games.id,
      title: games.title,
      platform: games.platform,
      playtimeMinutes: games.playtimeMinutes,
      achievementsTotal: games.achievementsTotal,
      achievementsUnlocked: games.achievementsUnlocked,
    })
    .from(games)
    .all();

  const byPlatform = { steam: { games: 0, minutes: 0 }, epic: { games: 0, minutes: 0 } };
  let totalMinutes = 0;
  let unplayed = 0;
  let achievementsTotal = 0;
  let achievementsUnlocked = 0;
  let perfect = 0;

  // Buckets: 0%, 1-24%, 25-49%, 50-74%, 75-99%, 100%
  const buckets = [0, 0, 0, 0, 0, 0];

  for (const g of all) {
    totalMinutes += g.playtimeMinutes;
    byPlatform[g.platform].games++;
    byPlatform[g.platform].minutes += g.playtimeMinutes;
    if (g.playtimeMinutes === 0) unplayed++;
    if (g.achievementsTotal > 0) {
      achievementsTotal += g.achievementsTotal;
      achievementsUnlocked += g.achievementsUnlocked;
      const pct = (g.achievementsUnlocked / g.achievementsTotal) * 100;
      if (pct === 100) perfect++;
      const idx = pct === 0 ? 0 : pct === 100 ? 5 : Math.min(4, Math.floor(pct / 25) + 1);
      buckets[idx]++;
    }
  }

  const top = [...all]
    .filter((g) => g.playtimeMinutes > 0)
    .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes)
    .slice(0, 10);

  return {
    totalGames: all.length,
    totalMinutes,
    unplayed,
    perfect,
    achievementsTotal,
    achievementsUnlocked,
    byPlatform,
    top,
    completionBuckets: ["0%", "1–24%", "25–49%", "50–74%", "75–99%", "100%"].map((label, i) => ({
      label,
      count: buckets[i],
    })),
  };
}
export type Stats = ReturnType<typeof getStats>;
