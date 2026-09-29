import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const PLATFORMS = ["steam", "epic"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const accounts = sqliteTable("accounts", {
  platform: text("platform", { enum: PLATFORMS }).primaryKey(),
  externalId: text("external_id").notNull(),
  displayName: text("display_name"),
  authJson: text("auth_json"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
});

export const games = sqliteTable(
  "games",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    platform: text("platform", { enum: PLATFORMS }).notNull(),
    platformGameId: text("platform_game_id").notNull(),
    title: text("title").notNull(),
    coverUrl: text("cover_url"),
    iconUrl: text("icon_url"),
    playtimeMinutes: integer("playtime_minutes").notNull().default(0),
    lastPlayedAt: integer("last_played_at", { mode: "timestamp" }),
    achievementsTotal: integer("achievements_total").notNull().default(0),
    achievementsUnlocked: integer("achievements_unlocked").notNull().default(0),
    /** Set once achievements have been fetched at least once (even if the game has none). */
    achievementsSyncedAt: integer("achievements_synced_at", { mode: "timestamp" }),
    /** Playtime at the last achievement sync; unchanged playtime means achievements can be skipped. */
    achievementsSyncedPlaytime: integer("achievements_synced_playtime"),
    rawJson: text("raw_json"),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("games_platform_game_idx").on(t.platform, t.platformGameId),
    index("games_title_idx").on(t.title),
  ],
);

export const achievements = sqliteTable(
  "achievements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    apiName: text("api_name").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    iconLockedUrl: text("icon_locked_url"),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
    unlocked: integer("unlocked", { mode: "boolean" }).notNull().default(false),
    unlockedAt: integer("unlocked_at", { mode: "timestamp" }),
    globalPercent: real("global_percent"),
  },
  (t) => [uniqueIndex("achievements_game_api_idx").on(t.gameId, t.apiName)],
);

export const SYNC_STATUSES = ["running", "success", "error"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const syncRuns = sqliteTable(
  "sync_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    platform: text("platform", { enum: PLATFORMS }).notNull(),
    status: text("status", { enum: SYNC_STATUSES }).notNull(),
    phase: text("phase"),
    progress: integer("progress").notNull().default(0),
    total: integer("total").notNull().default(0),
    error: text("error"),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
  },
  (t) => [index("sync_runs_platform_idx").on(t.platform, t.startedAt)],
);

export type Account = typeof accounts.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
