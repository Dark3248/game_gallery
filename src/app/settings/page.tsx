import { CheckCircle2, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EpicLogin, EpicLogout } from "@/components/settings/epic-login";
import { SyncPanel } from "@/components/settings/sync-panel";
import { resolveDbPath } from "@/db";
import { EPIC_LOGIN_URL, isEpicLoggedIn } from "@/lib/epic/auth";
import { formatDateTime } from "@/lib/format";
import { countGamesByPlatform, getAccounts } from "@/lib/queries";
import { readSteamEnv } from "@/lib/steam/client";
import { latestRun } from "@/lib/sync/runner";

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      {ok ? (
        <CheckCircle2 className="size-4 text-emerald-500" />
      ) : (
        <CircleAlert className="size-4 text-amber-500" />
      )}
      {children}
    </span>
  );
}

export default function SettingsPage() {
  const steamEnv = readSteamEnv();
  const steamConfigured = Boolean(steamEnv.apiKey && steamEnv.steamId);
  const epicLoggedIn = isEpicLoggedIn();
  const accounts = getAccounts();
  const counts = countGamesByPlatform();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
        <p className="text-sm text-muted-foreground">连接账户并同步游戏数据。所有密钥只保存在本机。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Steam <Badge variant="secondary">{counts.steam} 款游戏</Badge>
          </CardTitle>
          <CardDescription>使用 Steam 官方 Web API 读取游戏、时长和成就。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Status ok={Boolean(steamEnv.apiKey)}>
              STEAM_API_KEY {steamEnv.apiKey ? "已配置" : "未配置"}
            </Status>
            <Status ok={Boolean(steamEnv.steamId)}>
              STEAM_ID {steamEnv.steamId ? `已配置（${steamEnv.steamId}）` : "未配置"}
            </Status>
            {accounts.steam && (
              <p className="text-sm text-muted-foreground">
                账户：{accounts.steam.displayName ?? accounts.steam.externalId}
                {accounts.steam.lastSyncedAt && ` · 上次成功同步 ${formatDateTime(accounts.steam.lastSyncedAt)}`}
              </p>
            )}
          </div>
          {!steamConfigured && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <p>在项目根目录创建 <code className="text-foreground">.env.local</code>（可复制 .env.local.example），填写：</p>
              <pre className="mt-2 rounded bg-muted p-3 font-mono text-xs text-foreground">
                {"STEAM_API_KEY=你的 Key\nSTEAM_ID=你的 17 位 SteamID64"}
              </pre>
              <p className="mt-2">
                API Key 在{" "}
                <a className="underline" href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer">
                  steamcommunity.com/dev/apikey
                </a>{" "}
                申请；并把 Steam 个人资料隐私设置中的“游戏详情”设为公开。保存后需要重启应用。
              </p>
            </div>
          )}
          <SyncPanel
            platform="steam"
            initialRun={latestRun("steam")}
            disabled={!steamConfigured}
            disabledReason="请先配置 STEAM_API_KEY 和 STEAM_ID"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Epic <Badge variant="secondary">{counts.epic} 款游戏</Badge>
          </CardTitle>
          <CardDescription>
            通过 Epic 启动器使用的接口读取游戏库、时长和成就（非官方接口，可能随 Epic 更新而失效）。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {epicLoggedIn ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Status ok>
                已登录：{accounts.epic?.displayName ?? accounts.epic?.externalId}
                {accounts.epic?.lastSyncedAt && (
                  <span className="text-muted-foreground">
                    {" "}· 上次成功同步 {formatDateTime(accounts.epic.lastSyncedAt)}
                  </span>
                )}
              </Status>
              <EpicLogout />
            </div>
          ) : (
            <EpicLogin loginUrl={EPIC_LOGIN_URL} />
          )}
          <SyncPanel
            platform="epic"
            initialRun={latestRun("epic")}
            disabled={!epicLoggedIn}
            disabledReason="请先登录 Epic"
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>本地数据</CardTitle>
          <CardDescription>游戏数据和 Epic 登录 token 保存在以下数据库文件中，请勿发送给他人。</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{resolveDbPath()}</code>
        </CardContent>
      </Card>
    </div>
  );
}
