import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PLATFORMS, type Platform, type SyncRun } from "@/db/schema";
import { SyncContext } from "./context";
import { syncEpic } from "./epic";
import { touchAccountSynced } from "./repo";
import { syncSteam } from "./steam";

const { syncRuns } = schema;

const runners: Record<Platform, (ctx: SyncContext) => Promise<void>> = {
  steam: syncSteam,
  epic: syncEpic,
};

const globalForSync = globalThis as unknown as { __gameGallerySyncs?: Set<Platform> };
const active = (globalForSync.__gameGallerySyncs ??= new Set());

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export function latestRun(platform: Platform): SyncRun | null {
  return (
    getDb()
      .select()
      .from(syncRuns)
      .where(eq(syncRuns.platform, platform))
      .orderBy(desc(syncRuns.id))
      .limit(1)
      .get() ?? null
  );
}

function finish(runId: number, values: Partial<SyncRun>) {
  getDb()
    .update(syncRuns)
    .set({ ...values, finishedAt: new Date() })
    .where(eq(syncRuns.id, runId))
    .run();
}

/** Starts a sync in the background; returns the running run if one already exists. */
export function startSync(platform: Platform): SyncRun {
  if (active.has(platform)) {
    const current = latestRun(platform);
    if (current) return current;
  }

  const run = getDb()
    .insert(syncRuns)
    .values({ platform, status: "running", phase: "准备中", startedAt: new Date() })
    .returning()
    .get();

  active.add(platform);
  const ctx = new SyncContext(run.id);

  void runners[platform](ctx)
    .then(() => {
      touchAccountSynced(platform);
      finish(run.id, {
        status: "success",
        phase: ctx.warnings.length > 0 ? `完成：${ctx.warnings.join("；")}` : "完成",
      });
    })
    .catch((err: unknown) => {
      console.error(`[sync:${platform}]`, err);
      finish(run.id, {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    })
    .finally(() => active.delete(platform));

  return run;
}

/** Runs left in "running" state by a previous process can never finish. */
export function markInterruptedRuns() {
  getDb()
    .update(syncRuns)
    .set({ status: "error", error: "同步被中断（应用已重启）", finishedAt: new Date() })
    .where(eq(syncRuns.status, "running"))
    .run();
}
