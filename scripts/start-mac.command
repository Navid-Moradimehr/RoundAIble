#!/bin/bash
# RoundAIble launcher for macOS / Linux — double-click on macOS (RoundAIble.command)
# or run ./start-mac.command from a terminal.
set -e
cd "$(dirname "$0")/.."

if ! command -v node > /dev/null 2>&1; then
  echo "Node.js 18+ is required. Install it from https://nodejs.org then run this again."
  exit 1
fi

if [ ! -d backend/node_modules ] || [ ! -d frontend/node_modules ]; then
  echo "First run: installing dependencies, please wait..."
  npm install --no-audit --no-fund
fi

[ -f backend/dist/server.js ] || npm run build:backend
[ -f frontend/dist/index.html ] || npm run build:frontend

echo ""
echo "  RoundAIble will open at  http://localhost:4199"
echo "  Keep this window open while you use the app. Ctrl+C to stop."
echo ""

( sleep 2; open http://localhost:4199 2>/dev/null || xdg-open http://localhost:4199 2>/dev/null ) &
PORT=4199 node backend/dist/server.js
