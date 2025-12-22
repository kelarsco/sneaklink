#!/bin/bash
# Bash Script to Create PostgreSQL Database (for Mac/Linux)
# Usage: bash scripts/create-database.sh

echo ""
echo "========================================"
echo "Creating PostgreSQL Database"
echo "========================================"
echo ""

# Database configuration
DB_NAME="sneaklink"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL (psql) not found in PATH!"
    echo ""
    echo "Please ensure PostgreSQL is installed:"
    echo "  Mac: brew install postgresql@15"
    echo "  Linux: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

echo "📡 Connecting to PostgreSQL..."
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo ""

# Test connection
echo "🔍 Testing connection..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1 as test;" > /dev/null 2>&1; then
    echo "✅ PostgreSQL connection successful!"
    echo ""
else
    echo "❌ Failed to connect to PostgreSQL!"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Ensure PostgreSQL is running"
    echo "   2. Check username and password"
    echo "   3. Verify PostgreSQL is installed"
    exit 1
fi

# Check if database exists
echo "🔍 Checking if database '$DB_NAME' exists..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | grep -q 1; then
    echo "⚠️  Database '$DB_NAME' already exists!"
    echo "   Skipping creation..."
    echo ""
else
    echo "📦 Creating database '$DB_NAME'..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" > /dev/null 2>&1; then
        echo "✅ Database '$DB_NAME' created successfully!"
        echo ""
    else
        echo "❌ Failed to create database!"
        exit 1
    fi
fi

echo "✅ Database setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Add DATABASE_URL to .env file:"
echo "      DATABASE_URL=\"postgresql://$DB_USER:YOUR_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public\""
echo "   2. Run: npm run prisma:generate"
echo "   3. Run: npm run prisma:migrate"
echo "   4. Run: npm run postgres:test"
echo ""
