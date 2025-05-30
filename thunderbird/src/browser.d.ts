/// <reference types="webextension-polyfill" />

declare global {
  const browser: typeof chrome;
  
  // Thunderbird-specific APIs
  namespace messenger {
    namespace addressBooks {
      function list(): Promise<any[]>;
      namespace contacts {
        function list(addressBookId: string): Promise<any[]>;
        function get(id: string): Promise<any>;
        function add(addressBookId: string, properties: any): Promise<string>;
        function update(id: string, properties: any): Promise<void>;
        function remove(id: string): Promise<void>;
      }
    }
    
    namespace accounts {
      function list(): Promise<any[]>;
    }
    
    namespace folders {
      function list(accountId: string): Promise<any[]>;
    }
    
    namespace messages {
      function list(folderId: string): Promise<{ messages: any[] }>;
      function get(messageId: number): Promise<any>;
      function getFull(messageId: number): Promise<any>;
      function copy(messageIds: number[], destination: string): Promise<void>;
      function move(messageIds: number[], destination: string): Promise<void>;
      function remove(messageIds: number[], skipTrash?: boolean): Promise<void>;
      function archive(messageIds: number[]): Promise<void>;
    }
    
    namespace contacts {
      function list(addressBookId: string): Promise<any[]>;
    }
  }
}

export {};