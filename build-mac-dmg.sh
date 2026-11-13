#!/usr/bin/env bash
# Creative AI IT Helpdesk - Build macOS .DMG Installer
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/desktop"

echo "==============================================="
echo " Packaging Creative AI IT Helpdesk DMG for Mac"
echo "==============================================="

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Compiling frontend..."
npm run build

echo "Creating official .DMG package..."
npm run dist:mac

echo ""
echo "=========================================================="
echo " SUCCESS! Your macOS DMG installer is ready:"
echo " $(pwd)/release/Creative AI IT Helpdesk-1.0.0.dmg"
echo "=========================================================="
