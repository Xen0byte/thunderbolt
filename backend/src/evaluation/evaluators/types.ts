/**
 * Types for Evaluators
 *
 * Shared types used by both behavioral and quality evaluators.
 */

/**
 * Expected behavior for behavioral test cases
 */
export type ExpectedBehavior = {
  shouldUseTools?: boolean
  expectedToolCount?: { min?: number; max?: number }
  shouldAvoidTables?: boolean
  maxResponseLength?: number
  shouldBeSearchFirst?: boolean
}

/**
 * Output from single-turn execution (behavioral tests)
 */
export type BehavioralOutput = {
  content: string
  toolCalls: Array<{ name: string; arguments: string }>
  finishReason?: string
}

/**
 * Input for behavioral tests
 */
export type BehavioralInput = {
  messages: Array<{ role: string; content: string }>
  question?: string
}

/**
 * Output from multi-turn execution (quality tests)
 */
export type QualityOutput = {
  answer: string
  toolCalls: Array<{
    tool: string
    arguments: Record<string, unknown>
    result: string
    error?: string
  }>
  turnCount: number
  latencyMs: number
  status: 'completed' | 'max_turns' | 'timeout' | 'error'
  error?: string
}

/**
 * Input for quality tests
 */
export type QualityInput = {
  question: string
  testCaseId?: string
  testCaseName?: string
}

/**
 * Expected output for quality tests
 */
export type QualityExpected = {
  referenceAnswer?: string
  requiredFacts?: string[]
  requiresCurrentInfo?: boolean
  lengthGuidance?: 'brief' | 'moderate' | 'detailed'
}
