/**
 * Multi-Turn Executor
 *
 * Executes multi-turn conversations with real tool execution.
 * Used for quality testing.
 */

import { defineExecutor, type ExecutionResult, type Message, type ToolCall } from '../core'
import type { QualityInput, QualityOutput } from '../evaluators/types'
import { runTool } from './tool-runner'

const MAX_TURNS = 5

type ToolCallRecord = QualityOutput['toolCalls'][number]

/**
 * Parse streaming response and extract content/tool calls
 */
const parseStreamingResponse = async (
  response: Response,
): Promise<{
  content: string
  toolCalls: ToolCall[]
  finishReason: string
}> => {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let content = ''
  const toolCalls: ToolCall[] = []
  let finishReason = 'stop'
  let buffer = ''

  // Track tool calls being built
  const pendingToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map()

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

            if (tc.id) {
              pendingToolCalls.set(idx, { id: tc.id, name: '', arguments: '' })
            }

            if (tc.function?.name) {
              const pending = pendingToolCalls.get(idx)
              if (pending) pending.name = tc.function.name
            }

            if (tc.function?.arguments) {
              const pending = pendingToolCalls.get(idx)
              if (pending) pending.arguments += tc.function.arguments
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
    toolCalls.push({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: tc.arguments },
    })
  }

  return { content, toolCalls, finishReason }
}

/**
 * Multi-turn executor for quality tests
 */
export const multiTurnExecutor = defineExecutor<QualityInput, QualityOutput>({
  name: 'multi-turn',
  description: 'Executes multi-turn conversations with real tool execution',

  async execute(input, config): Promise<ExecutionResult<QualityOutput>> {
    const startTime = Date.now()
    const messages: Message[] = [{ role: 'user', content: input.question }]
    const allToolCalls: ToolCallRecord[] = []
    let turnCount = 0
    let finalAnswer = ''
    let status: QualityOutput['status'] = 'completed'

    // Build source tags for trace differentiation
    const sourceTags = (config.sourceTags as string[]) ?? ['evaluation', 'quality']

    try {
      while (turnCount < MAX_TURNS) {
        turnCount++

        // Check timeout
        if (Date.now() - startTime > config.timeoutMs) {
          status = 'timeout'
          break
        }

        // Call the model
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
          signal: AbortSignal.timeout(config.timeoutMs - (Date.now() - startTime)),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API error: ${response.status} - ${errorText}`)
        }

        const { content, toolCalls, finishReason } = await parseStreamingResponse(response)

        // Add assistant message
        if (content || toolCalls.length > 0) {
          const assistantMsg: Message = { role: 'assistant', content }
          if (toolCalls.length > 0) {
            assistantMsg.tool_calls = toolCalls
          }
          messages.push(assistantMsg)
        }

        // If no tool calls, we have a final answer
        if (toolCalls.length === 0 || finishReason === 'stop') {
          finalAnswer = content
          break
        }

        // Execute tool calls
        for (const tc of toolCalls) {
          let args: Record<string, unknown> = {}
          try {
            args = JSON.parse(tc.function.arguments)
          } catch {
            args = {}
          }

          const toolResult = await runTool(tc.function.name, args, config)

          // Record the tool call
          allToolCalls.push({
            tool: tc.function.name,
            arguments: args,
            result: toolResult.result,
            error: toolResult.error,
          })

          // Add tool result to messages
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: toolResult.success ? toolResult.result : `Error: ${toolResult.error}`,
          })
        }
      }

      if (turnCount >= MAX_TURNS && !finalAnswer) {
        status = 'max_turns'
        // Get the last assistant message as the answer
        const lastAssistant = messages.filter((m) => m.role === 'assistant').pop()
        finalAnswer = lastAssistant?.content || ''
      }

      const latencyMs = Date.now() - startTime

      return {
        output: {
          answer: finalAnswer,
          toolCalls: allToolCalls,
          turnCount,
          latencyMs,
          status,
        },
        latencyMs,
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Unknown error'
      const latencyMs = Date.now() - startTime

      return {
        output: {
          answer: finalAnswer,
          toolCalls: allToolCalls,
          turnCount,
          latencyMs,
          status: 'error',
          error,
        },
        latencyMs,
        error,
      }
    }
  },
})
