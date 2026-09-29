import "server-only";

import pLimit from "p-limit";
import {
  EpicGraphqlUnavailableError,
  getAchievementDefinitions,
  getPlayerAchievements,
} from "@/lib/epic/achievements";
import { getValidEpicToken } from "@/lib/epic/auth";
import {
  getCatalogItems,
  getLibraryRecords,
  getPlaytime,
  pickKeyImage,
  type EpicCatalogItem,
  type EpicLibraryRecord,
} from "@/lib/epic/client";
import type { Game } from "@/db/schema";
import type { SyncContext } from "./context";
import {
  needsAchievementSync,
  replaceAchievements,
  replaceLibrary,
  upsertAccount,
  type AchievementInput,
  type GameInput,
} from "./repo";

const CATALOG_BATCH = 50;

export type EpicGameRaw = EpicLibraryRecord & { developer?: string };

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function isGame(item: EpicCatalogItem | undefined): item is EpicCatalogItem {
  if (!item) return false;
  if (item.mainGameItem) return false;
  const paths = new Set(item.categories?.map((c) => c.path));
  return !paths.has("addons") || paths.has("games");
}

export async function syncEpic(ctx: SyncContext) {
  ctx.phase("刷新 Epic 登录状态");
  const token = await getValidEpicToken();
  upsertAccount("epic", token.account_id, token.displayName ?? null);

  ctx.phase("获取游戏库");
  const seen = new Set<string>();
  const records = (await getLibraryRecords(token)).filter((r) => {
    if (r.namespace === "ue" || seen.has(r.catalogItemId)) return false;
    seen.add(r.catalogItemId);
    return true;
  });

  const byNamespace = new Map<string, string[]>();
  for (const r of records) {
    const list = byNamespace.get(r.namespace) ?? [];
    list.push(r.catalogItemId);
    byNamespace.set(r.namespace, list);
  }
  const batches = [...byNamespace].flatMap(([ns, ids]) =>
    chunk(ids, CATALOG_BATCH).map((part) => [ns, part] as const),
  );

  ctx.phase("获取游戏信息", batches.length);
  const catalog = new Map<string, EpicCatalogItem>();
  const limit = pLimit(4);
  await Promise.all(
    batches.map(([ns, ids]) =>
      limit(async () => {
        try {
          const items = await getCatalogItems(token, ns, ids);
          for (const [id, item] of Object.entries(items)) catalog.set(id, item);
        } finally {
          ctx.tick();
        }
      }),
    ),
  );

  ctx.phase("获取游玩时长");
  const playtime = await getPlaytime(token);

  const inputs: GameInput[] = [];
  for (const r of records) {
    const item = catalog.get(r.catalogItemId);
    if (!isGame(item)) continue;
    const seconds = r.appName ? (playtime.get(r.appName) ?? 0) : 0;
    const raw: EpicGameRaw = { ...r, developer: item.developer };
    inputs.push({
      platformGameId: r.catalogItemId,
      title: item.title,
      coverUrl: pickKeyImage(item, ["DieselGameBoxTall", "OfferImageTall", "DieselGameBox", "Thumbnail"]),
      iconUrl: pickKeyImage(item, ["DieselGameBoxLogo", "Thumbnail", "DieselGameBox"]),
      playtimeMinutes: Math.round(seconds / 60),
      lastPlayedAt: null,
      raw,
    });
  }
  const rows = replaceLibrary("epic", inputs);

  await syncEpicAchievements(ctx, token, rows.filter(needsAchievementSync));
}

async function syncEpicAchievements(
  ctx: SyncContext,
  token: Awaited<ReturnType<typeof getValidEpicToken>>,
  pending: Game[],
) {
  ctx.phase("同步成就", pending.length);
  const limit = pLimit(2);
  let unavailable: string | null = null;
  let failed = 0;

  await Promise.all(
    pending.map((game) =>
      limit(async () => {
        try {
          if (unavailable) return;
          const raw = JSON.parse(game.rawJson ?? "{}") as EpicGameRaw;
          const { productId, definitions } = await getAchievementDefinitions(raw.namespace);
          if (definitions.length === 0) {
            replaceAchievements(game, []);
            return;
          }

          const mine = await getPlayerAchievements(token, productId ?? raw.productId ?? "");
          const list: AchievementInput[] = definitions.map((d) => {
            const p = mine.get(d.name);
            const unlocked = p?.unlocked ?? false;
            return {
              apiName: d.name,
              name: d.unlockedDisplayName || d.lockedDisplayName || d.name,
              description: d.unlockedDescription || d.lockedDescription || null,
              iconUrl: d.unlockedIconLink ?? null,
              iconLockedUrl: d.lockedIconLink ?? null,
              hidden: d.hidden ?? false,
              unlocked,
              unlockedAt: unlocked ? (p?.unlockedAt ?? null) : null,
              globalPercent: d.rarity?.percent ?? null,
            };
          });
          replaceAchievements(game, list);
        } catch (err) {
          if (err instanceof EpicGraphqlUnavailableError) {
            unavailable ??= err.message;
            return;
          }
          failed++;
          console.warn(`[epic] 成就同步失败 ${game.title}:`, err instanceof Error ? err.message : err);
        } finally {
          ctx.tick();
        }
      }),
    ),
  );

  if (unavailable) {
    console.warn("[epic] 成就接口不可用：", unavailable);
    ctx.warn("Epic 成就接口暂时不可用，已跳过成就同步（游戏库和时长不受影响）");
  } else if (failed > 0) {
    ctx.warn(`${failed} 个 Epic 游戏的成就同步失败，下次同步时会重试`);
  }
}
