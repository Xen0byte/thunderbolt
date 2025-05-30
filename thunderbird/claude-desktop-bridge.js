#!/usr/bin/env node

/**
 * MCP Bridge for Claude Desktop to Thunderbird Extension
 * 
 * This script bridges Claude Desktop's MCP client with the Thunderbird
 * extension's native messaging interface.
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Spawn the native messaging client
const clientPath = join(__dirname, 'native-messaging', 'mcp-client.js');
const thunderbirdMCP = spawn('node', [clientPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle process lifecycle
thunderbirdMCP.on('error', (err) => {
  console.error('Failed to start Thunderbird MCP client:', err);
  process.exit(1);
});

thunderbirdMCP.on('close', (code) => {
  process.exit(code || 0);
});

// Forward stdio streams
process.stdin.pipe(thunderbirdMCP.stdin);
thunderbirdMCP.stdout.pipe(process.stdout);

// Forward stderr to stderr (for debugging)
thunderbirdMCP.stderr.on('data', (data) => {
  console.error(`[Thunderbird MCP] ${data.toString()}`);
});

// Handle process termination
process.on('SIGINT', () => {
  thunderbirdMCP.kill('SIGINT');
});

process.on('SIGTERM', () => {
  thunderbirdMCP.kill('SIGTERM');
});