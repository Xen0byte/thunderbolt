import { getSettings } from '@/config/settings'
import { PromptLayer } from 'promptlayer'

/** Lazily initialized PromptLayer client */
let promptLayerClient: PromptLayer | null = null

/**
 * Check if PromptLayer is configured
 */
export const isPromptLayerConfigured = (): boolean => {
  const settings = getSettings()
  return !!settings.promptlayerApiKey
}

/**
 * Get the PromptLayer client instance (singleton)
 */
export const getPromptLayerClient = (): PromptLayer | null => {
  if (!isPromptLayerConfigured()) {
    return null
  }

  if (!promptLayerClient) {
    const settings = getSettings()
    promptLayerClient = new PromptLayer({
      apiKey: settings.promptlayerApiKey,
    })
  }

  return promptLayerClient
}

/** Message format for PromptLayer logging */
export type PromptLayerMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Options for logging a request to PromptLayer */
export type LogRequestOptions = {
  provider: string
  model: string
  messages: PromptLayerMessage[]
  response: string
  startTime: number
  endTime: number
  tags?: string[]
  metadata?: Record<string, string>
  groupId?: number
}

/** Convert simple messages to PromptLayer's ChatPromptTemplate format */
const toPromptLayerInput = (messages: PromptLayerMessage[]) => ({
  type: 'chat' as const,
  messages: messages.map((m) => ({
    role: m.role,
    content: [{ type: 'text' as const, text: m.content }],
  })),
})

/** Convert response to PromptLayer's ChatPromptTemplate format */
const toPromptLayerOutput = (response: string) => ({
  type: 'chat' as const,
  messages: [
    {
      role: 'assistant' as const,
      content: [{ type: 'text' as const, text: response }],
    },
  ],
})

/**
 * Log a request to PromptLayer
 * This works with ANY provider (Thunderbolt, Mistral, Anthropic, etc.)
 * @returns The PromptLayer request ID, or null if logging failed
 */
export const logRequest = async (options: LogRequestOptions): Promise<number | null> => {
  const client = getPromptLayerClient()
  if (!client) return null

  try {
    const result = await client.logRequest({
      provider: options.provider,
      model: options.model,
      input: toPromptLayerInput(options.messages),
      output: toPromptLayerOutput(options.response),
      request_start_time: options.startTime,
      request_end_time: options.endTime,
      tags: options.tags,
      metadata: options.metadata,
    })

    const requestId = result?.id ?? null

    // Associate with group if provided
    if (requestId && options.groupId) {
      await client.track.group({
        request_id: requestId,
        group_id: options.groupId,
      })
      console.log(`[PromptLayer] Request ${requestId} linked to group ${options.groupId}`)
    } else if (requestId) {
      console.log(`[PromptLayer] Request ${requestId} logged (no group - missing X-Conversation-Id header)`)
    }

    return requestId
  } catch (error) {
    console.error('[PromptLayer] Failed to log request:', error)
    return null
  }
}

/**
 * Track a score for a request
 * @param requestId - The PromptLayer request ID
 * @param score - Score from 0-100
 * @param name - Optional name for the score (defaults to 'default')
 */
export const trackScore = async (requestId: number, score: number, name?: string): Promise<void> => {
  const client = getPromptLayerClient()
  if (!client) return

  await client.track.score({
    request_id: requestId,
    score: Math.min(100, Math.max(0, Math.round(score))),
    ...(name && { name }),
  })
}

/**
 * Track metadata for a request
 * @param requestId - The PromptLayer request ID
 * @param metadata - Key-value metadata to attach
 */
export const trackMetadata = async (requestId: number, metadata: Record<string, string>): Promise<void> => {
  const client = getPromptLayerClient()
  if (!client) return

  await client.track.metadata({
    request_id: requestId,
    metadata,
  })
}

/**
 * Create a new group for multi-turn conversations
 * @returns The group ID, or null if PromptLayer not configured or creation failed
 */
export const createGroup = async (): Promise<number | null> => {
  const client = getPromptLayerClient()
  if (!client) return null

  const result = await client.group.create()
  // PromptLayer returns false on failure, number on success
  return typeof result === 'number' ? result : null
}

/**
 * Associate a request with a group
 * @param requestId - The PromptLayer request ID
 * @param groupId - The group ID to associate with
 */
export const trackGroup = async (requestId: number, groupId: number): Promise<void> => {
  const client = getPromptLayerClient()
  if (!client) return

  await client.track.group({
    request_id: requestId,
    group_id: groupId,
  })
}

/**
 * Clear the cached PromptLayer client (for testing)
 */
export const clearPromptLayerCache = (): void => {
  promptLayerClient = null
}
