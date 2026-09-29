"use client";

import { useState } from "react";
import { EyeOff, Lock, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Achievement } from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | "unlocked" | "locked";

function Rarity({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  const rare = percent < 10;
  return (
    <Badge
      variant="outline"
      className={cn("tabular-nums", rare && "border-amber-500/40 text-amber-400")}
    >
      {rare ? "稀有 · " : ""}
      {percent < 1 ? percent.toFixed(2) : percent.toFixed(1)}% 玩家解锁
    </Badge>
  );
}

function sortAchievements(list: Achievement[]) {
  const unlocked = list
    .filter((a) => a.unlocked)
    .sort((a, b) => (b.unlockedAt?.getTime() ?? 0) - (a.unlockedAt?.getTime() ?? 0));
  const locked = list
    .filter((a) => !a.unlocked)
    .sort((a, b) => (b.globalPercent ?? -1) - (a.globalPercent ?? -1));
  return { unlocked, locked };
}

function AchievementRow({ a }: { a: Achievement }) {
  const [reveal, setReveal] = useState(false);
  const concealed = a.hidden && !a.unlocked && !reveal;
  const icon = a.unlocked ? a.iconUrl : (a.iconLockedUrl ?? a.iconUrl);

  return (
    <li className={cn("flex items-center gap-4 rounded-xl bg-card p-3 ring-1 ring-foreground/10", !a.unlocked && "opacity-70")}>
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote CDN icon
          <img
            src={icon}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className={cn("size-full object-cover", !a.unlocked && !a.iconLockedUrl && "grayscale")}
          />
        ) : a.unlocked ? (
          <Trophy className="absolute inset-0 m-auto size-5 text-amber-400" />
        ) : (
          <Lock className="absolute inset-0 m-auto size-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("font-medium", concealed && "blur-sm select-none")}>{a.name}</span>
          {a.hidden && !a.unlocked && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <EyeOff className="size-3" />
              {reveal ? "隐藏" : "隐藏成就，点击显示"}
            </button>
          )}
        </div>
        {a.description && (
          <p className={cn("text-sm text-muted-foreground", concealed && "blur-sm select-none")}>
            {a.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Rarity percent={a.globalPercent} />
          {a.unlocked && (
            <span className="text-xs text-muted-foreground">
              {a.unlockedAt ? `解锁于 ${formatDateTime(a.unlockedAt)}` : "已解锁"}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export function AchievementList({ achievements }: { achievements: Achievement[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const { unlocked, locked } = sortAchievements(achievements);
  const shown = filter === "unlocked" ? unlocked : filter === "locked" ? locked : [...unlocked, ...locked];

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">全部 {achievements.length}</TabsTrigger>
          <TabsTrigger value="unlocked">已解锁 {unlocked.length}</TabsTrigger>
          <TabsTrigger value="locked">未解锁 {locked.length}</TabsTrigger>
        </TabsList>
      </Tabs>
      <ul className="grid gap-3 lg:grid-cols-2">
        {shown.map((a) => (
          <AchievementRow key={a.id} a={a} />
        ))}
      </ul>
    </div>
  );
}
