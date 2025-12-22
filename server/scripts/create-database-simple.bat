@echo off
REM Simple Database Creation Script
REM Automatically finds PostgreSQL installation

echo.
echo ========================================
echo Creating PostgreSQL Database
echo ========================================
echo.

REM Try to find psql.exe in common locations
set PSQL_PATH=
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set PSQL_PATH="C:\Program Files\PostgreSQL\16\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set PSQL_PATH="C:\Program Files\PostgreSQL\15\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" set PSQL_PATH="C:\Program Files\PostgreSQL\14\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\13\bin\psql.exe" set PSQL_PATH="C:\Program Files\PostgreSQL\13\bin\psql.exe"
if exist "C:\Program Files (x86)\PostgreSQL\15\bin\psql.exe" set PSQL_PATH="C:\Program Files (x86)\PostgreSQL\15\bin\psql.exe"

REM Check if psql is in PATH
where psql >nul 2>&1
if %ERRORLEVEL% EQU 0 set PSQL_PATH=psql

REM If still not found, prompt user
if "%PSQL_PATH%"=="" (
    echo [ERROR] PostgreSQL not found!
    echo.
    echo Please provide the full path to psql.exe:
    echo Example: "C:\Program Files\PostgreSQL\15\bin\psql.exe"
    echo.
    set /p PSQL_PATH="Enter psql.exe path: "
    if "%PSQL_PATH%"=="" (
        echo [ERROR] No path provided. Exiting.
        pause
        exit /b 1
    )
)

echo [INFO] Using: %PSQL_PATH%
echo.

REM Prompt for password
set /p DB_PASSWORD="Enter PostgreSQL password for user 'postgres': "
set PGPASSWORD=%DB_PASSWORD%

REM Create database
echo [INFO] Creating database 'sneaklink'...
%PSQL_PATH% -U postgres -c "CREATE DATABASE sneaklink;" 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Database 'sneaklink' created successfully!
) else (
    echo.
    echo [ERROR] Failed to create database!
    echo.
    echo Common issues:
    echo   1. Wrong password
    echo   2. PostgreSQL service not running
    echo   3. Database already exists (this is OK!)
    echo.
)

REM Clear password
set PGPASSWORD=
pause
