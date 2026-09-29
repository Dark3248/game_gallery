import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompletionChart, PlatformPie, TopPlaytimeChart } from "@/components/stats/charts";
import { completionPercent, formatHours } from "@/lib/format";
import { getStats } from "@/lib/queries";

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardHeader>
      {hint && <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>}
    </Card>
  );
}

export default function StatsPage() {
  const s = getStats();
  const unlockedPct = completionPercent(s.achievementsUnlocked, s.achievementsTotal);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">统计</h1>
        <p className="text-sm text-muted-foreground">基于最近一次同步的数据。</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric
          label="游戏总数"
          value={s.totalGames.toLocaleString("zh-CN")}
          hint={`Steam ${s.byPlatform.steam.games} · Epic ${s.byPlatform.epic.games}`}
        />
        <Metric
          label="总游玩时长"
          value={`${formatHours(s.totalMinutes)} 小时`}
          hint={`约 ${Math.round(s.totalMinutes / 60 / 24).toLocaleString("zh-CN")} 天`}
        />
        <Metric
          label="买了没玩"
          value={s.unplayed.toLocaleString("zh-CN")}
          hint={s.totalGames > 0 ? `占 ${Math.round((s.unplayed / s.totalGames) * 100)}%` : undefined}
        />
        <Metric
          label="已解锁成就"
          value={`${s.achievementsUnlocked.toLocaleString("zh-CN")} / ${s.achievementsTotal.toLocaleString("zh-CN")}`}
          hint={`${unlockedPct}% · ${s.perfect} 款游戏全成就`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>游戏数量占比</CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformPie
              unit="款"
              data={[
                { name: "Steam", value: s.byPlatform.steam.games },
                { name: "Epic", value: s.byPlatform.epic.games },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>游玩时长占比</CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformPie
              unit="小时"
              data={[
                { name: "Steam", value: Math.round(s.byPlatform.steam.minutes / 60) },
                { name: "Epic", value: Math.round(s.byPlatform.epic.minutes / 60) },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>游玩时长 Top 10</CardTitle>
        </CardHeader>
        <CardContent>
          <TopPlaytimeChart
            data={s.top.map((g) => ({ title: g.title, hours: Math.round((g.playtimeMinutes / 60) * 10) / 10 }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>成就完成度分布</CardTitle>
          <CardDescription>只统计有成就的游戏</CardDescription>
        </CardHeader>
        <CardContent>
          <CompletionChart data={s.completionBuckets} />
        </CardContent>
      </Card>
    </div>
  );
}
