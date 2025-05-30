#!/usr/bin/env node

/**
 * Direct MCP Server for Claude Desktop
 * This simulates the Thunderbird extension's MCP server for testing
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create MCP server
const server = new Server({
  name: 'thunderbird-mcp',
  version: '1.0.0',
  description: 'MCP server for Thunderbird data access'
}, {
  capabilities: {
    resources: {}
  }
});

// Mock data for testing (in production, this would come from Thunderbird)
const mockResources = [
  {
    uri: 'thunderbird://contacts/all',
    name: 'All Contacts',
    mimeType: 'application/json'
  },
  {
    uri: 'thunderbird://contacts/addressbooks',
    name: 'Address Books',
    mimeType: 'application/json'
  },
  {
    uri: 'thunderbird://emails/folders',
    name: 'Email Folders',
    mimeType: 'application/json'
  },
  {
    uri: 'thunderbird://emails/inbox',
    name: 'Inbox Messages',
    mimeType: 'application/json'
  },
  {
    uri: 'thunderbird://emails/recent',
    name: 'Recent Messages',
    mimeType: 'application/json'
  },
  {
    uri: 'thunderbird://calendar/calendars',
    name: 'All Calendars',
    mimeType: 'application/json'
  }
];

// Mock data generators
function getMockContacts() {
  return [
    {
      id: '1',
      displayName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890'
    },
    {
      id: '2',
      displayName: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+0987654321'
    }
  ];
}

function getMockFolders() {
  return [
    { id: 'inbox', name: 'Inbox', messageCount: 42, unreadCount: 5 },
    { id: 'sent', name: 'Sent', messageCount: 18, unreadCount: 0 },
    { id: 'drafts', name: 'Drafts', messageCount: 3, unreadCount: 3 }
  ];
}

function getMockEmails() {
  return [
    {
      id: 'msg1',
      subject: 'Test Email from MCP Server',
      from: 'mcp@thunderbird.test',
      date: new Date().toISOString(),
      preview: 'This is a test email from the Thunderbird MCP server...'
    },
    {
      id: 'msg2',
      subject: 'Welcome to Thunderbird MCP',
      from: 'welcome@thunderbird.test',
      date: new Date(Date.now() - 86400000).toISOString(),
      preview: 'Thank you for installing the Thunderbird MCP extension...'
    }
  ];
}

// Handle resource listing
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  console.error('Listing resources...');
  return { resources: mockResources };
});

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  console.error(`Reading resource: ${uri}`);

  let content;
  switch (uri) {
    case 'thunderbird://contacts/all':
      content = getMockContacts();
      break;
    case 'thunderbird://emails/folders':
      content = getMockFolders();
      break;
    case 'thunderbird://emails/inbox':
    case 'thunderbird://emails/recent':
      content = getMockEmails();
      break;
    default:
      content = { message: `Resource ${uri} not implemented yet` };
  }

  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(content, null, 2)
    }]
  };
});

// Start the server
async function main() {
  console.error('Starting Thunderbird MCP Server (Direct Mode)...');
  console.error('Note: This is a mock server for testing. Install the Thunderbird extension for real data.');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('MCP Server running on stdio');
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});