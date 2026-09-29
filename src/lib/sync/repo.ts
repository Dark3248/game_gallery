import "server-only";

import { and, eq, notInArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Game, Platform } from "@/db/schema";

const { accounts, achievements, games } = schema;

export type GameInput = {
  platformGameId: string;
  title: string;
  coverUrl: string | null;
  iconUrl: string | null;
  playtimeMinutes: number;
  lastPlayedAt: Date | null;
  raw: unknown;
};

export type AchievementInput = {
  apiName: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  iconLockedUrl: string | null;
  hidden: boolean;
  unlocked: boolean;
  unlockedAt: Date | null;
  globalPercent: number | null;
};

export function upsertAccount(
  platform: Platform,
  externalId: string,
  displayName: string | null,
  authJson?: string | null,
) {
  const values = {
    platform,
    externalId,
    displayName,
    ...(authJson !== undefined ? { authJson } : {}),
  };
  getDb()
    .insert(accounts)
    .values(values)
    .onConflictDoUpdate({ target: accounts.platform, set: values })
    .run();
}

/**
 * Upserts the full library of a platform and removes games that are no longer owned.
 * Achievement counters are left untouched so they survive a library refresh.
 */
export function replaceLibrary(platform: Platform, inputs: GameInput[]): Game[] {
  const db = getDb();
  const now = new Date();

  return db.transaction((tx) => {
    for (const g of inputs) {
      const values = {
        platform,
        platformGameId: g.platformGameId,
        title: g.title,
        coverUrl: g.coverUrl,
        iconUrl: g.iconUrl,
        playtimeMinutes: g.playtimeMinutes,
        lastPlayedAt: g.lastPlayedAt,
        rawJson: JSON.stringify(g.raw),
        updatedAt: now,
      };
      tx.insert(games)
        .values(values)
        .onConflictDoUpdate({
          target: [games.platform, games.platformGameId],
          set: values,
        })
        .run();
    }

    const ids = inputs.map((g) => g.platformGameId);
    if (ids.length > 0) {
      tx.delete(games)
        .where(and(eq(games.platform, platform), notInArray(games.platformGameId, ids)))
        .run();
    }

    return tx.select().from(games).where(eq(games.platform, platform)).all();
  });
}

export function needsAchievementSync(game: Game): boolean {
  return (
    game.achievementsSyncedAt === null ||
    game.achievementsSyncedPlaytime !== game.playtimeMinutes
  );
}

export function replaceAchievements(game: Game, list: AchievementInput[]) {
  const db = getDb();
  db.transaction((tx) => {
    tx.delete(achievements).where(eq(achievements.gameId, game.id)).run();
    for (const a of list) {
      tx.insert(achievements)
        .values({ ...a, gameId: game.id })
        .onConflictDoNothing()
        .run();
    }
    tx.update(games)
      .set({
        achievementsTotal: list.length,
        achievementsUnlocked: list.filter((a) => a.unlocked).length,
        achievementsSyncedAt: new Date(),
        achievementsSyncedPlaytime: game.playtimeMinutes,
      })
      .where(eq(games.id, game.id))
      .run();
  });
}

export function touchAccountSynced(platform: Platform) {
  getDb()
    .update(accounts)
    .set({ lastSyncedAt: new Date() })
    .where(eq(accounts.platform, platform))
    .run();
}
