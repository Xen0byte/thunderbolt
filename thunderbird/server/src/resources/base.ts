import { Resource } from '@modelcontextprotocol/sdk/types.js';

export interface ResourceProvider {
  listResources(): Promise<Resource[]>;
  readResource(uri: string): Promise<{
    contents: Array<{
      uri: string;
      mimeType: string;
      text?: string;
      blob?: string;
    }>;
  }>;
}

export abstract class BaseResourceProvider implements ResourceProvider {
  protected abstract prefix: string;
  
  abstract listResources(): Promise<Resource[]>;
  abstract readResource(uri: string): Promise<{
    contents: Array<{
      uri: string;
      mimeType: string;
      text?: string;
      blob?: string;
    }>;
  }>;
  
  protected createUri(path: string): string {
    return `thunderbird://${this.prefix}/${path}`;
  }
  
  protected parseUri(uri: string): string {
    const prefix = `thunderbird://${this.prefix}/`;
    if (!uri.startsWith(prefix)) {
      throw new Error(`Invalid URI for ${this.prefix} provider: ${uri}`);
    }
    return uri.substring(prefix.length);
  }
}