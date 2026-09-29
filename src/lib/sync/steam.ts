import "server-only";

import pLimit from "p-limit";
import { HttpError } from "@/lib/http";
import {
  getGlobalAchievementPercentages,
  getOwnedGames,
  getPlayerAchievements,
  getPlayerSummary,
  getSchemaForGame,
  readSteamEnv,
  resolveSteamId,
  steamCoverUrl,
  steamIconUrl,
  type SteamConfig,
} from "@/lib/steam/client";
import type { SyncContext } from "./context";
import {
  needsAchievementSync,
  replaceAchievements,
  replaceLibrary,
  upsertAccount,
  type AchievementInput,
} from "./repo";

function explain(err: unknown): never {
  if (err instanceof HttpError && (err.status === 401 || err.status === 403)) {
    throw new Error("Steam 拒绝了请求，请检查 .env.local 里的 STEAM_API_KEY 是否正确");
  }
  throw err;
}

export async function syncSteam(ctx: SyncContext) {
  const env = readSteamEnv();
  if (!env.apiKey || !env.steamId) {
    throw new Error("请先在 .env.local 中配置 STEAM_API_KEY 和 STEAM_ID，然后重启应用");
  }

  ctx.phase("获取 Steam 账户信息");
  const steamId = await resolveSteamId(env.apiKey, env.steamId).catch(explain);
  const cfg: SteamConfig = { apiKey: env.apiKey, steamId };
  const player = await getPlayerSummary(cfg).catch(explain);
  upsertAccount("steam", steamId, player?.personaname ?? null);

  ctx.phase("获取游戏列表");
  const owned = await getOwnedGames(cfg).catch(explain);
  const byAppId = new Map(owned.map((g) => [String(g.appid), g]));

  const rows = replaceLibrary(
    "steam",
    owned.map((g) => ({
      platformGameId: String(g.appid),
      title: g.name ?? `App ${g.appid}`,
      coverUrl: steamCoverUrl(g.appid),
      iconUrl: steamIconUrl(g.appid, g.img_icon_url),
      playtimeMinutes: g.playtime_forever,
      lastPlayedAt: g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : null,
      raw: g,
    })),
  );

  const pending = rows.filter(needsAchievementSync);
  const withStats = pending.filter((r) => byAppId.get(r.platformGameId)?.has_community_visible_stats);
  for (const r of pending) {
    if (!byAppId.get(r.platformGameId)?.has_community_visible_stats) replaceAchievements(r, []);
  }

  ctx.phase("同步成就", withStats.length);
  const limit = pLimit(4);
  let failed = 0;

  await Promise.all(
    withStats.map((game) =>
      limit(async () => {
        try {
          const appId = Number(game.platformGameId);
          const defs = await getSchemaForGame(cfg, appId);
          if (defs.length === 0) {
            replaceAchievements(game, []);
            return;
          }
          const [mine, global] = await Promise.all([
            getPlayerAchievements(cfg, appId),
            getGlobalAchievementPercentages(appId),
          ]);
          const mineByName = new Map(mine.map((a) => [a.apiname, a]));

          const list: AchievementInput[] = defs.map((d) => {
            const p = mineByName.get(d.name);
            const unlocked = p?.achieved === 1;
            return {
              apiName: d.name,
              name: d.displayName || d.name,
              description: d.description || null,
              iconUrl: d.icon ?? null,
              iconLockedUrl: d.icongray ?? null,
              hidden: d.hidden === 1,
              unlocked,
              unlockedAt: unlocked && p?.unlocktime ? new Date(p.unlocktime * 1000) : null,
              globalPercent: global.get(d.name) ?? null,
            };
          });
          replaceAchievements(game, list);
        } catch (err) {
          failed++;
          console.warn(`[steam] 成就同步失败 ${game.title}:`, err instanceof Error ? err.message : err);
        } finally {
          ctx.tick();
        }
      }),
    ),
  );

  if (failed > 0) ctx.warn(`${failed} 个游戏的成就同步失败，下次同步时会重试`);
}
