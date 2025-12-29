/**
 * Single-Turn Executor
 *
 * Executes a single request-response interaction with the model.
 * Used for behavioral testing.
 */

import { defineExecutor, type ExecutionResult } from '../core'
import type { BehavioralInput, BehavioralOutput } from '../evaluators/types'

/**
 * Parse streaming SSE response to extract content and tool calls
 */
const parseStreamingResponse = async (response: Response): Promise<BehavioralOutput> => {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let content = ''
  const toolCalls: BehavioralOutput['toolCalls'] = []
  let finishReason: string | undefined
  let buffer = ''

  // Track tool calls being built
  const pendingToolCalls: Map<number, { name: string; arguments: string }> = new Map()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta

        if (delta?.content) {
          content += delta.content
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0

            if (tc.function?.name) {
              pendingToolCalls.set(idx, { name: tc.function.name, arguments: '' })
            }

            if (tc.function?.arguments) {
              const pending = pendingToolCalls.get(idx)
              if (pending) {
                pending.arguments += tc.function.arguments
              }
            }
          }
        }

        if (parsed.choices?.[0]?.finish_reason) {
          finishReason = parsed.choices[0].finish_reason
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  // Convert pending tool calls to final format
  for (const tc of pendingToolCalls.values()) {
    toolCalls.push(tc)
  }

  return { content, toolCalls, finishReason }
}

/**
 * Single-turn executor for behavioral tests
 */
export const singleTurnExecutor = defineExecutor<BehavioralInput, BehavioralOutput>({
  name: 'single-turn',
  description: 'Executes a single request-response interaction',

  async execute(input, config): Promise<ExecutionResult<BehavioralOutput>> {
    const startTime = Date.now()

    try {
      const messages = input.messages || [{ role: 'user', content: input.question || '' }]

      // Build source tags for trace differentiation
      const sourceTags = (config.sourceTags as string[]) ?? ['evaluation', 'behavioral']

      const response = await fetch(`${config.backendUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Evaluation-Source': sourceTags.join(','),
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: true,
          temperature: config.temperature ?? 0.7,
          tools: [
            {
              type: 'function',
              function: {
                name: 'web_search',
                description: 'Search the web for information',
                parameters: {
                  type: 'object',
                  properties: { query: { type: 'string', description: 'Search query' } },
                  required: ['query'],
                },
              },
            },
            {
              type: 'function',
              function: {
                name: 'fetch_content',
                description: 'Fetch content from a URL',
                parameters: {
                  type: 'object',
                  properties: { url: { type: 'string', description: 'URL to fetch' } },
                  required: ['url'],
                },
              },
            },
          ],
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const output = await parseStreamingResponse(response)
      const latencyMs = Date.now() - startTime

      return { output, latencyMs }
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Unknown error'
      const latencyMs = Date.now() - startTime

      return {
        output: { content: '', toolCalls: [], finishReason: 'error' },
        latencyMs,
        error,
      }
    }
  },
})
