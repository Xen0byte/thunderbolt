import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { BaseResourceProvider } from './base.js';

interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  email?: string;
  phone?: string;
  organization?: string;
  address?: string;
}

export class ContactsResourceProvider extends BaseResourceProvider {
  protected prefix = 'contacts';
  
  async listResources(): Promise<Resource[]> {
    // In a real implementation, this would communicate with the extension
    // For now, we'll return mock data structure
    return [
      {
        uri: this.createUri('all'),
        name: 'All Contacts',
        mimeType: 'application/json'
      },
      {
        uri: this.createUri('addressbooks'),
        name: 'Address Books',
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
      case 'all':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(await this.getAllContacts(), null, 2)
          }]
        };
        
      case 'addressbooks':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(await this.getAddressBooks(), null, 2)
          }]
        };
        
      default:
        // Handle specific contact or address book
        if (path.startsWith('contact/')) {
          const contactId = path.substring('contact/'.length);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(await this.getContact(contactId), null, 2)
            }]
          };
        }
        throw new Error(`Unknown contacts resource: ${uri}`);
    }
  }
  
  private async getAllContacts(): Promise<Contact[]> {
    // Mock implementation - in real app, this would communicate with extension
    return [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        organization: 'ACME Corp'
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        displayName: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+0987654321',
        organization: 'Tech Inc'
      }
    ];
  }
  
  private async getAddressBooks(): Promise<any[]> {
    // Mock implementation
    return [
      {
        id: 'personal',
        name: 'Personal Address Book',
        type: 'personal',
        contactCount: 25
      },
      {
        id: 'work',
        name: 'Work Contacts',
        type: 'work',
        contactCount: 150
      }
    ];
  }
  
  private async getContact(id: string): Promise<Contact | null> {
    const contacts = await this.getAllContacts();
    return contacts.find(c => c.id === id) || null;
  }
}