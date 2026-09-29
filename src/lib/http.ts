import "server-only";

import type { z } from "zod";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const SECRET_PARAMS = /([?&](?:key|access_token|refresh_token|code)=)[^&]*/gi;

export function redactUrl(url: string): string {
  return url.replace(SECRET_PARAMS, "$1***");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(status: number) {
  return status === 429 || status >= 500;
}

type RequestOptions = RequestInit & {
  retries?: number;
  timeoutMs?: number;
};

export async function request(url: string, options: RequestOptions = {}): Promise<Response> {
  const { retries = 3, timeoutMs = 30_000, ...init } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
    try {
      const res = await fetch(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return res;

      const body = await res.text().catch(() => "");
      const error = new HttpError(
        `HTTP ${res.status} ${redactUrl(url)}`,
        res.status,
        body.slice(0, 2000),
      );
      if (!isRetryable(res.status)) throw error;
      lastError = error;
    } catch (err) {
      if (err instanceof HttpError && !isRetryable(err.status)) throw err;
      lastError = err;
    }
  }

  if (lastError instanceof HttpError) throw lastError;
  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`请求失败 ${redactUrl(url)}：${reason}`);
}

export async function requestJson<S extends z.ZodType>(
  url: string,
  schema: S,
  options?: RequestOptions,
): Promise<z.infer<S>> {
  const res = await request(url, options);
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(`返回内容不是 JSON：${redactUrl(url)}`, res.status, text.slice(0, 2000));
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`返回数据格式不符合预期：${redactUrl(url)}：${parsed.error.message}`);
  }
  return parsed.data;
}
