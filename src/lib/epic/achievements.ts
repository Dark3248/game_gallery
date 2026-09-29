import "server-only";

import { z } from "zod";
import { requestJson } from "@/lib/http";
import type { EpicToken } from "./auth";
import { EPIC_USER_AGENT } from "./client";

// store.epicgames.com sits behind a Cloudflare challenge; the launcher host does not.
const GRAPHQL = "https://launcher.store.epicgames.com/graphql";

export class EpicGraphqlUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EpicGraphqlUnavailableError";
  }
}

async function graphql<S extends z.ZodType>(
  query: string,
  variables: Record<string, string>,
  schema: S,
  token?: EpicToken,
): Promise<z.infer<S>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": EPIC_USER_AGENT,
  };
  if (token) headers.Authorization = `bearer ${token.access_token}`;
  try {
    return await requestJson(GRAPHQL, schema, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      retries: 2,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new EpicGraphqlUnavailableError(reason);
  }
}

const DEFINITIONS_QUERY = `query Achievement($sandboxId: String!, $locale: String!) {
  Achievement {
    productAchievementsRecordBySandbox(sandboxId: $sandboxId, locale: $locale) {
      productId
      totalAchievements
      achievements {
        achievement {
          name
          hidden
          unlockedDisplayName
          lockedDisplayName
          unlockedDescription
          lockedDescription
          unlockedIconLink
          lockedIconLink
          rarity { percent }
        }
      }
    }
  }
}`;

const definitionSchema = z.object({
  name: z.string(),
  hidden: z.boolean().nullish(),
  unlockedDisplayName: z.string().nullish(),
  lockedDisplayName: z.string().nullish(),
  unlockedDescription: z.string().nullish(),
  lockedDescription: z.string().nullish(),
  unlockedIconLink: z.string().nullish(),
  lockedIconLink: z.string().nullish(),
  rarity: z.object({ percent: z.number().nullish() }).nullish(),
});
export type EpicAchievementDefinition = z.infer<typeof definitionSchema>;

const definitionsResponseSchema = z.object({
  data: z.object({
    Achievement: z.object({
      productAchievementsRecordBySandbox: z
        .object({
          productId: z.string().nullish(),
          achievements: z.array(z.object({ achievement: definitionSchema })).nullish(),
        })
        .nullish(),
    }),
  }),
});

export async function getAchievementDefinitions(sandboxId: string) {
  const res = await graphql(
    DEFINITIONS_QUERY,
    { sandboxId, locale: "zh-CN" },
    definitionsResponseSchema,
  );
  const record = res.data.Achievement.productAchievementsRecordBySandbox;
  return {
    productId: record?.productId ?? null,
    definitions: (record?.achievements ?? []).map((a) => a.achievement),
  };
}

const PLAYER_QUERY = `query PlayerProfileAchievementsByProductId($epicAccountId: String!, $productId: String!) {
  PlayerProfile {
    playerProfile(epicAccountId: $epicAccountId) {
      productAchievements(productId: $productId) {
        __typename
        ... on PlayerProductAchievementsResponseSuccess {
          data {
            playerAchievements {
              playerAchievement { achievementName unlocked unlockDate }
            }
          }
        }
      }
    }
  }
}`;

const playerResponseSchema = z.object({
  data: z
    .object({
      PlayerProfile: z
        .object({
          playerProfile: z
            .object({
              productAchievements: z
                .object({
                  __typename: z.string(),
                  data: z
                    .object({
                      playerAchievements: z
                        .array(
                          z.object({
                            playerAchievement: z.object({
                              achievementName: z.string(),
                              unlocked: z.boolean().nullish(),
                              unlockDate: z.string().nullish(),
                            }),
                          }),
                        )
                        .nullish(),
                    })
                    .nullish(),
                })
                .nullish(),
            })
            .nullish(),
        })
        .nullish(),
    })
    .nullish(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

export type EpicPlayerAchievement = { unlocked: boolean; unlockedAt: Date | null };

export async function getPlayerAchievements(
  token: EpicToken,
  productId: string,
): Promise<Map<string, EpicPlayerAchievement>> {
  const res = await graphql(
    PLAYER_QUERY,
    { epicAccountId: token.account_id, productId },
    playerResponseSchema,
    token,
  );
  const product = res.data?.PlayerProfile?.playerProfile?.productAchievements;
  if (!product) {
    const message = res.errors?.map((e) => e.message).join("; ") || "没有返回玩家成就";
    throw new Error(message);
  }

  const map = new Map<string, EpicPlayerAchievement>();
  for (const { playerAchievement: p } of product.data?.playerAchievements ?? []) {
    map.set(p.achievementName, {
      unlocked: p.unlocked ?? false,
      unlockedAt: p.unlockDate ? new Date(p.unlockDate) : null,
    });
  }
  return map;
}
