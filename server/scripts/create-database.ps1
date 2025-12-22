# PowerShell Script to Create PostgreSQL Database
# Usage: npm run db:create
# Or: powershell -ExecutionPolicy Bypass -File scripts/create-database.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Creating PostgreSQL Database" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ PostgreSQL (psql) not found in PATH!" -ForegroundColor Red
    Write-Host "`nPlease ensure PostgreSQL is installed and added to PATH." -ForegroundColor Yellow
    Write-Host "Or provide the full path to psql.exe" -ForegroundColor Yellow
    Write-Host "`nExample: C:\Program Files\PostgreSQL\15\bin\psql.exe" -ForegroundColor Gray
    exit 1
}

# Database configuration
$dbName = "sneaklink"
$dbUser = "postgres"
$dbHost = "localhost"
$dbPort = "5432"

# Try to get password from environment or prompt
$dbPassword = $env:PGPASSWORD
if (-not $dbPassword) {
    Write-Host "Enter PostgreSQL password for user '$dbUser':" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString
    $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    )
    $env:PGPASSWORD = $dbPassword
}

Write-Host "`n📡 Connecting to PostgreSQL..." -ForegroundColor Cyan
Write-Host "   Host: $dbHost" -ForegroundColor Gray
Write-Host "   Port: $dbPort" -ForegroundColor Gray
Write-Host "   User: $dbUser" -ForegroundColor Gray

# Test connection
$testQuery = "SELECT 1 as test;"
try {
    $result = $dbPassword | & psql -h $dbHost -p $dbPort -U $dbUser -d postgres -t -c $testQuery 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Connection failed"
    }
    Write-Host "✅ PostgreSQL connection successful!`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to connect to PostgreSQL!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host "`n💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Ensure PostgreSQL is running" -ForegroundColor Gray
    Write-Host "   2. Check username and password" -ForegroundColor Gray
    Write-Host "   3. Verify PostgreSQL is installed" -ForegroundColor Gray
    exit 1
}

# Check if database already exists
Write-Host "🔍 Checking if database '$dbName' exists..." -ForegroundColor Cyan
$checkQuery = "SELECT 1 FROM pg_database WHERE datname = '$dbName';"
$exists = $dbPassword | & psql -h $dbHost -p $dbPort -U $dbUser -d postgres -t -c $checkQuery 2>&1

if ($exists -match "1") {
    Write-Host "⚠️  Database '$dbName' already exists!" -ForegroundColor Yellow
    Write-Host "   Skipping creation...`n" -ForegroundColor Gray
} else {
    Write-Host "📦 Creating database '$dbName'..." -ForegroundColor Cyan
    
    try {
        $createQuery = "CREATE DATABASE $dbName;"
        $dbPassword | & psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c $createQuery 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database '$dbName' created successfully!`n" -ForegroundColor Green
        } else {
            throw "Creation failed"
        }
    } catch {
        Write-Host "❌ Failed to create database!" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Verify database was created
Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Add DATABASE_URL to .env file:" -ForegroundColor Gray
Write-Host "      DATABASE_URL=`"postgresql://$dbUser`:YOUR_PASSWORD@$dbHost`:$dbPort/$dbName?schema=public`"" -ForegroundColor Yellow
Write-Host "   2. Run: npm run prisma:generate" -ForegroundColor Gray
Write-Host "   3. Run: npm run prisma:migrate" -ForegroundColor Gray
Write-Host "   4. Run: npm run postgres:test`n" -ForegroundColor Gray
