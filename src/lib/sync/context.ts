import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { syncRuns } = schema;

/** Reports progress of a single sync run into the sync_runs table. */
export class SyncContext {
  readonly warnings: string[] = [];

  constructor(readonly runId: number) {}

  phase(text: string, total = 0) {
    getDb()
      .update(syncRuns)
      .set({ phase: text, total, progress: 0 })
      .where(eq(syncRuns.id, this.runId))
      .run();
  }

  tick(n = 1) {
    getDb()
      .update(syncRuns)
      .set({ progress: sql`${syncRuns.progress} + ${n}` })
      .where(eq(syncRuns.id, this.runId))
      .run();
  }

  warn(text: string) {
    this.warnings.push(text);
  }
}
