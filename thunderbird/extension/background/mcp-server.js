// MCP Server implementation for background script
// This runs entirely within the Thunderbird extension

class MCPServer {
  constructor() {
    this.serverInfo = {
      name: "thunderbird-mcp-server",
      version: "1.0.0",
      description: "MCP server for Thunderbird data access"
    };
    
    this.capabilities = {
      resources: {}
    };
    
    // Resource providers
    this.resourceProviders = {
      contacts: new ContactsResourceProvider(),
      emails: new EmailsResourceProvider(),
      calendar: new CalendarResourceProvider()
    };
  }
  
  async handleRequest(request) {
    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
          
        case 'resources/list':
          return this.handleListResources(request);
          
        case 'resources/read':
          return this.handleReadResource(request);
          
        default:
          throw new Error(`Unknown method: ${request.method}`);
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }
  
  handleInitialize(request) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '1.0.0',
        capabilities: this.capabilities,
        serverInfo: this.serverInfo
      }
    };
  }
  
  async handleListResources(request) {
    const resources = [];
    
    for (const provider of Object.values(this.resourceProviders)) {
      resources.push(...await provider.listResources());
    }
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { resources }
    };
  }
  
  async handleReadResource(request) {
    const uri = request.params.uri;
    
    // Route to appropriate provider
    if (uri.startsWith('thunderbird://contacts/')) {
      const result = await this.resourceProviders.contacts.readResource(uri);
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    } else if (uri.startsWith('thunderbird://emails/')) {
      const result = await this.resourceProviders.emails.readResource(uri);
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    } else if (uri.startsWith('thunderbird://calendar/')) {
      const result = await this.resourceProviders.calendar.readResource(uri);
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    }
    
    throw new Error(`Unknown resource: ${uri}`);
  }
}

// Base Resource Provider
class BaseResourceProvider {
  createUri(prefix, path) {
    return `thunderbird://${prefix}/${path}`;
  }
  
  parseUri(prefix, uri) {
    const prefixStr = `thunderbird://${prefix}/`;
    if (!uri.startsWith(prefixStr)) {
      throw new Error(`Invalid URI for ${prefix} provider: ${uri}`);
    }
    return uri.substring(prefixStr.length);
  }
}

// Contacts Resource Provider
class ContactsResourceProvider extends BaseResourceProvider {
  async listResources() {
    return [
      {
        uri: this.createUri('contacts', 'all'),
        name: 'All Contacts',
        mimeType: 'application/json'
      },
      {
        uri: this.createUri('contacts', 'addressbooks'),
        name: 'Address Books',
        mimeType: 'application/json'
      }
    ];
  }
  
  async readResource(uri) {
    const path = this.parseUri('contacts', uri);
    
    switch (path) {
      case 'all':
        const contacts = await this.getAllContacts();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(contacts, null, 2)
          }]
        };
        
      case 'addressbooks':
        const addressBooks = await this.getAddressBooks();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(addressBooks, null, 2)
          }]
        };
        
      default:
        throw new Error(`Unknown contacts resource: ${uri}`);
    }
  }
  
  async getAllContacts() {
    const contacts = [];
    const addressBooks = await messenger.addressBooks.list();
    
    for (const book of addressBooks) {
      const bookContacts = await messenger.contacts.list(book.id);
      
      for (const contact of bookContacts) {
        contacts.push({
          id: contact.id,
          displayName: contact.properties.DisplayName || '',
          firstName: contact.properties.FirstName || '',
          lastName: contact.properties.LastName || '',
          email: contact.properties.PrimaryEmail || '',
          phone: contact.properties.WorkPhone || contact.properties.HomePhone || '',
          organization: contact.properties.Company || '',
          addressBookId: book.id,
          addressBookName: book.name
        });
      }
    }
    
    return contacts;
  }
  
  async getAddressBooks() {
    const books = await messenger.addressBooks.list();
    return books.map(book => ({
      id: book.id,
      name: book.name,
      readOnly: book.readOnly || false,
      remote: book.remote || false
    }));
  }
}

