# 我的游戏库

在本机运行的个人游戏库：汇总 Steam 和 Epic 账户里的游戏、游玩时长和成就，并提供统计页面。所有数据和密钥只保存在本机，服务只监听 `127.0.0.1`。

## 在 Windows 上安装

1. 安装 [Node.js LTS](https://nodejs.org/)（64 位）。
2. 打开“命令提示符”，安装 pnpm：

   ```bat
   npm install -g pnpm
   ```

3. 把项目源码放到一个**不会被 OneDrive 同步**的目录，例如 `D:\Projects\game_gallery`。不要复制 `node_modules`、`.next` 文件夹，它们需要在 Windows 上重新生成。
4. 双击 `start.bat`。首次运行会：
   - 根据 `.env.local.example` 创建 `.env.local` 并用记事本打开；
   - 安装依赖、构建应用（需要一两分钟）；
   - 启动服务并自动打开浏览器 `http://127.0.0.1:3000`。

之后每次双击 `start.bat` 即可启动，关闭命令行窗口即停止。可以给 `start.bat` 建一个桌面快捷方式。

如果更新了源码，运行一次 `start.bat rebuild` 重新安装依赖并构建。

## 配置 Steam

1. 在 [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) 申请 Web API Key（域名随便填，例如 `localhost`）。
2. 查到自己的 SteamID64（17 位数字），例如在 [steamid.io](https://steamid.io) 输入个人资料链接查询。也可以直接填自定义 URL 名称。
3. 在 Steam 客户端“个人资料 → 编辑个人资料 → 隐私设置”中，把**游戏详情**设为“公开”。
4. 编辑 `.env.local`：

   ```ini
   STEAM_API_KEY=你的 Key
   STEAM_ID=你的 SteamID64
   ```

5. 重启应用（关闭窗口后重新运行 `start.bat`），在“设置”页点击 Steam 的“立即同步”。

## 登录 Epic

1. 在“设置”页点击“打开 Epic 登录页”，在 epicgames.com 登录。
2. 登录后页面会显示一段 JSON，复制 `authorizationCode` 的值（或整段 JSON）。
3. 粘贴到设置页的输入框并提交，然后点击 Epic 的“立即同步”。

授权码只能使用一次，几分钟内有效。之后应用会自动刷新登录状态；如果失效，按上面步骤重新登录即可。点击“退出 Epic 登录”会删除本机保存的 token，已同步的游戏数据会保留。

Epic 使用的是 Epic 启动器自己的接口（与 Legendary、Heroic 等开源启动器相同），不是官方开放接口，可能随 Epic 更新而失效。Epic 不提供“最近游玩时间”，所以 Epic 游戏不显示这一项。

## 需要代理时

如果访问 Steam 或 Epic 需要代理（例如 Clash），在 `.env.local` 中加上本地代理地址后重启：

```ini
HTTPS_PROXY=http://127.0.0.1:7897
```

## 数据与隐私

- 游戏数据和 Epic 登录 token 保存在 `%LOCALAPPDATA%\GameGallery\library.db`，只有当前 Windows 用户能访问。可以在 `.env.local` 中设置 `DATA_DIR` 改到其他目录。
- Steam API Key 保存在项目目录的 `.env.local` 中。
- `.env.local` 和数据库文件不要发给别人，也不要提交到 git（`.gitignore` 已排除）。
- 服务只监听 `127.0.0.1`，局域网内其他设备无法访问。Windows 防火墙如果询问 Node.js 的网络权限，可以直接拒绝。
- 已关闭 Next.js 的匿名遥测（`NEXT_TELEMETRY_DISABLED=1`）。

## 同步说明

- 同步由“设置”页手动触发，进度实时显示。
- Steam 首次同步会逐个获取每款游戏的成就，游戏多时需要几分钟；之后只刷新游玩时长有变化的游戏。
- 某个游戏的成就获取失败不会中断同步，下次同步时会自动重试。

## 开发

```bash
pnpm install
pnpm dev          # http://127.0.0.1:3000
pnpm typecheck
pnpm lint
pnpm db:generate  # 修改 src/db/schema.ts 后生成迁移
```

数据库迁移会在应用启动时自动执行。
