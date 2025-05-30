import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { BaseResourceProvider } from './base.js';

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  date: string;
  body?: string;
  folder: string;
  read: boolean;
  flagged: boolean;
}

interface Folder {
  id: string;
  name: string;
  type: string;
  messageCount: number;
  unreadCount: number;
}

export class EmailsResourceProvider extends BaseResourceProvider {
  protected prefix = 'emails';
  
  async listResources(): Promise<Resource[]> {
    return [
      {
        uri: this.createUri('folders'),
        name: 'Email Folders',
        mimeType: 'application/json'
      },
      {
        uri: this.createUri('inbox'),
        name: 'Inbox Messages',
        mimeType: 'application/json'
      },
      {
        uri: this.createUri('recent'),
        name: 'Recent Messages',
        mimeType: 'application/json'
      },
      {
        uri: this.createUri('search'),
        name: 'Email Search',
        mimeType: 'application/json'
      }
    ];
  }
  
  async readResource(uri: string): Promise<{
    contents: Array<{
      uri: string;
      mimeType: string;
      text?: string;
    }>;
  }> {
    const path = this.parseUri(uri);
    
    switch (path) {
      case 'folders':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(await this.getFolders(), null, 2)
          }]
        };
        
      case 'inbox':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(await this.getInboxMessages(), null, 2)
          }]
        };
        
      case 'recent':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(await this.getRecentMessages(), null, 2)
          }]
        };
        
      default:
        // Handle specific message
        if (path.startsWith('message/')) {
          const messageId = path.substring('message/'.length);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(await this.getMessage(messageId), null, 2)
            }]
          };
        }
        
        // Handle folder contents
        if (path.startsWith('folder/')) {
          const folderId = path.substring('folder/'.length);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(await this.getFolderMessages(folderId), null, 2)
            }]
          };
        }
        
        throw new Error(`Unknown emails resource: ${uri}`);
    }
  }
  
  private async getFolders(): Promise<Folder[]> {
    // Mock implementation
    return [
      {
        id: 'inbox',
        name: 'Inbox',
        type: 'inbox',
        messageCount: 154,
        unreadCount: 12
      },
      {
        id: 'sent',
        name: 'Sent',
        type: 'sent',
        messageCount: 89,
        unreadCount: 0
      },
      {
        id: 'drafts',
        name: 'Drafts',
        type: 'drafts',
        messageCount: 5,
        unreadCount: 5
      },
      {
        id: 'trash',
        name: 'Trash',
        type: 'trash',
        messageCount: 23,
        unreadCount: 2
      }
    ];
  }
  
  private async getInboxMessages(): Promise<EmailMessage[]> {
    // Mock implementation
    return [
      {
        id: 'msg1',
        subject: 'Project Update',
        from: 'manager@company.com',
        to: ['you@company.com'],
        date: new Date().toISOString(),
        folder: 'inbox',
        read: false,
        flagged: true
      },
      {
        id: 'msg2',
        subject: 'Meeting Tomorrow',
        from: 'colleague@company.com',
        to: ['you@company.com'],
        cc: ['team@company.com'],
        date: new Date(Date.now() - 3600000).toISOString(),
        folder: 'inbox',
        read: true,
        flagged: false
      }
    ];
  }
  
  private async getRecentMessages(): Promise<EmailMessage[]> {
    // Return last 10 messages from all folders
    return await this.getInboxMessages();
  }
  
  private async getMessage(id: string): Promise<EmailMessage | null> {
    // Mock implementation with full message including body
    const messages = await this.getInboxMessages();
    const message = messages.find(m => m.id === id);
    
    if (message) {
      return {
        ...message,
        body: 'This is the email body content...'
      };
    }
    
    return null;
  }
  
  private async getFolderMessages(folderId: string): Promise<EmailMessage[]> {
    // Mock implementation - return messages for specific folder
    if (folderId === 'inbox') {
      return await this.getInboxMessages();
    }
    
    return [];
  }
}