#!/bin/bash

# Script to create XPI package for Thunderbird extension

echo "Creating XPI package for Thunderbird MCP extension..."

# Build the extension first
echo "Building extension..."
bun run build:extension

# Create XPI
echo "Creating XPI package..."
cd extension/dist
zip -r ../thunderbird-mcp.xpi * -x "*.DS_Store" -x "__MACOSX/*"
cd ../..

# Calculate file size
SIZE=$(ls -lh extension/thunderbird-mcp.xpi | awk '{print $5}')

echo ""
echo "✅ XPI package created successfully!"
echo "📦 File: extension/thunderbird-mcp.xpi"
echo "📏 Size: $SIZE"
echo ""
echo "To install:"
echo "1. Open Thunderbird"
echo "2. Go to Tools → Add-ons and Themes"
echo "3. Click the gear icon → Install Add-on From File"
echo "4. Select extension/thunderbird-mcp.xpi"
echo ""
echo "Note: For unsigned extensions, you may need to set"
echo "xpinstall.signatures.required = false in about:config"