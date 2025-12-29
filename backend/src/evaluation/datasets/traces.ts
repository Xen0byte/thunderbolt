/**
 * Trace-to-Dataset Conversion
 *
 * Utilities for converting production traces into test cases
 * that can be evaluated using the standard evaluation flow.
 */

import type { Dataset, TestCase, Trace } from '../core'
import type { OfflineInput } from '../executors/offline'
import type { QualityExpected } from '../evaluators/types'

/**
 * Convert traces to a Dataset for offline evaluation
 *
 * @example
 * ```typescript
 * const traces = await provider.fetchTraces({ limit: 50 })
 * const dataset = tracesToDataset(traces.traces, 'production-sample')
 * ```
 */
export const tracesToDataset = (
  traces: Trace[],
  name: string,
  description?: string,
): Dataset<OfflineInput, QualityExpected> => {
  const cases: TestCase<OfflineInput, QualityExpected>[] = traces.map((trace) => ({
    id: `trace-${trace.id}`,
    name: extractTraceName(trace),
    description: `Production trace from ${trace.timestamp.toISOString()}`,
    source: 'trace',
    input: {
      traceId: trace.id,
      question: extractQuestion(trace),
      existingOutput: trace.output,
      latencyMs: trace.latencyMs,
    },
    expected: inferExpected(trace),
    tags: inferTags(trace),
    metadata: {
      originalTraceId: trace.id,
      timestamp: trace.timestamp,
      model: trace.model,
      tokens: trace.tokens,
      ...trace.metadata,
    },
  }))

  return {
    name,
    description: description || `Dataset generated from ${traces.length} production traces`,
    source: 'trace',
    cases,
  }
}

/** Extract a human-readable name from a trace */
const extractTraceName = (trace: Trace): string => {
  const question = extractQuestion(trace)
  // Truncate long questions
  return question.length > 60 ? question.slice(0, 57) + '...' : question
}

/** Extract the user's question from a trace */
const extractQuestion = (trace: Trace): string => {
  if (trace.input.question) return trace.input.question

  // Find the last user message
  const userMessages = trace.input.messages.filter((m) => m.role === 'user')
  return userMessages[userMessages.length - 1]?.content || 'Unknown question'
}

/** Infer expected behavior from trace characteristics */
const inferExpected = (trace: Trace): QualityExpected => {
  const hasToolCalls = (trace.output.toolCalls?.length || 0) > 0
  const answerLength = trace.output.content.length

  return {
    // If the trace used tools, the question probably requires current info
    requiresCurrentInfo: hasToolCalls,
    // Infer length guidance from actual output
    lengthGuidance: answerLength < 200 ? 'brief' : answerLength > 1500 ? 'detailed' : 'moderate',
  }
}

/** Infer tags from trace characteristics */
const inferTags = (trace: Trace): string[] => {
  const tags: string[] = ['trace', 'production']

  if (trace.error) tags.push('error')
  if (trace.output.toolCalls?.length) tags.push('tool-usage')
  if (trace.model) tags.push(`model:${trace.model}`)

  return tags
}

/**
 * Filter traces by quality criteria before converting to dataset
 *
 * Useful for excluding bad traces (errors, empty responses, etc.)
 */
export const filterValidTraces = (traces: Trace[]): Trace[] => {
  return traces.filter((trace) => {
    // Exclude traces with errors
    if (trace.error) return false

    // Exclude empty responses
    if (!trace.output.content.trim()) return false

    // Exclude very short responses (likely errors)
    if (trace.output.content.length < 20) return false

    return true
  })
}

/**
 * Sample traces randomly from a larger set
 */
export const sampleTraces = (traces: Trace[], count: number): Trace[] => {
  if (traces.length <= count) return traces

  const shuffled = [...traces].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
