import { createAcpClient } from '@/acp/client'
import { createBuiltInAgentHandler } from '@/acp/built-in-agent'
import { createInProcessStream } from '@/acp/streams'
import { createBuiltInInference } from '@/acp/built-in-inference'
import { useDatabase } from '@/contexts'
import {
  getEnabledAgents,
  getAllModes,
  getAvailableModels,
  getChatMessages,
  getChatThread,
  getDefaultModelForThread,
  getSelectedAgent,
  getSelectedMode,
  getSettings,
  getTriggerPromptForThread,
  isChatThreadDeleted,
  saveMessagesWithContextUpdate,
} from '@/dal'
import { getOrCreateChatThread, updateChatThread } from '@/dal/chat-threads'
import { useMCP } from '@/lib/mcp-provider'
import { generateTitle } from '@/lib/title-generator'
import { convertDbChatMessageToUIMessage } from '@/lib/utils'
import type { SaveMessagesFunction, ThunderboltUIMessage } from '@/types'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useChatStore } from './chat-store'
import { createChatInstance } from './chat-instance'

type UseHydrateChatStoreParams = {
  id: string
  isNew: boolean
}

export const useHydrateChatStore = ({ id, isNew }: UseHydrateChatStoreParams) => {
  const db = useDatabase()
  const navigate = useNavigate()

  const [isReady, setIsReady] = useState(false)

  const { getEnabledClients } = useMCP()

  const updateThreadTitle = async (messages: ThunderboltUIMessage[], threadId: string) => {
    const firstUserMessage = messages.find((msg) => msg.role === 'user')
    if (!firstUserMessage) {
      return
    }

    const textContent = firstUserMessage.parts
      ?.filter((part) => part.type === 'text')
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join(' ')

    if (!textContent) {
      return
    }

    const title = await generateTitle(textContent)
    await updateChatThread(db, threadId, { title })
  }

  const saveMessages: SaveMessagesFunction = async ({ id, messages }) => {
    const { sessions, updateSession } = useChatStore.getState()

    const session = sessions.get(id)

    if (!session) {
      throw new Error('No session found')
    }

    // Fetch thread info to check if we need to generate a title
    const thread = await getOrCreateChatThread(db, id, session.selectedModel.id)

    // Save messages and update context size using DAL
    await saveMessagesWithContextUpdate(db, id, messages)

    // Generate title in background if needed
    if (thread?.title === 'New Chat') {
      updateThreadTitle(messages, id)
    }

    if (!session.chatThread) {
      updateSession(id, { chatThread: thread })
      navigate(`/chats/${id}`, { relative: 'path' })
    }
  }

  const hydrateChatStore = async () => {
    const { createSession, sessions, setAgents, setCurrentSessionId, setMcpClients, setModes, setModels } =
      useChatStore.getState()

    // Check if this ID belongs to a deleted chat - redirect to 404 if so
    const isDeleted = await isChatThreadDeleted(db, id)
    if (isDeleted) {
      navigate('/not-found', { replace: true })
      return
    }

    // If the session already exists, set the current session id and update the mcp clients and models
    if (sessions.has(id)) {
      setCurrentSessionId(id)

      const [agents, modes, models, mcpClients] = await Promise.all([
        getEnabledAgents(db),
        getAllModes(db),
        getAvailableModels(db),
        getEnabledClients(),
      ])

      setAgents(agents)
      setMcpClients(mcpClients)
      setModes(modes)
      setModels(models)

      setIsReady(true)

      return
    }

    // If the session does not exist, create it below
    const settings = await getSettings(db, { selected_model: String })

    const [
      agents,
      defaultModel,
      selectedAgent,
      selectedMode,
      chatThread,
      initialMessages,
      modes,
      models,
      triggerData,
      mcpClients,
    ] = await Promise.all([
      getEnabledAgents(db),
      getDefaultModelForThread(db, id, settings.selectedModel ?? undefined),
      getSelectedAgent(db),
      getSelectedMode(db),
      getChatThread(db, id),
      getChatMessages(db, id),
      getAllModes(db),
      getAvailableModels(db),
      getTriggerPromptForThread(db, id),
      getEnabledClients(),
    ])

    // If chat doesn't exist and this isn't a new chat, redirect to 404
    if (!chatThread && !isNew) {
      navigate('/not-found', { replace: true })
      return
    }

    const chatInstance = createChatInstance(
      id,
      initialMessages.map(convertDbChatMessageToUIMessage) as ThunderboltUIMessage[],
      saveMessages,
    )

    createSession({
      acpSession: null,
      chatInstance,
      chatThread,
      id,
      retryCount: 0,
      retriesExhausted: false,
      selectedAgent,
      selectedMode,
      selectedModel: defaultModel,
      triggerData,
    })

    setCurrentSessionId(id)

    setAgents(agents)
    setMcpClients(mcpClients)
    setModes(modes)
    setModels(models)

    setIsReady(true)

    // Initialize ACP connection after render is unblocked (Phase 1).
    // This runs asynchronously so it doesn't delay the initial chat render.
    const { clientStream, agentStream } = createInProcessStream()
    const agentHandler = createBuiltInAgentHandler({
      modes,
      models,
      runInference: createBuiltInInference(),
    })

    const connection = createAcpClient({
      stream: clientStream,
      agentStream,
      agentHandler,
      onSessionUpdate: () => {},
    })

    connection.initialize({ protocolVersion: 1 }).then(async () => {
      const acpNewSession = await connection.newSession({ cwd: '/', mcpServers: [] })
      const { updateSession, sessions } = useChatStore.getState()
      if (sessions.has(id)) {
        updateSession(id, {
          acpSession: {
            sessionId: acpNewSession.sessionId,
            modes: acpNewSession.modes ?? null,
            configOptions: acpNewSession.configOptions ?? null,
            connection,
          },
        })
      }
    })
  }

  return { hydrateChatStore, isReady, saveMessages }
}
