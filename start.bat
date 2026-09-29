@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Node.js，请先安装 Node.js LTS：https://nodejs.org/
  goto :fail
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 pnpm，请在命令提示符中运行：npm install -g pnpm
  goto :fail
)

if not exist ".env.local" (
  copy ".env.local.example" ".env.local" >nul
  echo 已创建 .env.local。如需同步 Steam，请填写其中的 STEAM_API_KEY 和 STEAM_ID，保存后重新运行本脚本。
  start "" notepad ".env.local"
)

if /i "%~1"=="rebuild" (
  if exist ".next" rmdir /s /q ".next"
  set "FORCE_INSTALL=1"
)

if not exist "node_modules" set "FORCE_INSTALL=1"
if defined FORCE_INSTALL (
  echo 正在安装依赖...
  call pnpm install
  if errorlevel 1 goto :fail
  call pnpm exec next telemetry disable >nul 2>nul
)

if not exist ".next\BUILD_ID" (
  echo 正在构建，首次运行需要一两分钟...
  call pnpm build
  if errorlevel 1 goto :fail
)

echo.
echo 游戏库已启动：http://127.0.0.1:3000
echo 关闭此窗口即可停止。
echo.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:3000'"
call pnpm start
goto :eof

:fail
echo.
echo 启动失败，请查看上面的错误信息。
pause
exit /b 1
