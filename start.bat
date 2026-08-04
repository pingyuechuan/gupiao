@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo   A股智能终端 · Stock Terminal
echo ==========================================
echo 正在启动本地开发服务，请稍候...
echo 启动后会自动打开浏览器访问 http://localhost:5173/
echo.
npm run dev
pause
