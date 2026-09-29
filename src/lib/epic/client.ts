import "server-only";

import { z } from "zod";
import { requestJson } from "@/lib/http";
import type { EpicToken } from "./auth";

const LIBRARY = "https://library-service.live.use1a.on.epicgames.com/library/api/public";
const CATALOG = "https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared";

export const EPIC_USER_AGENT =
  "EpicGamesLauncher/17.2.1-44120581+++Portal+Release-Live Windows/10.0.22631.1.256.64bit";

function authHeaders(token: EpicToken) {
  return {
    Authorization: `bearer ${token.access_token}`,
    "User-Agent": EPIC_USER_AGENT,
  };
}

const libraryRecordSchema = z.object({
  namespace: z.string(),
  catalogItemId: z.string(),
  appName: z.string().optional(),
  productId: z.string().optional(),
  sandboxName: z.string().optional(),
  sandboxType: z.string().optional(),
  recordType: z.string().optional(),
  acquisitionDate: z.string().optional(),
});
export type EpicLibraryRecord = z.infer<typeof libraryRecordSchema>;

const libraryPageSchema = z.object({
  responseMetadata: z.object({ nextCursor: z.string().optional() }).optional(),
  records: z.array(libraryRecordSchema),
});

export async function getLibraryRecords(token: EpicToken): Promise<EpicLibraryRecord[]> {
  const records: EpicLibraryRecord[] = [];
  let cursor: string | undefined;
  do {
    const u = new URL(`${LIBRARY}/items`);
    u.searchParams.set("includeMetadata", "true");
    if (cursor) u.searchParams.set("cursor", cursor);
    const page = await requestJson(u.toString(), libraryPageSchema, {
      headers: authHeaders(token),
    });
    records.push(...page.records);
    cursor = page.responseMetadata?.nextCursor;
  } while (cursor);
  return records;
}

const keyImageSchema = z.object({ type: z.string(), url: z.string() });

const catalogItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  keyImages: z.array(keyImageSchema).optional(),
  categories: z.array(z.object({ path: z.string() })).optional(),
  mainGameItem: z.unknown().optional(),
  developer: z.string().optional(),
});
export type EpicCatalogItem = z.infer<typeof catalogItemSchema>;

export async function getCatalogItems(
  token: EpicToken,
  namespace: string,
  ids: string[],
): Promise<Record<string, EpicCatalogItem>> {
  const u = new URL(`${CATALOG}/namespace/${namespace}/bulk/items`);
  for (const id of ids) u.searchParams.append("id", id);
  u.searchParams.set("includeDLCDetails", "true");
  u.searchParams.set("includeMainGameDetails", "true");
  u.searchParams.set("country", "US");
  u.searchParams.set("locale", "zh-CN");
  return requestJson(u.toString(), z.record(z.string(), catalogItemSchema), {
    headers: authHeaders(token),
  });
}

export function pickKeyImage(item: EpicCatalogItem | undefined, types: string[]) {
  for (const type of types) {
    const img = item?.keyImages?.find((k) => k.type === type);
    if (img) return img.url;
  }
  return null;
}

const playtimeSchema = z.array(
  z.object({ artifactId: z.string(), totalTime: z.number() }),
);

/** Returns total playtime in seconds keyed by appName (artifactId). */
export async function getPlaytime(token: EpicToken): Promise<Map<string, number>> {
  const data = await requestJson(
    `${LIBRARY}/playtime/account/${token.account_id}/all`,
    playtimeSchema,
    { headers: authHeaders(token) },
  );
  const map = new Map<string, number>();
  for (const p of data) map.set(p.artifactId, (map.get(p.artifactId) ?? 0) + p.totalTime);
  return map;
}
