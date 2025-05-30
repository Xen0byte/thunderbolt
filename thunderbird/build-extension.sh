#!/bin/bash

# Build extension script
echo "Building Thunderbird MCP extension..."

# Clean dist directory
rm -rf extension/dist
mkdir -p extension/dist

# Build Vue app
bun run vue-tsc -b && bun run vite build

# Copy manifest and other files
cp extension/manifest.json extension/dist/
cp -r extension/background extension/dist/
cp -r extension/icons extension/dist/

# Copy claude-desktop-bridge.js to the extension
cp claude-desktop-bridge.js extension/dist/

# Fix popup location
mkdir -p extension/dist/popup
mv extension/dist/extension/popup/index.html extension/dist/popup/
rm -rf extension/dist/extension

# Fix paths in popup HTML
sed -i '' 's|src="/js/|src="../js/|g' extension/dist/popup/index.html
sed -i '' 's|href="/assets/|href="../assets/|g' extension/dist/popup/index.html

echo "Build complete! Extension ready in extension/dist/"