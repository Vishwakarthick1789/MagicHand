@echo off
setlocal
title MagicHand Control Panel
color 0B

:: Ensure we are in the script's directory
cd /d "%~dp0"

:menu
cls
echo =================================================================
echo             MagicHand - Secure All-Time Background Server
echo =================================================================
echo  [SECURE]: Binds to localhost (127.0.0.1), blocking outside access.
echo  [ALL-TIME]: Can run silently in background and start on PC boot.
echo =================================================================
echo.
echo   [1] Start Server (Hidden Background Mode)
echo   [2] Start Server (Interactive Console Mode)
echo   [3] Enable Auto-Start on PC Boot (Access All-Time)
echo   [4] Disable Auto-Start on PC Boot
echo   [5] Stop Background Server
echo   [6] Open App in Browser
echo   [0] Exit
echo.
set /p choice=Select an option: 

if "%choice%"=="1" goto start_hidden
if "%choice%"=="2" goto start_console
if "%choice%"=="3" goto enable_startup
if "%choice%"=="4" goto disable_startup
if "%choice%"=="5" goto stop_server
if "%choice%"=="6" goto open_browser
if "%choice%"=="0" exit
goto menu

:start_hidden
:: Stop any existing background server first
taskkill /F /IM pythonw.exe >nul 2>&1
echo [INFO] Starting server securely in the background...
start /b pythonw -m http.server 8080 --bind 127.0.0.1
echo [SUCCESS] Server is now running invisibly in the background!
timeout /t 2 >nul
goto menu

:start_console
echo [INFO] Starting interactive console server...
start "MagicHand Server" cmd /c "title MagicHand Server && echo [INFO] Server running securely. Close this window to stop. && python -m http.server 8080 --bind 127.0.0.1"
goto menu

:enable_startup
echo [INFO] Creating startup shortcut...
set "startup_folder=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "vbs_file=%temp%\create_shortcut.vbs"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%vbs_file%"
echo sLinkFile = "%startup_folder%\MagicHandServer.lnk" >> "%vbs_file%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%vbs_file%"
echo oLink.TargetPath = "pythonw.exe" >> "%vbs_file%"
echo oLink.Arguments = "-m http.server 8080 --bind 127.0.0.1" >> "%vbs_file%"
echo oLink.WorkingDirectory = "%~dp0" >> "%vbs_file%"
echo oLink.WindowStyle = 0 >> "%vbs_file%"
echo oLink.Save >> "%vbs_file%"

cscript //nologo "%vbs_file%"
del "%vbs_file%"
echo [SUCCESS] Auto-start enabled! The server will launch silently whenever you turn on your PC.
pause
goto menu

:disable_startup
set "startup_folder=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%startup_folder%\MagicHandServer.lnk" (
    del "%startup_folder%\MagicHandServer.lnk"
    echo [SUCCESS] Auto-start disabled. The server will no longer start on boot.
) else (
    echo [INFO] Auto-start is not currently enabled.
)
pause
goto menu

:stop_server
echo [INFO] Stopping background server...
taskkill /F /IM pythonw.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Background server stopped successfully.
) else (
    echo [INFO] No background server was running.
)
pause
goto menu

:open_browser
echo [INFO] Opening MagicHand in your default browser...
start http://127.0.0.1:8080/
goto menu
