import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { HttpError, requestJson } from "@/lib/http";
import { upsertAccount } from "@/lib/sync/repo";

// Public client credentials of the Epic Games Launcher (same as Legendary / Heroic).
const CLIENT_ID = "34a02cf8f4414e29b15921876da36f9a";
const CLIENT_SECRET = "daafbccc737745039dffe53d94fc76cf";
const TOKEN_URL =
  "https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token";

export const EPIC_LOGIN_URL = `https://www.epicgames.com/id/login?redirectUrl=${encodeURIComponent(
  `https://www.epicgames.com/id/api/redirect?clientId=${CLIENT_ID}&responseType=code`,
)}`;

const tokenSchema = z.object({
  access_token: z.string(),
  expires_at: z.string(),
  refresh_token: z.string(),
  refresh_expires_at: z.string(),
  account_id: z.string(),
  displayName: z.string().optional(),
});
export type EpicToken = z.infer<typeof tokenSchema>;

export class EpicAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EpicAuthError";
  }
}

async function requestToken(params: Record<string, string>): Promise<EpicToken> {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  return requestJson(TOKEN_URL, tokenSchema, {
    method: "POST",
    headers: {
      Authorization: `basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ ...params, token_type: "eg1" }).toString(),
    retries: 1,
  });
}

/** Accepts either the bare code or the whole JSON shown by Epic's redirect page. */
export function extractAuthorizationCode(input: string): string {
  const text = input.trim();
  const match = text.match(/"authorizationCode"\s*:\s*"([0-9a-f]+)"/i);
  if (match) return match[1];
  if (/^[0-9a-f]{32}$/i.test(text)) return text;
  throw new EpicAuthError("无法识别授权码，请粘贴 Epic 页面返回的 authorizationCode（32 位字符）");
}

function saveToken(token: EpicToken) {
  upsertAccount("epic", token.account_id, token.displayName ?? null, JSON.stringify(token));
}

function loadToken(): EpicToken | null {
  const row = getDb()
    .select({ authJson: schema.accounts.authJson })
    .from(schema.accounts)
    .where(eq(schema.accounts.platform, "epic"))
    .get();
  if (!row?.authJson) return null;
  const parsed = tokenSchema.safeParse(JSON.parse(row.authJson));
  return parsed.success ? parsed.data : null;
}

export function isEpicLoggedIn(): boolean {
  return loadToken() !== null;
}

export async function loginWithAuthorizationCode(input: string) {
  const code = extractAuthorizationCode(input);
  try {
    const token = await requestToken({ grant_type: "authorization_code", code });
    saveToken(token);
    return { accountId: token.account_id, displayName: token.displayName ?? null };
  } catch (err) {
    if (err instanceof HttpError && err.status < 500) {
      throw new EpicAuthError("授权码无效或已过期（授权码只能使用一次，几分钟内有效），请重新获取");
    }
    throw err;
  }
}

/** Removes the stored token. Games already synced stay in the library. */
export function logoutEpic() {
  getDb()
    .update(schema.accounts)
    .set({ authJson: null })
    .where(eq(schema.accounts.platform, "epic"))
    .run();
}

const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

export async function getValidEpicToken(): Promise<EpicToken> {
  const token = loadToken();
  if (!token) throw new EpicAuthError("尚未登录 Epic，请先在设置页登录");

  if (Date.parse(token.expires_at) - Date.now() > EXPIRY_MARGIN_MS) return token;

  if (Date.parse(token.refresh_expires_at) <= Date.now()) {
    logoutEpic();
    throw new EpicAuthError("Epic 登录已过期，请在设置页重新登录");
  }

  try {
    const fresh = await requestToken({
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    });
    saveToken(fresh);
    return fresh;
  } catch (err) {
    if (err instanceof HttpError && err.status < 500) {
      logoutEpic();
      throw new EpicAuthError("Epic 登录已失效，请在设置页重新登录");
    }
    throw err;
  }
}
