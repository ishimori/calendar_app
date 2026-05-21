#!/bin/bash
# FE (Vite) + BE (Hono) を同時起動
# 停止: Ctrl+C または scripts/dev-kill.sh

cd "$(dirname "$0")/.."

echo "Starting BE (Hono) on :3025 ..."
npm run dev &

echo "Starting FE (Vite) on :5198 ..."
npm run dev:fe &

echo ""
echo "=== dev servers started ==="
echo "  FE: http://localhost:5198"
echo "  BE: http://localhost:3025"
echo "  Kill all: bash scripts/dev-kill.sh"
echo ""

wait
