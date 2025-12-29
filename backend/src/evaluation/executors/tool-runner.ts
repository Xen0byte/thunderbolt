/**
 * Tool Runner
 *
 * Executes tools (web_search, fetch_content) by calling the backend.
 */

import type { ExecutorConfig } from '../core'

export type ToolResult = {
  success: boolean
  result: string
  error?: string
  latencyMs: number
}

/**
 * Execute a tool by calling the backend
 */
export const runTool = async (
  toolName: string,
  args: Record<string, unknown>,
  config: ExecutorConfig,
): Promise<ToolResult> => {
  const startTime = Date.now()

  try {
    if (toolName === 'web_search') {
      const response = await fetch(`${config.backendUrl}/v1/pro/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: args.query }),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`)
      }

      const data = await response.json()
      const results = data.results || []

      // Format results as text
      const formattedResults = results
        .slice(0, 5)
        .map((r: { title: string; url: string; text: string }) => `Title: ${r.title}\nURL: ${r.url}\n${r.text}`)
        .join('\n\n---\n\n')

      return {
        success: true,
        result: formattedResults || 'No results found',
        latencyMs: Date.now() - startTime,
      }
    }

    if (toolName === 'fetch_content') {
      const response = await fetch(`${config.backendUrl}/v1/pro/fetch-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: args.url }),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        throw new Error(`Fetch API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.content || data.text || ''

      // Truncate if too long
      const maxLength = 10000
      const truncated = content.length > maxLength ? content.slice(0, maxLength) + '\n\n[Content truncated]' : content

      return {
        success: true,
        result: truncated || 'No content found',
        latencyMs: Date.now() - startTime,
      }
    }

    // Unknown tool
    return {
      success: false,
      result: '',
      error: `Unknown tool: ${toolName}`,
      latencyMs: Date.now() - startTime,
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Tool execution failed'
    return {
      success: false,
      result: '',
      error,
      latencyMs: Date.now() - startTime,
    }
  }
}
