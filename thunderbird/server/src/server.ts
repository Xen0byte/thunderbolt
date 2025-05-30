import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema,
  ListResourcesRequestSchema, 
  ReadResourceRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';

// Import resource providers
import { ContactsResourceProvider } from './resources/contacts.js';
import { EmailsResourceProvider } from './resources/emails.js';
import { CalendarResourceProvider } from './resources/calendar.js';

const app = express();
app.use(cors());
app.use(express.json());

// Session management
const sessions = new Map<string, any>();

// Initialize MCP server
const mcpServer = new Server({
  name: "thunderbird-mcp-server",
  version: "1.0.0",
  description: "MCP server for Thunderbird data access"
}, {
  capabilities: {
    resources: {}
  }
});

// Initialize resource providers
const contactsProvider = new ContactsResourceProvider();
const emailsProvider = new EmailsResourceProvider();
const calendarProvider = new CalendarResourceProvider();

// Setup resource handlers
mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = [
    ...await contactsProvider.listResources(),
    ...await emailsProvider.listResources(),
    ...await calendarProvider.listResources()
  ];
  
  return { resources };
});

mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  
  // Route to appropriate provider based on URI prefix
  if (uri.startsWith('thunderbird://contacts/')) {
    return await contactsProvider.readResource(uri);
  } else if (uri.startsWith('thunderbird://emails/')) {
    return await emailsProvider.readResource(uri);
  } else if (uri.startsWith('thunderbird://calendar/')) {
    return await calendarProvider.readResource(uri);
  }
  
  throw new Error(`Resource not found: ${uri}`);
});

// MCP endpoint supporting POST requests
app.post('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string || uuidv4();
    
    // Handle initialization
    if (req.body.method === 'initialize') {
      const result = {
        jsonrpc: '2.0',
        id: req.body.id,
        result: {
          protocolVersion: '1.0.0',
          capabilities: mcpServer.capabilities,
          serverInfo: {
            name: mcpServer.serverInfo.name,
            version: mcpServer.serverInfo.version
          }
        }
      };
      
      // Store session
      sessions.set(sessionId, { initialized: true });
      
      res.setHeader('Mcp-Session-Id', sessionId);
      res.json(result);
      return;
    }
    
    // Handle other requests
    const response = await mcpServer.handleRequest(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error'
      }
    });
  }
});

// SSE endpoint for server-initiated messages (optional for future use)
app.get('/mcp', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const sessionId = req.headers['mcp-session-id'] as string;
  const lastEventId = req.headers['last-event-id'] as string;
  
  // Send heartbeat
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'thunderbird-mcp-server' });
});

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log(`Thunderbird MCP Server running on http://localhost:${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});