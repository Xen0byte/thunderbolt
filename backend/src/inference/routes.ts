import { safeErrorHandler } from '@/middleware/error-handling'
import { isPostHogConfigured } from '@/posthog/client'
import { createSSEStreamFromCompletion } from '@/utils/streaming'
import type { OpenAI as PostHogOpenAI } from '@posthog/ai'
import { Elysia } from 'elysia'
import { APIConnectionError, APIConnectionTimeoutError } from 'openai'
import { getInferenceClient, type InferenceProvider } from './client'

type ModelConfig = {
  provider: InferenceProvider
  internalName: string
}

export const supportedModels: Record<string, ModelConfig> = {
  'gpt-oss-120b': {
    provider: 'tinfoil', // Tinfoil POC: OpenAI-compatible client with encrypted inference
    internalName: 'gpt-oss-120b',
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
 * Inference API routes
 */
export const createInferenceRoutes = () => {
  return new Elysia({
    prefix: '/chat',
  })
    .onError(safeErrorHandler)
    .post('/completions', async (ctx) => {
      // EHBP passthrough: Forward encrypted requests directly to Tinfoil enclave
      const isEhbpEncrypted =
        ctx.request.headers.get('ehbp-encapsulated-key') || ctx.request.headers.get('x-tinfoil-enclave-url')

      if (isEhbpEncrypted) {
        const { getSettings } = await import('@/config/settings')
        const settings = getSettings()

        if (!settings.tinfoilApiKey) {
          throw new Error('Tinfoil API key not configured')
        }

        const enclaveBaseUrl = ctx.request.headers.get('x-tinfoil-enclave-url')
        if (!enclaveBaseUrl) {
          throw new Error('X-Tinfoil-Enclave-Url header missing')
        }

        const upstreamUrl = `${enclaveBaseUrl}/v1/chat/completions`
        const ehbpKey = ctx.request.headers.get('ehbp-encapsulated-key')

        console.info(`[EHBP] Proxying encrypted request to ${upstreamUrl}`)

        let response: Response
        try {
          response = await fetch(upstreamUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${settings.tinfoilApiKey}`,
              'Content-Type': 'application/json',
              Accept: ctx.request.headers.get('accept') || 'application/json',
              ...(ehbpKey && { 'Ehbp-Encapsulated-Key': ehbpKey }),
            },
            body: ctx.request.body,
            duplex: 'half' as any,
          } as RequestInit)
        } catch (error) {
          console.error('[EHBP] Proxy request failed:', error)
          throw new Error(`Failed to proxy request to Tinfoil: ${error}`)
        }

        const ehbpResponseNonce = response.headers.get('ehbp-response-nonce')
        if (!ehbpResponseNonce) {
          console.warn('[EHBP] Missing Ehbp-Response-Nonce in response')
        }

        const responseHeaders = new Headers({
          'Content-Type': response.headers.get('Content-Type') || 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': ctx.request.headers.get('origin') || '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Expose-Headers': 'Ehbp-Response-Nonce',
        })

        if (ehbpResponseNonce) {
          responseHeaders.set('Ehbp-Response-Nonce', ehbpResponseNonce)
        }

        return new Response(response.body, {
          status: response.status,
          headers: responseHeaders,
        })
      }

      // Standard flow: Parse JSON body for non-encrypted requests
      const body = await ctx.request.json()

      if (!body.stream) {
        throw new Error('Non-streaming requests are not supported')
      }

      const modelConfig = supportedModels[body.model]
      if (!modelConfig) {
        throw new Error('Model not found')
      }

      const { provider, internalName } = modelConfig

      // Tinfoil requests should always use EHBP (handled above)
      if (provider === 'tinfoil') {
        throw new Error('Tinfoil requests must use EHBP encryption')
      }

      // Standard flow for other providers
      const { client } = getInferenceClient(provider)

      console.info(`Routing model "${body.model}" to ${provider} provider`)

      try {
        const completion = await (client as PostHogOpenAI).chat.completions.create({
          model: internalName,
          messages: body.messages,
          temperature: body.temperature,
          tools: body.tools,
          tool_choice: body.tool_choice,
          stream: true,
          ...(isPostHogConfigured() && {
            posthogProperties: {
              model_provider: provider,
              endpoint: '/chat/completions',
              has_tools: !!body.tools,
              temperature: body.temperature,
              // @todo add distinct id and trace id
            },
          }),
        })

        const stream = createSSEStreamFromCompletion(completion, body.model)

        return new Response(stream, {
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
