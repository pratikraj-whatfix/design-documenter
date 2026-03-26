#!/bin/bash
# ============================================================
#  Design Documenter — One-Click Launcher
#  Just double-click this file to start the app.
# ============================================================

cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BLUE}${BOLD}????????????????????????????????????????${NC}"
echo -e "${BLUE}${BOLD}?      Design Documenter Launcher      ?${NC}"
echo -e "${BLUE}${BOLD}????????????????????????????????????????${NC}"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed.${NC}"
    echo ""
    echo "Please install Node.js first:"
    echo "  1. Go to https://nodejs.org"
    echo "  2. Download the LTS version"
    echo "  3. Run the installer"
    echo "  4. Then double-click this file again"
    echo ""
    echo "Press any key to open the Node.js download page..."
    read -n 1
    open "https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}?${NC} Node.js found: ${NODE_VERSION}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${BLUE}Installing dependencies (first time only, this takes ~30 seconds)...${NC}"
    npm install --loglevel=error
    if [ $? -ne 0 ]; then
        echo -e "${RED}Installation failed. Please check your internet connection and try again.${NC}"
        echo "Press any key to close..."
        read -n 1
        exit 1
    fi
    echo -e "${GREEN}?${NC} Dependencies installed"
fi

echo ""
echo -e "${GREEN}${BOLD}Starting Design Documenter...${NC}"
echo -e "The app will open in your browser at ${BLUE}http://localhost:3847${NC}"
echo -e "${BOLD}Keep this window open${NC} while using the app."
echo -e "To stop: press ${BOLD}Ctrl+C${NC} or close this window."
echo ""

# Open browser after a short delay to let the server start
(sleep 3 && open "http://localhost:3847") &

# Start the dev server
npm run dev
