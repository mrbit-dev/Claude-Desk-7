#!/bin/bash
# Claude Desk 7 - Start (Linux/macOS/VPS)
# Usage: bash start.sh

echo "=========================================="
echo "  Claude Desk 7"
echo "=========================================="

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is required. Install: https://nodejs.org"
    exit 1
fi

# Install & Build if needed
if [ ! -d "node_modules" ]; then npm install; fi
if [ ! -d "dist" ] || [ ! -d "server/dist" ]; then npx vite build && npx tsc -p server/tsconfig.json; fi

# Start background
nohup node server/dist/index.js > .claude-desk.log 2>&1 &
PID=$!
echo $PID > .claude-desk.pid

echo "  Running at: http://localhost:3712"
echo "  PID: $PID"
echo "  Stop: kill $PID"
echo "  Logs: tail -f .claude-desk.log"
