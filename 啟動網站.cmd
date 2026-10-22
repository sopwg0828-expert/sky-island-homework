@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  node serve.mjs
) else (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" serve.mjs
)
pause
