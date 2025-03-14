import React, { createContext, useContext } from 'react'
import ImapSyncClient from './sync'

type ImapSyncContextType = {
  client: ImapSyncClient
}

const ImapSyncContext = createContext<ImapSyncContextType | undefined>(undefined)

export const useImapSync = (): ImapSyncClient => {
  const context = useContext(ImapSyncContext)
  if (!context) {
    throw new Error('useImapSync must be used within an ImapSyncProvider')
  }
  return context.client
}

type ImapSyncProviderProps = {
  client: ImapSyncClient
  children: React.ReactNode
}

export const ImapSyncProvider: React.FC<ImapSyncProviderProps> = ({ client, children }) => {
  return <ImapSyncContext.Provider value={{ client }}>{children}</ImapSyncContext.Provider>
}
