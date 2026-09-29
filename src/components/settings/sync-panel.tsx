"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Platform, SyncRun } from "@/db/schema";
import { formatDateTime } from "@/lib/format";

// Dates arrive as ISO strings once they cross the server/client boundary via JSON.
type RunDto = Omit<SyncRun, "startedAt" | "finishedAt"> & {
  startedAt: string | Date;
  finishedAt: string | Date | null;
};

export function SyncPanel({
  platform,
  initialRun,
  disabled,
  disabledReason,
}: {
  platform: Platform;
  initialRun: RunDto | null;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [run, setRun] = useState<RunDto | null>(initialRun);
  const [requestError, setRequestError] = useState<string | null>(null);
  const running = run?.status === "running";

  const poll = useCallback(async () => {
    const res = await fetch("/api/sync/status", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as Record<Platform, RunDto | null>;
    const next = data[platform];
    setRun(next);
    if (next && next.status !== "running") router.refresh();
  }, [platform, router]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(poll, 1000);
    return () => clearInterval(timer);
  }, [running, poll]);

  async function start() {
    setRequestError(null);
    const res = await fetch(`/api/sync/${platform}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRequestError(data.error ?? `请求失败（HTTP ${res.status}）`);
      return;
    }
    setRun(data.run);
  }

  const percent = run && run.total > 0 ? Math.round((run.progress / run.total) * 100) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button onClick={start} disabled={disabled || running}>
          {running ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          {running ? "同步中…" : "立即同步"}
        </Button>
        {disabled && disabledReason && (
          <span className="text-sm text-muted-foreground">{disabledReason}</span>
        )}
      </div>

      {running && run && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{run.phase}</span>
            {percent !== null && (
              <span>
                {run.progress} / {run.total}
              </span>
            )}
          </div>
          <Progress value={percent ?? 0} className={percent === null ? "animate-pulse" : ""} />
        </div>
      )}

      {!running && run?.status === "success" && (
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          <span>
            上次同步：{formatDateTime(run.finishedAt)}，{run.phase}
          </span>
        </p>
      )}

      {!running && run?.status === "error" && (
        <p className="flex items-start gap-1.5 text-sm text-destructive">
          <XCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            同步失败（{formatDateTime(run.finishedAt)}）：{run.error}
          </span>
        </p>
      )}

      {requestError && <p className="text-sm text-destructive">{requestError}</p>}
    </div>
  );
}
