import { isPostHogConfigured } from '@/posthog/client'
import { isPromptLayerConfigured, logRequest, createGroup, type PromptLayerMessage } from '@/promptlayer/client'
import { createSSEStreamFromCompletion } from '@/utils/streaming'
import type { OpenAI as PostHogOpenAI } from '@posthog/ai'
import { Elysia } from 'elysia'
import { APIConnectionError, APIConnectionTimeoutError } from 'openai'
import { getInferenceClient, type InferenceProvider } from './client'

/** In-memory cache for conversation → PromptLayer group ID mapping */
const conversationGroups = new Map<string, number>()

/** Context for PromptLayer logging */
type PromptLayerContext = {
  provider: string
  model: string
  messages: PromptLayerMessage[]
  startTime: number
  tags: string[]
  groupId: number | null
}

type ModelConfig = {
  provider: InferenceProvider
  internalName: string
}

export const supportedModels: Record<string, ModelConfig> = {
  'gpt-oss-120b': {
    provider: 'thunderbolt',
    internalName: 'openai/gpt-oss-120b',
  },
  'mistral-medium-3.1': {
    provider: 'mistral',
    internalName: 'mistral-medium-2508',
  },
  'mistral-large-3': {
    provider: 'mistral',
    internalName: 'mistral-large-2512',
  },
  'sonnet-4.5': {
    provider: 'anthropic',
    internalName: 'claude-sonnet-4-5',
  },
}

/**
 * Get or create a PromptLayer group for a conversation
 */
const getOrCreateGroup = async (conversationId: string): Promise<number | null> => {
  if (!isPromptLayerConfigured()) return null

  const existingGroup = conversationGroups.get(conversationId)
  if (existingGroup) return existingGroup

  const groupId = await createGroup()
  if (groupId) {
    conversationGroups.set(conversationId, groupId)
    // Limit cache size to prevent memory leaks
    if (conversationGroups.size > 10000) {
      const firstKey = conversationGroups.keys().next().value
      if (firstKey) conversationGroups.delete(firstKey)
    }
  }
  return groupId
}

/**
 * Inference API routes
 */
export const createInferenceRoutes = () => {
  return new Elysia({
    prefix: '/chat',
  }).post('/completions', async (ctx) => {
    const body = await ctx.request.json()

    if (!body.stream) {
      throw new Error('Non-streaming requests are not supported')
    }

    const modelConfig = supportedModels[body.model]
    if (!modelConfig) {
      throw new Error('Model not found')
    }

    const { provider, internalName } = modelConfig
    const { client } = getInferenceClient(provider)

    // Parse conversation context from headers
    const conversationId = ctx.request.headers.get('X-Conversation-Id') ?? undefined
    const turnNumber = parseInt(ctx.request.headers.get('X-Turn-Number') ?? '1', 10) || 1

    // Build PromptLayer context if configured
    let plContext: PromptLayerContext | null = null
    if (isPromptLayerConfigured()) {
      const plTags: string[] = ['thunderbolt', provider]
      if (conversationId) {
        plTags.push(`conversation:${conversationId}`)
        plTags.push(`turn:${turnNumber}`)
      }

      const groupId = conversationId ? await getOrCreateGroup(conversationId) : null

      plContext = {
        provider,
        model: body.model,
        messages: body.messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
        startTime: Date.now(),
        tags: plTags,
        groupId,
      }
    }

    const sessionInfo = conversationId ? ` [conversation: ${conversationId.slice(0, 8)}...]` : ''
    const promptLayerInfo = isPromptLayerConfigured() ? ' (PromptLayer enabled)' : ''
    console.info(`Routing model "${body.model}" to ${provider} provider${sessionInfo}${promptLayerInfo}`)

    try {
      const completion = await (client as PostHogOpenAI).chat.completions.create({
        model: internalName,
        messages: body.messages,
        temperature: body.temperature,
        tools: body.tools,
        tool_choice: body.tool_choice,
        stream: true,
        // PostHog properties (ignored if not using PostHog client)
        ...(isPostHogConfigured() && {
          posthogProperties: {
            model_provider: provider,
            endpoint: '/chat/completions',
            has_tools: !!body.tools,
            temperature: body.temperature,
            conversation_id: conversationId,
          },
        }),
      })

      // Create SSE stream with optional PromptLayer logging callback
      const sseStream = createSSEStreamFromCompletion(
        completion as Parameters<typeof createSSEStreamFromCompletion>[0],
        body.model,
        plContext
          ? (responseContent: string) => {
              // Log to PromptLayer after stream completes (fire and forget)
              logRequest({
                provider: plContext.provider,
                model: plContext.model,
                messages: plContext.messages,
                response: responseContent,
                startTime: plContext.startTime,
                endTime: Date.now(),
                tags: plContext.tags,
                groupId: plContext.groupId ?? undefined,
              }).catch((err) => console.error('[PromptLayer] Failed to log request:', err))
            }
          : undefined,
      )

      return new Response(sseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } catch (error) {
      if (error instanceof APIConnectionError) {
        console.error('Failed to connect to inference provider', error.cause)
        throw new Error('Failed to connect to inference provider')
      }
      if (error instanceof APIConnectionTimeoutError) {
        console.error('Connection timeout to inference provider', error.cause)
        throw new Error('Connection timeout to inference provider')
      }
      throw error
    }
  })
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use createInferenceRoutes instead
 */
export const createOpenAIRoutes = createInferenceRoutes
