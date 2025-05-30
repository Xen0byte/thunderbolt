# Connecting to Thunderbird MCP Extension

This guide explains how to connect MCP clients to the self-contained Thunderbird extension.

## Connection Methods

### 1. Native Messaging (Recommended)

The extension uses native messaging to communicate with external MCP clients. This requires:

1. **Native Messaging Host Manifest** (save as `com.thunderbird.mcp.json`):

```json
{
  "name": "com.thunderbird.mcp",
  "description": "Thunderbird MCP Server Native Messaging Host",
  "type": "stdio",
  "allowed_extensions": ["thunderbird-mcp@example.com"],
  "path": "/path/to/mcp-native-client"
}
```

2. **Install the manifest**:
   - macOS: `~/Library/Application Support/Mozilla/NativeMessagingHosts/`
   - Linux: `~/.mozilla/native-messaging-hosts/`
   - Windows: Registry key `HKEY_CURRENT_USER\Software\Mozilla\NativeMessagingHosts\com.thunderbird.mcp`

3. **MCP Client Implementation**:

```javascript
// Native messaging client for MCP
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { spawn } from 'child_process';

class ThunderbirdMCPTransport {
  constructor() {
    // Connect to Thunderbird via native messaging
    this.process = spawn('thunderbird', [
      '--native-messaging-host=com.thunderbird.mcp'
    ]);
    
    this.process.stdout.on('data', (data) => {
      // Handle MCP responses
      const response = JSON.parse(data.toString());
      this.handleResponse(response);
    });
  }
  
  send(request) {
    const message = JSON.stringify(request);
    const length = Buffer.byteLength(message);
    
    // Native messaging format: 4-byte length + message
    const buffer = Buffer.allocUnsafe(4 + length);
    buffer.writeUInt32LE(length, 0);
    buffer.write(message, 4);
    
    this.process.stdin.write(buffer);
  }
}
```

### 2. WebSocket Bridge (Alternative)

For easier integration, you could add a WebSocket bridge to the extension:

```javascript
// In background script
const ws = new WebSocket('ws://localhost:3100');

ws.onmessage = async (event) => {
  const request = JSON.parse(event.data);
  const response = await mcpServer.handleRequest(request);
  ws.send(JSON.stringify(response));
};
```

### 3. Browser Extension Messaging

Other browser extensions can communicate directly:

```javascript
// From another extension
const response = await browser.runtime.sendMessage(
  'thunderbird-mcp@example.com', // Extension ID
  {
    type: 'mcp-request',
    data: {
      jsonrpc: '2.0',
      method: 'resources/list',
      params: {},
      id: 1
    }
  }
);
```

## Example: Listing Resources

```javascript
// Using the MCP client
const client = new Client({
  transport: new ThunderbirdMCPTransport()
});

await client.connect();

// List all available resources
const resources = await client.listResources();
console.log('Available resources:', resources);

// Read contacts
const contacts = await client.readResource('thunderbird://contacts/all');
console.log('Contacts:', contacts);
```

## Benefits of This Approach

1. **No separate server process** - Everything runs inside Thunderbird
2. **Better security** - No exposed network ports
3. **Single installation** - Users just install the extension
4. **Automatic lifecycle** - Server starts/stops with Thunderbird
5. **Direct API access** - No HTTP overhead

## Limitations

- Requires native messaging setup for external clients
- WebSocket bridge would need additional permissions
- Limited to local machine access (which is good for security)

## Future Enhancements

1. **Protocol Handler**: Register `thunderbird-mcp://` protocol
2. **OAuth2**: For secure remote access
3. **GraphQL**: Alternative query interface
4. **gRPC**: For better performance