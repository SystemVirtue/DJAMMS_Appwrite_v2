#!/bin/bash

# DJAMMS Appwrite Functions Deployment Script
# This script deploys the user login handler function to Appwrite

set -e  # Exit on any error

echo "🚀 DJAMMS Appwrite Functions Deployment"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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
FUNCTIONS_DIR="$SCRIPT_DIR"

echo -e "${BLUE}📁 Working directory: $FUNCTIONS_DIR${NC}"
echo ""

# Deploy user login handler function
echo -e "${BLUE}🚀 Deploying user-login-handler function...${NC}"
cd "$FUNCTIONS_DIR/user-login-handler"

# Check if function exists, if not create it
FUNCTION_ID="user-login-handler"
PROJECT_ID="68cc86c3002b27e13947"
DATABASE_ID="68cc92d30024e1b6eeb6"

echo -e "${YELLOW}🔍 Checking if function exists...${NC}"
if ! appwrite functions get --function-id "$FUNCTION_ID" &> /dev/null; then
    echo -e "${YELLOW}📦 Function doesn't exist, creating it...${NC}"
    
    appwrite functions create \
        --function-id "$FUNCTION_ID" \
        --name "DJAMMS User Login Handler" \
        --runtime "node-18.0" \
        --execute "any" \
        --events "users.*.sessions.*.create" \
        --timeout 30 \
        --enabled true \
        --logging true \
        --entrypoint "src/main.js" \
        --commands "npm install"
    
    echo -e "${GREEN}✅ Function created${NC}"
    
    # Set environment variables
    echo -e "${YELLOW}🔧 Setting environment variables...${NC}"
    appwrite functions update-variable \
        --function-id "$FUNCTION_ID" \
        --key "APPWRITE_DATABASE_ID" \
        --value "$DATABASE_ID"
    
    appwrite functions update-variable \
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

echo -e "${GREEN}✅ Deployment created and activated${NC}"

# Get function details
echo ""
echo -e "${BLUE}📊 Function Details:${NC}"
appwrite functions get --function-id "$FUNCTION_ID"

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "${YELLOW}1.${NC} Verify the function is working in the Appwrite Console"
echo -e "${YELLOW}2.${NC} Test user login to trigger the function"
echo -e "${YELLOW}3.${NC} Check function logs for any issues"
echo -e "${YELLOW}4.${NC} Monitor function execution in the Appwrite dashboard"
echo ""
echo -e "${BLUE}🔗 Function URL:${NC} https://cloud.appwrite.io/console/project/$PROJECT_ID/functions/function?id=$FUNCTION_ID"
echo ""
echo -e "${GREEN}✅ DJAMMS User Login Handler is now active!${NC}"