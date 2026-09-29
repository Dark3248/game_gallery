import "server-only";

import { z } from "zod";
import { HttpError, requestJson } from "@/lib/http";

const API = "https://api.steampowered.com";
const CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

export type SteamConfig = { apiKey: string; steamId: string };

export function readSteamEnv(): { apiKey?: string; steamId?: string } {
  return {
    apiKey: process.env.STEAM_API_KEY?.trim() || undefined,
    steamId: process.env.STEAM_ID?.trim() || undefined,
  };
}

function url(path: string, params: Record<string, string | number | undefined>) {
  const u = new URL(path, API);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export function steamCoverUrl(appId: number | string) {
  return `${CDN}/${appId}/library_600x900.jpg`;
}

export function steamHeaderUrl(appId: number | string) {
  return `${CDN}/${appId}/header.jpg`;
}

export function steamIconUrl(appId: number | string, hash: string | undefined) {
  if (!hash) return null;
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`;
}

const vanitySchema = z.object({
  response: z.object({
    success: z.number(),
    steamid: z.string().optional(),
    message: z.string().optional(),
  }),
});

/** Accepts a SteamID64 or a custom profile URL name and returns the SteamID64. */
export async function resolveSteamId(apiKey: string, idOrVanity: string): Promise<string> {
  if (/^\d{17}$/.test(idOrVanity)) return idOrVanity;
  const vanity = idOrVanity.replace(/^https?:\/\/steamcommunity\.com\/id\//, "").replace(/\/$/, "");
  const data = await requestJson(
    url("/ISteamUser/ResolveVanityURL/v1/", { key: apiKey, vanityurl: vanity }),
    vanitySchema,
  );
  if (data.response.success !== 1 || !data.response.steamid) {
    throw new Error(`无法解析 STEAM_ID“${idOrVanity}”，请填写 17 位的 SteamID64`);
  }
  return data.response.steamid;
}

const summariesSchema = z.object({
  response: z.object({
    players: z.array(
      z.object({
        steamid: z.string(),
        personaname: z.string(),
        avatarfull: z.string().optional(),
      }),
    ),
  }),
});

export async function getPlayerSummary(cfg: SteamConfig) {
  const data = await requestJson(
    url("/ISteamUser/GetPlayerSummaries/v2/", { key: cfg.apiKey, steamids: cfg.steamId }),
    summariesSchema,
  );
  return data.response.players[0] ?? null;
}

const ownedGameSchema = z.object({
  appid: z.number(),
  name: z.string().optional(),
  playtime_forever: z.number().default(0),
  img_icon_url: z.string().optional(),
  rtime_last_played: z.number().optional(),
  has_community_visible_stats: z.boolean().optional(),
});
export type SteamOwnedGame = z.infer<typeof ownedGameSchema>;

const ownedGamesSchema = z.object({
  response: z.object({
    game_count: z.number().optional(),
    games: z.array(ownedGameSchema).optional(),
  }),
});

export async function getOwnedGames(cfg: SteamConfig): Promise<SteamOwnedGame[]> {
  const data = await requestJson(
    url("/IPlayerService/GetOwnedGames/v1/", {
      key: cfg.apiKey,
      steamid: cfg.steamId,
      include_appinfo: 1,
      include_played_free_games: 1,
      format: "json",
    }),
    ownedGamesSchema,
  );
  if (data.response.game_count === undefined) {
    throw new Error(
      "Steam 没有返回游戏列表。请在 Steam 个人资料的隐私设置中把“游戏详情”设为公开，并确认 STEAM_ID 正确",
    );
  }
  return data.response.games ?? [];
}

const schemaAchievement = z.object({
  name: z.string(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  hidden: z.number().optional(),
  icon: z.string().optional(),
  icongray: z.string().optional(),
});
export type SteamSchemaAchievement = z.infer<typeof schemaAchievement>;

const gameSchemaSchema = z.object({
  game: z
    .object({
      availableGameStats: z
        .object({ achievements: z.array(schemaAchievement).optional() })
        .optional(),
    })
    .optional(),
});

export async function getSchemaForGame(
  cfg: SteamConfig,
  appId: number,
): Promise<SteamSchemaAchievement[]> {
  const data = await requestJson(
    url("/ISteamUserStats/GetSchemaForGame/v2/", { key: cfg.apiKey, appid: appId, l: "schinese" }),
    gameSchemaSchema,
  );
  return data.game?.availableGameStats?.achievements ?? [];
}

const playerAchievementsSchema = z.object({
  playerstats: z.object({
    success: z.boolean().optional(),
    achievements: z
      .array(
        z.object({
          apiname: z.string(),
          achieved: z.number(),
          unlocktime: z.number().optional(),
        }),
      )
      .optional(),
  }),
});
export type SteamPlayerAchievement = NonNullable<
  z.infer<typeof playerAchievementsSchema>["playerstats"]["achievements"]
>[number];

export async function getPlayerAchievements(
  cfg: SteamConfig,
  appId: number,
): Promise<SteamPlayerAchievement[]> {
  try {
    const data = await requestJson(
      url("/ISteamUserStats/GetPlayerAchievements/v1/", {
        key: cfg.apiKey,
        steamid: cfg.steamId,
        appid: appId,
      }),
      playerAchievementsSchema,
    );
    return data.playerstats.achievements ?? [];
  } catch (err) {
    // Steam answers 400 "Requested app has no stats" for games without achievements.
    if (err instanceof HttpError && err.status === 400) return [];
    throw err;
  }
}

const globalPercentSchema = z.object({
  achievementpercentages: z.object({
    achievements: z
      .array(z.object({ name: z.string(), percent: z.coerce.number() }))
      .optional(),
  }),
});

export async function getGlobalAchievementPercentages(appId: number): Promise<Map<string, number>> {
  try {
    const data = await requestJson(
      url("/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/", { gameid: appId }),
      globalPercentSchema,
    );
    return new Map(
      (data.achievementpercentages.achievements ?? []).map((a) => [a.name, a.percent]),
    );
  } catch (err) {
    if (err instanceof HttpError && (err.status === 400 || err.status === 403)) return new Map();
    throw err;
  }
}
