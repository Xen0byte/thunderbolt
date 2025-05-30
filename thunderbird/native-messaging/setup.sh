#!/bin/bash

# Setup script for Thunderbird MCP native messaging host

EXTENSION_ID="thunderbird-mcp@example.com"
HOST_NAME="com.thunderbird.mcp"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create native messaging host manifest
cat > "${SCRIPT_DIR}/${HOST_NAME}.json" << EOF
{
  "name": "${HOST_NAME}",
  "description": "Thunderbird MCP Server Native Messaging Host",
  "type": "stdio",
  "allowed_extensions": ["${EXTENSION_ID}"],
  "path": "${SCRIPT_DIR}/mcp-client.js"
}
EOF

# Detect platform and install manifest
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - Thunderbird uses its own directory
    MANIFEST_DIR="$HOME/Library/Application Support/Thunderbird/NativeMessagingHosts"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - Thunderbird uses its own directory
    MANIFEST_DIR="$HOME/.thunderbird/native-messaging-hosts"
else
    echo "Unsupported platform: $OSTYPE"
    exit 1
fi

# Create directory if it doesn't exist
mkdir -p "$MANIFEST_DIR"

# Copy manifest
cp "${SCRIPT_DIR}/${HOST_NAME}.json" "$MANIFEST_DIR/"

echo "Native messaging host installed successfully!"
echo "Manifest location: $MANIFEST_DIR/${HOST_NAME}.json"
echo ""
echo "Make sure to:"
echo "1. Update the extension ID in the manifest if needed"
echo "2. Install the Thunderbird extension"
echo "3. Run the MCP client: node ${SCRIPT_DIR}/mcp-client.js"