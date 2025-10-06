#!/bin/bash

# DJAMMS Consolidated Appwrite Functions Deployment Script
# This script deploys all 5 core functions for the DJAMMS system

set -e  # Exit on any error

echo "🚀 DJAMMS Consolidated Functions Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="68cc86c3002b27e13947"
DATABASE_ID="68cc92d30024e1b6eeb6"
API_KEY="standard_451b7a70d97754000ffab451c2a59b4442ce00dcb6d97e97aa7e9d7fcd180c54a3fc8553a4befb34d44797587fb423204dbbccef1fab5d096e9656fb8486c16cbe25f4d76a9e26228ad2ad2be1a286509e0760f299e0476416add867b15902dc0d927e33ea440806ad82899e1ac36cc155c06cf402ef719b7d53d59468035a0"

# Function configurations (using indexed arrays for compatibility)
FUNCTION_IDS=("auth-setup-handler" "player-venue-state-manager" "playlist-content-manager" "ui-command-sync-hub" "scheduler-maintenance-agent")
FUNCTION_NAMES=("Auth & Setup Handler" "Player & Venue State Manager" "Playlist & Content Manager" "UI Command & Sync Hub" "Scheduler & Maintenance Agent")

# Function events (only for event-triggered functions)
AUTH_EVENTS="users.create,users.sessions.create"

# Function schedules (only for scheduled functions)
SCHEDULER_SCHEDULE="*/5 * * * *"  # Every 5 minutes

# Check if Appwrite CLI is installed
if ! command -v appwrite &> /dev/null; then
    echo -e "${RED}❌ Appwrite CLI not found!${NC}"
    echo -e "${YELLOW}📦 Installing Appwrite CLI...${NC}"
    npm install -g appwrite-cli
    echo -e "${GREEN}✅ Appwrite CLI installed${NC}"
fi

# Check if logged in to Appwrite CLI
echo -e "${BLUE}🔐 Checking Appwrite CLI authentication...${NC}"
if ! appwrite account get &> /dev/null; then
    echo -e "${RED}❌ Not logged into Appwrite CLI${NC}"
    echo -e "${YELLOW}Please run: appwrite login${NC}"
    echo -e "${YELLOW}Then run this script again${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated with Appwrite${NC}"

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONS_DIR="$SCRIPT_DIR/functions"

echo -e "${BLUE}📁 Working directory: $FUNCTIONS_DIR${NC}"
echo ""

# Function to deploy a single function
deploy_function() {
    local index="$1"
    local FUNCTION_ID="${FUNCTION_IDS[$index]}"
    local FUNCTION_NAME="${FUNCTION_NAMES[$index]}"
    local FUNCTION_DIR="$FUNCTIONS_DIR/$FUNCTION_ID"

    echo -e "${BLUE}🚀 Deploying $FUNCTION_NAME ($FUNCTION_ID)...${NC}"

    # Check if function directory exists
    if [ ! -d "$FUNCTION_DIR" ]; then
        echo -e "${RED}❌ Function directory not found: $FUNCTION_DIR${NC}"
        return 1
    fi

    cd "$FUNCTION_DIR"

    # Check if function exists, if not create it
    echo -e "${YELLOW}🔍 Checking if function exists...${NC}"
    if ! appwrite functions get --function-id "$FUNCTION_ID" &> /dev/null; then
        echo -e "${YELLOW}📦 Function doesn't exist, creating it...${NC}"

        # Build create command
        CREATE_CMD="appwrite functions create \
            --function-id \"$FUNCTION_ID\" \
            --name \"$FUNCTION_NAME\" \
            --runtime \"node-18.0\" \
            --execute \"any\" \
            --timeout 30 \
            --enabled true \
            --logging true \
            --entrypoint \"src/main.js\" \
            --commands \"npm install\""

        # Add events if this is the auth function
        if [ "$FUNCTION_ID" = "auth-setup-handler" ]; then
            CREATE_CMD="$CREATE_CMD --events \"$AUTH_EVENTS\""
        fi

        # Add schedule if this is the scheduler function
        if [ "$FUNCTION_ID" = "scheduler-maintenance-agent" ]; then
            CREATE_CMD="$CREATE_CMD --schedule \"$SCHEDULER_SCHEDULE\""
        fi

        # Execute create command
        eval "$CREATE_CMD"

        echo -e "${GREEN}✅ Function created${NC}"

        # Set environment variables for all functions
        echo -e "${YELLOW}🔧 Setting environment variables...${NC}"
        appwrite functions create-variable \
            --function-id "$FUNCTION_ID" \
            --key "APPWRITE_DATABASE_ID" \
            --value "$DATABASE_ID"

        appwrite functions create-variable \
            --function-id "$FUNCTION_ID" \
            --key "APPWRITE_PROJECT_ID" \
            --value "$PROJECT_ID"

        appwrite functions create-variable \
            --function-id "$FUNCTION_ID" \
            --key "APPWRITE_API_KEY" \
            --value "$API_KEY"

        appwrite functions create-variable \
            --function-id "$FUNCTION_ID" \
            --key "NODE_ENV" \
            --value "production"

        echo -e "${GREEN}✅ Environment variables set${NC}"
    else
        echo -e "${GREEN}✅ Function already exists${NC}"
    fi

    # Create deployment
    echo -e "${YELLOW}📤 Creating deployment...${NC}"
    appwrite functions create-deployment \
        --function-id "$FUNCTION_ID" \
        --code . \
        --activate true

    echo -e "${GREEN}✅ Deployment created and activated for $FUNCTION_NAME${NC}"
    echo ""
}

# Deploy all functions
for i in "${!FUNCTION_IDS[@]}"; do
    deploy_function "$i"
done

echo ""
echo -e "${GREEN}🎉 All functions deployed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Function Summary:${NC}"

# List all functions with their details
for i in "${!FUNCTION_IDS[@]}"; do
    FUNCTION_ID="${FUNCTION_IDS[$i]}"
    FUNCTION_NAME="${FUNCTION_NAMES[$i]}"
    echo -e "${YELLOW}$FUNCTION_NAME:${NC}"
    echo -e "  ID: $FUNCTION_ID"
    if [ "$FUNCTION_ID" = "auth-setup-handler" ]; then
        echo -e "  Events: $AUTH_EVENTS"
    fi
    if [ "$FUNCTION_ID" = "scheduler-maintenance-agent" ]; then
        echo -e "  Schedule: $SCHEDULER_SCHEDULE"
    fi
    echo ""
done

echo -e "${BLUE}🔗 Appwrite Console:${NC} https://cloud.appwrite.io/console/project/$PROJECT_ID/functions"
echo ""
echo -e "${GREEN}✅ DJAMMS Consolidated Functions are now active!${NC}"