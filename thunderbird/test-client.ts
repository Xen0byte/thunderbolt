import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function testMCPServer() {
  console.log('Testing MCP Server...');
  
  try {
    // Test direct HTTP request first
    const response = await fetch('http://localhost:3100/health');
    const health = await response.json();
    console.log('Health check:', health);
    
    // Test MCP initialization
    const initResponse = await fetch('http://localhost:3100/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '1.0.0',
          capabilities: {}
        },
        id: 1
      })
    });
    
    const initResult = await initResponse.json();
    console.log('MCP Initialize:', initResult);
    
    // Test listing resources
    const listResponse = await fetch('http://localhost:3100/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'resources/list',
        params: {},
        id: 2
      })
    });
    
    const listResult = await listResponse.json();
    console.log('Resources:', JSON.stringify(listResult, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMCPServer();