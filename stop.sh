#!/bin/bash
# Claude Desk 7 - Stop (Linux/macOS/VPS)

if [ -f ".claude-desk.pid" ]; then
    kill $(cat .claude-desk.pid) 2>/dev/null && echo "Server stopped" || echo "Server not running"
    rm .claude-desk.pid
else
    echo "No PID file found"
fi

# Force cleanup port 3712
fuser -k 3712/tcp 2>/dev/null
