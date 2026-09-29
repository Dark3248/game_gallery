import type { Platform } from "@/db/schema";

const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

type CoverGame = {
  platform: Platform;
  platformGameId: string;
  coverUrl: string | null;
  iconUrl?: string | null;
};

/** Tall cover first, then wide fallbacks. */
export function coverSources(game: CoverGame): (string | null)[] {
  if (game.platform === "steam") {
    return [game.coverUrl, `${STEAM_CDN}/${game.platformGameId}/header.jpg`];
  }
  return [game.coverUrl, game.iconUrl ?? null];
}

/** Wide banner for the detail page header. */
export function bannerSources(game: CoverGame): (string | null)[] {
  if (game.platform === "steam") {
    return [
      `${STEAM_CDN}/${game.platformGameId}/library_hero.jpg`,
      `${STEAM_CDN}/${game.platformGameId}/header.jpg`,
    ];
  }
  return [game.coverUrl];
}
