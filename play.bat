@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Lotus Break

if /I "%~dp0"=="%TEMP%\" goto :from_zip
echo %~dp0 | findstr /I /C:"\Temp\" /C:"\AppData\Local\Temp\" >nul
if not errorlevel 1 goto :from_zip

call :find_exe
if defined GAME_EXE goto :launch

echo.
echo [play] LotusBreak.exe is missing — first launch builds the game.
echo [play] You need the .NET SDK and internet (NuGet packages).
echo.

where dotnet >nul 2>&1
if errorlevel 1 goto :no_dotnet

dotnet build "%~dp0desktop\LotusBreak.csproj" -c Release --nologo
if errorlevel 1 (
  echo.
  echo [play] Build failed. Install the .NET 10 SDK:
  echo        https://dotnet.microsoft.com/download
  echo.
  pause
  exit /b 1
)

call :find_exe
if defined GAME_EXE goto :launch

echo.
echo [play] Build succeeded, but LotusBreak.exe was not found.
echo.
pause
exit /b 1

:launch
echo [play] Start: %GAME_EXE%
start "" "%GAME_EXE%"
exit /b 0

:no_dotnet
echo [play] The "dotnet" command is not available.
echo [play] Opening the browser version — keyboard works, camera does not.
echo.

:web
echo [play] http://127.0.0.1:8080/
echo [play] Close this window to stop the server.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1" -Port 8080
if errorlevel 1 (
  echo.
  echo [play] Could not start the server.
  pause
  exit /b 1
)
exit /b 0

:from_zip
echo.
echo [play] It looks like you are running the game from inside a ZIP.
echo [play] Extract the archive to disk (Desktop or Documents),
echo        open the folder, then click play.bat.
echo.
pause
exit /b 1

:find_exe
set "GAME_EXE="
if exist "%~dp0LotusBreak.exe" (
  set "GAME_EXE=%~dp0LotusBreak.exe"
  goto :eof
)
if exist "%~dp0desktop\bin\Release\net10.0-windows\win-x64\LotusBreak.exe" (
  set "GAME_EXE=%~dp0desktop\bin\Release\net10.0-windows\win-x64\LotusBreak.exe"
  goto :eof
)
if exist "%~dp0desktop\bin\Release\net10.0-windows\win-x64\publish\LotusBreak.exe" (
  set "GAME_EXE=%~dp0desktop\bin\Release\net10.0-windows\win-x64\publish\LotusBreak.exe"
  goto :eof
)
if exist "%~dp0desktop\bin\Release\net10.0-windows\LotusBreak.exe" (
  set "GAME_EXE=%~dp0desktop\bin\Release\net10.0-windows\LotusBreak.exe"
  goto :eof
)
if exist "%~dp0desktop\bin\Release\net10.0-windows\publish\LotusBreak.exe" (
  set "GAME_EXE=%~dp0desktop\bin\Release\net10.0-windows\publish\LotusBreak.exe"
  goto :eof
)
goto :eof
