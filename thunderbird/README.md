# Thunderbird MCP Server Extension

A Thunderbird extension that provides a Model Context Protocol (MCP) server for accessing Thunderbird data including contacts, emails, and calendar events.

## 🚀 Quick Start

### Install the Extension

1. **Download the extension**:
   ```bash
   # Download the latest release
   curl -L https://github.com/your-repo/thunderbird-mcp/releases/latest/download/thunderbird-mcp.xpi -o thunderbird-mcp.xpi
   ```

2. **Install in Thunderbird**:
   - Open Thunderbird
   - Go to **Tools → Add-ons and Themes**
   - Click the gear icon (⚙️) → **Install Add-on From File**
   - Select the downloaded `thunderbird-mcp.xpi`

3. **Follow the setup wizard**:
   - Click the extension icon in Thunderbird
   - The extension will guide you through:
     - ✅ Detecting your operating system
     - 📋 Providing the exact command to run
     - 🔍 Testing the connection automatically
     - 📝 Generating your Claude Desktop configuration
   
That's it! The extension handles all the complexity for you. 🎉

## 🎯 What You'll See

When you first open the extension, you'll see a friendly setup wizard:

1. **Step 1**: Confirms the extension is installed ✓
2. **Step 2**: Shows you the exact command to set up native messaging (with a copy button!)
3. **Step 3**: Generates your Claude Desktop configuration (also with a copy button!)
4. **Step 4**: You're ready to go!

The extension automatically:
- Detects your operating system (macOS, Windows, or Linux)
- Tests the connection every 3 seconds while you're setting up
- Shows clear success/error messages
- Remembers your progress so you can come back later

## 🛠️ For Developers

### Building from Source

If you want to build the extension yourself:

```bash
# Clone the repository
git clone https://github.com/your-repo/thunderbird-mcp.git
cd thunderbird-mcp/thunderbird

# Install dependencies
bun install

# Build the extension
bun run create-xpi
```

The built extension will be at `extension/thunderbird-mcp.xpi`.

### Development Mode

For development with hot reload:

```bash
# Start the Vue dev server
bun run dev

# In Thunderbird, load the extension temporarily:
# 1. Go to Tools → Add-ons and Themes
# 2. Click the gear → Debug Add-ons
# 3. Load Temporary Add-on → Select extension/manifest.json
```

## 📋 Technical Details

### How It Works

1. **Extension**: Runs inside Thunderbird with access to emails, contacts, and calendars
2. **Native Messaging**: Allows external programs to communicate with the extension
3. **MCP Bridge**: Translates between Claude Desktop's stdio protocol and the extension
4. **Claude Desktop**: Connects to the bridge to access Thunderbird data

### Why Native Messaging?

Claude Desktop uses stdio (standard input/output) to communicate with MCP servers. Since browser extensions can't be spawned as processes, we use native messaging as a bridge:

```
Claude Desktop → stdio → Bridge Script → Native Messaging → Thunderbird Extension
```

### Manual Setup (Advanced)

If you prefer to set things up manually:

1. **Native Messaging Setup**:
   ```bash
   cd native-messaging
   ./setup.sh
   ```

2. **Claude Desktop Config**:
   Add to your config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "thunderbird": {
         "command": "node",
         "args": ["<extension-path>/claude-desktop-bridge.js"],
         "env": {},
         "alwaysAllow": ["read"]
       }
     }
   }
   ```

## Architecture

- **Extension**: Self-contained Thunderbird WebExtension with built-in MCP server
- **MCP Server**: Runs directly in the extension's background script
- **Vue UI**: Extension popup interface for server status
- **Native Messaging**: Bridge for external MCP clients to connect

## Features

- Read-only access to:
  - Contacts and address books
  - Email messages and folders
  - Calendar events (when available)
- Built-in MCP server (no separate process needed)
- Native messaging support for external clients
- Extension messaging for browser-based clients
- Secure local-only operation

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Thunderbird (latest version)
- Node.js 18+ (for development tools)

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd thunderbird

# Install dependencies
bun install
```

### 2. Development

For development, run the Vue dev server:

```bash
# Start Vue dev server (for popup UI)
bun run dev
```

The Vue dev server will open at `http://localhost:5173` for developing the popup UI.
The MCP server is built into the extension - no separate server needed!

### 3. Building the Extension

Build the extension for installation in Thunderbird:

```bash
# Build the extension
bun run build:extension
```

The built extension will be in `extension/dist/`.

### 4. Installing in Thunderbird

#### Temporary Installation (for Development)

1. Open Thunderbird
2. Go to **Tools → Add-ons and Themes** (or press `Cmd+Shift+A` on Mac, `Ctrl+Shift+A` on Windows/Linux)
3. Click the gear icon (⚙️) in the top right
4. Select **Debug Add-ons**
5. Click **Load Temporary Add-on...**
6. Navigate to the `extension/dist/` folder
7. Select `manifest.json`

The extension icon should appear in your Thunderbird toolbar!

#### Permanent Installation (Creating XPI)

To create a permanent `.xpi` file:

1. Build the extension:
   ```bash
   bun run build:extension
   ```

2. Create the XPI package:
   ```bash
   cd extension/dist
   zip -r ../thunderbird-mcp.xpi *
   cd ../..
   ```

3. The XPI file will be at `extension/thunderbird-mcp.xpi`

**Note**: For distribution, the XPI needs to be signed by Mozilla. For personal use, you can:
- Enable unsigned extensions in Thunderbird (about:config → `xpinstall.signatures.required` → false)
- Or submit to [addons.thunderbird.net](https://addons.thunderbird.net) for signing

## Usage

### Starting the MCP Server

1. Click the extension icon in Thunderbird's toolbar
2. Click "Start Server" in the popup
3. The server will show as "Running" with connection mode (Native/Extension Messaging)

### Connecting to the MCP Server

#### Option 1: Native Messaging (Recommended)

1. Set up the native messaging host:
   ```bash
   cd native-messaging
   ./setup.sh
   ```

2. Use the example client or build your own:
   ```bash
   node native-messaging/mcp-client.js
   ```

#### Option 2: Extension Messaging

From another browser extension:

```javascript
// Send MCP request to Thunderbird extension
const response = await browser.runtime.sendMessage(
  'thunderbird-mcp@example.com',
  {
    action: 'mcp-request',
    data: {
      jsonrpc: '2.0',
      method: 'resources/list',
      params: {},
      id: 1
    }
  }
);
```

### Using with Claude Desktop

To use this extension with Claude Desktop's MCP feature:

1. **Install the extension** in Thunderbird (see installation steps above)

2. **Set up native messaging**:
   ```bash
   cd native-messaging
   ./setup.sh
   ```

3. **Configure Claude Desktop automatically**:
   
   - Click the extension icon in Thunderbird
   - Click **"Configure Claude Desktop"** button
   - The extension will automatically add itself to Claude Desktop's configuration
   
   The extension knows its own installation path and will configure Claude Desktop properly without requiring manual path configuration.

4. **Start Thunderbird** and click "Start Server" in the extension popup

5. **Restart Claude Desktop** - Thunderbird resources should now be available!

#### Manual Configuration (Advanced)

If you prefer to configure Claude Desktop manually, add this to your configuration file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "thunderbird": {
      "command": "node",
      "args": ["<extension-path>/claude-desktop-bridge.js"],
      "env": {},
      "alwaysAllow": ["read"]
    }
  }
}
```

### Available Resources

- `thunderbird://contacts/all` - All contacts
- `thunderbird://contacts/addressbooks` - Address books list
- `thunderbird://emails/folders` - Email folders
- `thunderbird://emails/inbox` - Inbox messages
- `thunderbird://emails/recent` - Recent messages
- `thunderbird://calendar/calendars` - Calendar list
- `thunderbird://calendar/events/today` - Today's events
- `thunderbird://calendar/events/week` - This week's events

## Project Structure

```
thunderbird/
├── extension/              # Thunderbird extension files
│   ├── manifest.json       # Extension manifest
│   ├── background/         # Background scripts
│   │   └── background.js   # Main background script
│   ├── popup/             # Popup UI
│   │   └── index.html     # Popup entry point
│   ├── icons/             # Extension icons
│   └── dist/              # Built extension (after build)
├── native-messaging/      # Native messaging bridge
│   ├── setup.sh          # Installation script
│   ├── mcp-client.js     # Example MCP client
│   └── package.json
├── src/                   # Vue source code
│   ├── App.vue           # Main popup component
│   ├── main.ts           # Vue entry point
│   └── browser.d.ts      # TypeScript definitions
├── build-extension.sh     # Build script
└── package.json          # Main package file
```

## Development Tips

### Working on the Popup UI

1. Use `bun run dev` to start the Vite dev server
2. Changes to Vue components will hot-reload
3. The popup UI is built with Vue 3 and TypeScript

### Working on the MCP Server

1. The MCP server is in `extension/background/mcp-server.js`
2. It runs entirely within the extension - no separate process
3. Resource providers are implemented as classes in the same file

### Testing the Extension

1. Load the extension temporarily in Thunderbird (see installation steps)
2. Use the browser console (Tools → Developer Tools → Error Console) to debug
3. Background script logs appear in the console
4. Popup UI can be inspected by right-clicking and selecting "Inspect"

### Debugging Tips

- Check the Thunderbird error console for extension errors
- Use `console.log()` in background scripts and popup code
- Test with the native messaging client: `node native-messaging/mcp-client.js`
- Background script logs appear in the Browser Console

## Future Enhancements

- Write operations (send emails, create contacts/events)
- WebSocket bridge for easier client connections
- Protocol handler registration (thunderbird-mcp://)
- Calendar API integration (when officially available)
- Advanced search capabilities
- Real-time updates for resource changes
- Settings page for configuration
- Multi-account support

## Troubleshooting

### Extension doesn't load
- Ensure you've built the extension first: `bun run build:extension`
- Check the error console in Thunderbird for any errors
- Verify the manifest.json is valid

### Native messaging doesn't work
- Ensure you ran the setup script: `cd native-messaging && ./setup.sh`
- Check that the extension ID matches in the manifest
- Verify the native messaging host is installed correctly

### MCP requests fail
- Make sure the server is started (click "Start Server" in popup)
- Check the Browser Console for errors
- Verify the extension has the required permissions

## License

MIT