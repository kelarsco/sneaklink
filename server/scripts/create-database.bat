@echo off
REM Batch Script to Create PostgreSQL Database
REM Usage: npm run db:create:cmd
REM Or: scripts\create-database.bat

echo.
echo ========================================
echo Creating PostgreSQL Database
echo ========================================
echo.

REM Database configuration
set DB_NAME=sneaklink
set DB_USER=postgres
set DB_HOST=localhost
set DB_PORT=5432

REM Check if psql is available, if not try common installation paths
set PSQL_CMD=psql
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] PostgreSQL (psql) not found in PATH!
    echo.
    echo Trying common installation paths...
    
    REM Try common PostgreSQL installation paths
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
        set PSQL_CMD="C:\Program Files\PostgreSQL\16\bin\psql.exe"
        echo [INFO] Found PostgreSQL 16
        goto :found_psql
    )
    if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
        set PSQL_CMD="C:\Program Files\PostgreSQL\15\bin\psql.exe"
        echo [INFO] Found PostgreSQL 15
        goto :found_psql
    )
    if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
        set PSQL_CMD="C:\Program Files\PostgreSQL\14\bin\psql.exe"
        echo [INFO] Found PostgreSQL 14
        goto :found_psql
    )
    if exist "C:\Program Files\PostgreSQL\13\bin\psql.exe" (
        set PSQL_CMD="C:\Program Files\PostgreSQL\13\bin\psql.exe"
        echo [INFO] Found PostgreSQL 13
        goto :found_psql
    )
    
    REM If still not found, show error
    echo [ERROR] PostgreSQL not found in common locations!
    echo.
    echo Please either:
    echo   1. Add PostgreSQL to PATH:
    echo      - Go to System Properties ^> Environment Variables
    echo      - Edit PATH variable
    echo      - Add: C:\Program Files\PostgreSQL\XX\bin
    echo      - Restart terminal
    echo.
    echo   2. Or edit this script and set PSQL_CMD to your psql.exe path
    echo.
    echo   3. Or install PostgreSQL from: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

:found_psql

echo [INFO] Connecting to PostgreSQL...
echo    Host: %DB_HOST%
echo    Port: %DB_PORT%
echo    User: %DB_USER%
echo.

REM Prompt for password
set /p DB_PASSWORD="Enter PostgreSQL password for user '%DB_USER%': "
set PGPASSWORD=%DB_PASSWORD%

REM Test connection
echo [INFO] Testing connection...
%PSQL_CMD% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1 as test;" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to connect to PostgreSQL!
    echo.
    echo Troubleshooting:
    echo   1. Ensure PostgreSQL is running
    echo   2. Check username and password
    echo   3. Verify PostgreSQL is installed
    pause
    exit /b 1
)

echo [SUCCESS] PostgreSQL connection successful!
echo.

REM Check if database exists
echo [INFO] Checking if database '%DB_NAME%' exists...
%PSQL_CMD% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '%DB_NAME%';" | findstr /C:"1" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Database '%DB_NAME%' already exists!
    echo    Skipping creation...
    echo.
) else (
    echo [INFO] Creating database '%DB_NAME%'...
    %PSQL_CMD% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] Database '%DB_NAME%' created successfully!
        echo.
    ) else (
        echo [ERROR] Failed to create database!
        pause
        exit /b 1
    )
)

echo [SUCCESS] Database setup complete!
echo.
echo Next steps:
echo   1. Add DATABASE_URL to .env file:
echo      DATABASE_URL="postgresql://%DB_USER%:YOUR_PASSWORD@%DB_HOST%:%DB_PORT%/%DB_NAME%?schema=public"
echo   2. Run: npm run prisma:generate
echo   3. Run: npm run prisma:migrate
echo   4. Run: npm run postgres:test
echo.

REM Clear password from environment
set PGPASSWORD=
pause
