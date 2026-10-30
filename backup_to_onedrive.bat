@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup_to_onedrive.ps1"
if %ERRORLEVEL% NEQ 0 (
    pause
)