// Emails Resource Provider
class EmailsResourceProvider extends BaseResourceProvider {
  async listResources() {
    return [
      {
        uri: this.createUri('emails', 'folders'),
        name: 'Email Folders',
        mimeType: 'application/json'
      },
      {
        uri: this.createUri('emails', 'inbox'),
        name: 'Inbox Messages',
        mimeType: 'application/json'
      },
      {
        uri: this.createUri('emails', 'recent'),
        name: 'Recent Messages',
        mimeType: 'application/json'
      }
    ];
  }
  
  async readResource(uri) {
    const path = this.parseUri('emails', uri);
    
    switch (path) {
      case 'folders':
        const folders = await this.getFolders();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(folders, null, 2)
          }]
        };
        
      case 'inbox':
        const inboxMessages = await this.getInboxMessages();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(inboxMessages, null, 2)
          }]
        };
        
      case 'recent':
        const recentMessages = await this.getRecentMessages();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(recentMessages, null, 2)
          }]
        };
        
      default:
        throw new Error(`Unknown emails resource: ${uri}`);
    }
  }
  
  async getFolders() {
    const folders = [];
    const accounts = await messenger.accounts.list();
    
    for (const account of accounts) {
      const accountFolders = await messenger.folders.list(account.id);
      
      for (const folder of accountFolders) {
        folders.push({
          id: folder.id,
          name: folder.name,
          path: folder.path,
          accountId: account.id,
          accountName: account.name,
          type: folder.type
        });
      }
    }
    
    return folders;
  }
  
  async getInboxMessages() {
    const messages = [];
    const accounts = await messenger.accounts.list();
    
    for (const account of accounts) {
      const folders = await messenger.folders.list(account.id);
      const inboxFolder = folders.find(f => f.type === 'inbox');
      
      if (inboxFolder) {
        const page = await messenger.messages.list(inboxFolder.id);
        
        for (const message of page.messages.slice(0, 50)) {
          messages.push({
            id: message.id,
            subject: message.subject,
            from: message.from,
            to: message.to,
            date: message.date,
            folder: inboxFolder.name,
            read: message.read,
            flagged: message.flagged
          });
        }
      }
    }
    
    return messages;
  }
  
  async getRecentMessages() {
    // Get messages from all folders, sorted by date
    const allMessages = [];
    const accounts = await messenger.accounts.list();
    
    for (const account of accounts) {
      const folders = await messenger.folders.list(account.id);
      
      for (const folder of folders.slice(0, 5)) { // Limit folders checked
        const page = await messenger.messages.list(folder.id);
        
        for (const message of page.messages.slice(0, 10)) {
          allMessages.push({
            id: message.id,
            subject: message.subject,
            from: message.from,
            date: message.date,
            folder: folder.name
          });
        }
      }
    }
    
    // Sort by date and return most recent
    return allMessages
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);
  }
}

// Calendar Resource Provider (stub for now)
class CalendarResourceProvider extends BaseResourceProvider {
  async listResources() {
    return [
      {
        uri: this.createUri('calendar', 'calendars'),
        name: 'All Calendars',
        mimeType: 'application/json'
      }
    ];
  }
  
  async readResource(uri) {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          message: 'Calendar API not yet implemented in Thunderbird'
        }, null, 2)
      }]
    };
  }
}

// Initialize MCP server
const mcpServer = new MCPServer();

// Native messaging host for external connections
let nativePort = null;

// Handle native messaging connections (if available)
if (browser.runtime.onConnectNative) {
  browser.runtime.onConnectNative.addListener((port) => {
    console.log('Native messaging connection established');
    nativePort = port;
    
    port.onMessage.addListener(async (request) => {
      try {
        const response = await mcpServer.handleRequest(request);
        port.postMessage(response);
      } catch (error) {
        console.error('MCP request error:', error);
        port.postMessage({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message
        }
      });
    }
  });
  
  port.onDisconnect.addListener(() => {
    console.log('Native messaging connection closed');
    nativePort = null;
  });
});
}

// Also handle extension messaging for internal use
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'mcp-request') {
    mcpServer.handleRequest(request.data).then(sendResponse);
    return true; // Will respond asynchronously
  }
});