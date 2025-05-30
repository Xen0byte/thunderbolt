#!/usr/bin/env node

/**
 * MCP Server for Claude Desktop
 * This provides a stdio-based MCP server that communicates with the Thunderbird extension
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class ThunderbirdMCPServer extends EventEmitter {
  constructor() {
    super();
    this.thunderbirdClient = null;
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.connected = false;
  }

  async connect() {
    // Spawn the native messaging client
    this.thunderbirdClient = spawn('node', [
      new URL('./native-messaging/mcp-client.js', import.meta.url).pathname
    ], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    // Handle native messaging protocol
    let buffer = Buffer.alloc(0);
    
    this.thunderbirdClient.stdout.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      
      while (buffer.length >= 4) {
        const length = buffer.readUInt32LE(0);
        
        if (buffer.length >= 4 + length) {
          const messageBuffer = buffer.slice(4, 4 + length);
          try {
            const message = JSON.parse(messageBuffer.toString());
            this.handleThunderbirdMessage(message);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
          
          buffer = buffer.slice(4 + length);
        } else {
          break;
        }
      }
    });

    this.thunderbirdClient.on('error', (err) => {
      console.error('Thunderbird client error:', err);
      this.connected = false;
    });

    this.thunderbirdClient.on('close', () => {
      console.error('Thunderbird client closed');
      this.connected = false;
    });

    // Initialize connection
    await this.sendToThunderbird('initialize', {
      protocolVersion: '1.0.0',
      capabilities: {}
    });

    this.connected = true;
  }

  sendToThunderbird(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });

      const message = {
        jsonrpc: '2.0',
        method,
        params,
        id
      };

      const json = JSON.stringify(message);
      const length = Buffer.byteLength(json);
      
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeUInt32LE(length, 0);
      
      this.thunderbirdClient.stdin.write(lengthBuffer);
      this.thunderbirdClient.stdin.write(json);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  handleThunderbirdMessage(message) {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);
      
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    }
  }

  async listResources() {
    if (!this.connected) {
      throw new Error('Not connected to Thunderbird');
    }
    return await this.sendToThunderbird('resources/list');
  }

  async readResource(uri) {
    if (!this.connected) {
      throw new Error('Not connected to Thunderbird');
    }
    return await this.sendToThunderbird('resources/read', { uri });
  }
}

// Create MCP server
const server = new Server({
  name: 'thunderbird-mcp',
  version: '1.0.0'
}, {
  capabilities: {
    resources: {}
  }
});

// Create Thunderbird bridge
const thunderbird = new ThunderbirdMCPServer();

// Handle resource listing
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    return await thunderbird.listResources();
  } catch (error) {
    console.error('Error listing resources:', error);
    return { resources: [] };
  }
});

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    return await thunderbird.readResource(request.params.uri);
  } catch (error) {
    console.error('Error reading resource:', error);
    throw error;
  }
});

// Start the server
async function main() {
  try {
    // Connect to Thunderbird
    console.error('Connecting to Thunderbird extension...');
    await thunderbird.connect();
    console.error('Connected to Thunderbird!');

    // Start MCP server on stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('MCP Server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();