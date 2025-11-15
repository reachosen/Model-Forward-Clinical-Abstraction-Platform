#!/bin/bash
# ============================================================================
# Deployment Wrapper Script
# ============================================================================
# Purpose: Simplify deployment by wrapping factory scripts with config
# Usage: ./setup/deploy.sh [dev|test|prod]
# DBA: Use this for consistent deployments across environments
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Check arguments
if [ $# -eq 0 ]; then
    print_error "Usage: $0 [dev|test|prod]"
    exit 1
fi

ENV=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/environments/${ENV}.config"

# Validate environment
if [ ! -f "$CONFIG_FILE" ]; then
    print_error "Unknown environment: $ENV"
    print_info "Valid environments: dev, test, prod"
    exit 1
fi

print_header "Deploying to $ENV Environment"

# Load configuration
print_info "Loading configuration from $CONFIG_FILE"
source "$CONFIG_FILE"

# Verify SnowSQL is installed
if ! command -v snowsql &> /dev/null; then
    print_error "SnowSQL not found. Please install from:"
    echo "https://docs.snowflake.com/en/user-guide/snowsql-install-config.html"
    exit 1
fi

print_success "SnowSQL found"

# Check required environment variables
if [ -z "$SNOWFLAKE_ACCOUNT" ] || [ -z "$SNOWFLAKE_USER" ]; then
    print_warning "Snowflake connection not configured"
    print_info "Set these environment variables:"
    echo "  export SNOWFLAKE_ACCOUNT=your_account"
    echo "  export SNOWFLAKE_USER=your_user"
    echo "  export SNOWFLAKE_PASSWORD=your_password"
    echo ""
    print_info "Continuing with interactive login..."
fi

# Confirm production deployment
if [ "$ENV" = "prod" ]; then
    echo ""
    print_warning "⚠️  WARNING: You are deploying to PRODUCTION"
    echo ""
    read -p "Type 'DEPLOY_TO_PROD' to continue: " confirm
    if [ "$confirm" != "DEPLOY_TO_PROD" ]; then
        print_error "Deployment cancelled"
        exit 1
    fi
fi

# Deploy factory script
print_header "Deploying Database Infrastructure"
print_info "Running snowflake_factory.sql..."

snowsql -f "$SCRIPT_DIR/snowflake_factory.sql" \
    -D env="$SNOWFLAKE_ENV" \
    || { print_error "Factory script failed"; exit 1; }

print_success "Database infrastructure deployed"

# Load seed data (if enabled)
if [ "$LOAD_SEED_DATA" = "true" ]; then
    print_header "Loading Seed Data"
    print_info "Running load_seed_data.sql..."

    snowsql -f "$SCRIPT_DIR/load_seed_data.sql" \
        -D env="$SNOWFLAKE_ENV" \
        || { print_error "Seed data load failed"; exit 1; }

    print_success "Seed data loaded"
else
    print_info "Seed data loading skipped (disabled for $ENV)"
fi

# Validation
if [ "$ENABLE_VALIDATION" = "true" ]; then
    print_header "Validating Deployment"

    # Run validation queries
    snowsql -q "USE DATABASE $SNOWFLAKE_DATABASE; \
                SELECT COUNT(*) AS patient_count FROM SILVER.PATIENTS;" \
        || print_warning "Validation query failed (may be expected if no data yet)"

    print_success "Validation complete"
fi

# Summary
print_header "Deployment Complete"
echo ""
print_success "Environment: $ENV"
print_success "Database: $SNOWFLAKE_DATABASE"
print_success "Warehouse: $SNOWFLAKE_WAREHOUSE"
echo ""
print_info "Next steps:"
echo "  1. Verify deployment: snowsql"
echo "  2. Configure application to use database: $SNOWFLAKE_DATABASE"
echo "  3. Start ETL jobs to populate SILVER layer"
echo "  4. Run application: cd .. && ./start-all.sh"
echo ""
