@echo off
title SupplyVault - 1-Click GitHub Uploader
color 0b
echo ========================================================
echo       SUPPLYVAULT - 1-CLICK GITHUB REPO UPLOADER
echo ========================================================
echo.

cd /d "%~dp0"

:: Check if git remote origin is already configured
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo [Step 1] Create a new empty repository at:
    echo          https://github.com/new
    echo.
    set /p REPO_URL="[Step 2] Paste your GitHub Repository URL here: "
    if "%REPO_URL%"=="" (
        echo [X] Error: No repository URL entered. Aborting.
        echo.
        pause
        exit /b 1
    )
    git remote add origin %REPO_URL%
) else (
    echo [*] Using linked GitHub repository:
    git remote get-url origin
    echo.
)

echo [*] Staging all files...
git add .

echo [*] Checking commit status...
git commit -m "SupplyVault: Full luxury enterprise supply chain management platform" >nul 2>&1

echo [*] Pushing all files to GitHub (main branch)...
git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   SUCCESS! All files uploaded to GitHub successfully!
    echo ========================================================
) else (
    echo.
    echo [!] Push encountered an issue. If GitHub prompted you to sign in,
    echo     complete the browser authorization and run this again.
)

echo.
pause
