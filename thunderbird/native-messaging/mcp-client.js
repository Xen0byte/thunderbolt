#!/usr/bin/env node

/**
 * MCP Client for Thunderbird Native Messaging
 * This script acts as a bridge between MCP clients and the Thunderbird extension
 */

import { createInterface } from 'readline';
import { stdin, stdout } from 'process';

// Native messaging protocol helpers
function sendMessage(message) {
  const json = JSON.stringify(message);
  const length = Buffer.byteLength(json);
  
  // Write 4-byte length header
  const lengthBuffer = Buffer.allocUnsafe(4);
  lengthBuffer.writeUInt32LE(length, 0);
  
  stdout.write(lengthBuffer);
  stdout.write(json);
}

function readMessages(callback) {
  let buffer = Buffer.alloc(0);
  
  stdin.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    
    while (buffer.length >= 4) {
      const length = buffer.readUInt32LE(0);
      
      if (buffer.length >= 4 + length) {
        const messageBuffer = buffer.slice(4, 4 + length);
        const message = JSON.parse(messageBuffer.toString());
        
        // Handle ping messages for connection testing
        if (message.action === 'ping') {
          sendMessage({ action: 'pong', timestamp: Date.now() });
        } else {
          callback(message);
        }
        
        buffer = buffer.slice(4 + length);
      } else {
        break;
      }
    }
  });
}

// MCP Client implementation
class ThunderbirdMCPClient {
  constructor() {
    this.requestId = 0;
    this.pendingRequests = new Map();
    
    // Start reading messages from extension
    readMessages((message) => {
      if (message.id && this.pendingRequests.has(message.id)) {
        const { resolve, reject } = this.pendingRequests.get(message.id);
        this.pendingRequests.delete(message.id);
        
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }
      }
    });
  }
  
  async sendRequest(method, params = {}) {
    const id = ++this.requestId;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      sendMessage({
        jsonrpc: '2.0',
        method,
        params,
        id
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
  
  async initialize() {
    return this.sendRequest('initialize', {
      protocolVersion: '1.0.0',
      capabilities: {}
    });
  }
  
  async listResources() {
    return this.sendRequest('resources/list');
  }
  
  async readResource(uri) {
    return this.sendRequest('resources/read', { uri });
  }
}

// Example usage and CLI interface
async function main() {
  console.error('Thunderbird MCP Client Started');
  console.error('Connected to Thunderbird extension via native messaging');
  
  const client = new ThunderbirdMCPClient();
  
  try {
    // Initialize connection
    const initResult = await client.initialize();
    console.error('Initialized:', initResult);
    
    // Create CLI interface
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
      prompt: 'mcp> '
    });
    
    console.error('\nAvailable commands:');
    console.error('  list    - List all resources');
    console.error('  read <uri> - Read a resource');
    console.error('  exit    - Exit the client\n');
    
    rl.prompt();
    
    rl.on('line', async (line) => {
      const [command, ...args] = line.trim().split(' ');
      
      try {
        switch (command) {
          case 'list':
            const resources = await client.listResources();
            console.error('\nResources:');
            resources.resources.forEach(r => {
              console.error(`  ${r.uri} - ${r.name}`);
            });
            break;
            
          case 'read':
            if (args.length === 0) {
              console.error('Usage: read <uri>');
            } else {
              const result = await client.readResource(args[0]);
              console.error('\nResource content:');
              console.error(JSON.stringify(result, null, 2));
            }
            break;
            
          case 'exit':
            process.exit(0);
            break;
            
          default:
            console.error('Unknown command:', command);
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
      
      rl.prompt();
    });
    
  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ThunderbirdMCPClient };