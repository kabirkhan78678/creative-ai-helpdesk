#!/usr/bin/env bash
# Creative AI IT Helpdesk - Quick Start for macOS
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/desktop"

echo "=========================================="
echo " Creative AI - IT Helpdesk Suite for macOS"
echo "=========================================="

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (first time run)..."
  npm install
fi

echo "Building frontend assets..."
npm run build

echo "Launching Creative AI Desktop on macOS..."
npm run electron

