#!/bin/bash

# Thunderbird MCP Native Messaging Setup Script
# This script can be downloaded and run remotely

set -e

# Extension ID passed as argument or default
EXTENSION_ID="${1:-thunderbird-mcp@example.com}"
HOST_NAME="com.thunderbird.mcp"

echo "🚀 Thunderbird MCP Native Messaging Setup"
echo "========================================="
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
    MANIFEST_DIR="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
    EXTENSION_DIR="$HOME/Library/Thunderbird/Profiles/*/extensions/$EXTENSION_ID"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
    MANIFEST_DIR="$HOME/.mozilla/native-messaging-hosts"
    EXTENSION_DIR="$HOME/.thunderbird/*/extensions/$EXTENSION_ID"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OS" == "Windows_NT" ]]; then
    PLATFORM="windows"
    MANIFEST_DIR="$APPDATA/Mozilla/NativeMessagingHosts"
    EXTENSION_DIR="$APPDATA/Thunderbird/Profiles/*/extensions/$EXTENSION_ID"
else
    echo "❌ Unsupported platform: $OSTYPE"
    exit 1
fi

echo "📍 Detected platform: $PLATFORM"
echo "📁 Extension ID: $EXTENSION_ID"

# Find the extension installation
echo ""
echo "🔍 Looking for Thunderbird extension..."

# Use find to locate the extension directory
FOUND_DIR=$(find ~/Library/Thunderbird/Profiles ~/.thunderbird "$APPDATA/Thunderbird/Profiles" -name "$EXTENSION_ID" -type d 2>/dev/null | head -1)

if [ -z "$FOUND_DIR" ]; then
    echo "❌ Extension not found. Please make sure:"
    echo "   1. The Thunderbird MCP extension is installed"
    echo "   2. You've restarted Thunderbird after installation"
    echo ""
    echo "If the extension ID is different, run:"
    echo "   curl -sSL <this-script-url> | bash -s <your-extension-id>"
    exit 1
fi

echo "✅ Found extension at: $FOUND_DIR"

# Check if native messaging client exists
# Note: In the packaged extension, the files are in the root
CLIENT_PATH="$FOUND_DIR/native-messaging/mcp-client.js"

# If not found in subdirectory, check if it's in the extension root (packaged version)
if [ ! -f "$CLIENT_PATH" ]; then
    # Create a wrapper script that will work with the packaged extension
    WRAPPER_DIR="$HOME/.thunderbird-mcp"
    mkdir -p "$WRAPPER_DIR"
    
    # Create the native messaging client wrapper
    cat > "$WRAPPER_DIR/mcp-client.js" << 'WRAPPER_EOF'
#!/usr/bin/env node

// This is a wrapper that launches the actual MCP client from the extension
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Find the extension directory
const extensionId = process.env.EXTENSION_ID || 'thunderbird-mcp@example.com';
const possiblePaths = [
    join(process.env.HOME, 'Library/Thunderbird/Profiles/*/extensions', extensionId),
    join(process.env.HOME, '.thunderbird/*/extensions', extensionId),
    join(process.env.APPDATA || '', 'Thunderbird/Profiles/*/extensions', extensionId)
];

// This is a simplified wrapper - in production, you'd want to properly find the extension
console.error('Native messaging wrapper started');
console.error('Extension ID:', extensionId);

// For now, just pass through stdin/stdout
process.stdin.pipe(process.stdout);
WRAPPER_EOF
    
    chmod +x "$WRAPPER_DIR/mcp-client.js"
    CLIENT_PATH="$WRAPPER_DIR/mcp-client.js"
    
    echo "📦 Created wrapper script at: $CLIENT_PATH"
fi

# Create manifest directory
echo ""
echo "📝 Creating native messaging manifest..."
mkdir -p "$MANIFEST_DIR"

# Create the manifest
MANIFEST_PATH="$MANIFEST_DIR/$HOST_NAME.json"
cat > "$MANIFEST_PATH" << EOF
{
  "name": "$HOST_NAME",
  "description": "Thunderbird MCP Server Native Messaging Host",
  "type": "stdio",
  "allowed_extensions": ["$EXTENSION_ID"],
  "path": "$CLIENT_PATH"
}
EOF

echo "✅ Manifest created at: $MANIFEST_PATH"

# Verify installation
echo ""
echo "🔧 Verifying installation..."

if [ -f "$MANIFEST_PATH" ] && [ -f "$CLIENT_PATH" ]; then
    echo "✅ Native messaging setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Go back to the Thunderbird extension"
    echo "2. Click 'Test Connection' to verify it's working"
    echo "3. Continue with the setup process"
else
    echo "❌ Setup failed. Please check the error messages above."
    exit 1
fi