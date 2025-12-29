/**
 * Core Types for the Evaluation Framework
 *
 * Provider-agnostic types used across all evaluators, executors, and reporters.
 */

/**
 * Evaluation score returned by evaluators
 */
export type EvalScore = {
  /** Score value from 0.0 to 1.0 */
  value: number
  /** Whether the score passes the threshold (default: >= 0.5) */
  passed: boolean
  /** Human-readable explanation of the score */
  reasoning: string
  /** Optional additional data */
  metadata?: Record<string, unknown>
}

/**
 * Data source identifier
 */
export type DataSource = 'dataset' | 'trace'

/**
 * A single test case in a dataset
 */
export type TestCase<TInput = unknown, TExpected = unknown> = {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Optional description */
  description?: string
  /** Data source: 'dataset' (synthetic) or 'trace' (production) */
  source: DataSource
  /** Input data for the test */
  input: TInput
  /** Expected output (for reference-based evaluation) */
  expected?: TExpected
  /** Tags for filtering */
  tags?: string[]
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * A collection of test cases
 */
export type Dataset<TInput = unknown, TExpected = unknown> = {
  /** Dataset name */
  name: string
  /** Dataset description */
  description?: string
  /** Data source: 'dataset' (synthetic) or 'trace' (production) */
  source: DataSource
  /** Test cases in the dataset */
  cases: TestCase<TInput, TExpected>[]
}

/**
 * Result of executing a single test case
 */
export type TestResult<TInput = unknown, TOutput = unknown> = {
  /** Test case ID */
  testCaseId: string
  /** Test case name */
  testCaseName: string
  /** Input that was sent to the executor */
  input: TInput
  /** Output from the executor */
  output: TOutput
  /** Scores from each evaluator */
  scores: Record<string, EvalScore>
  /** Aggregate score (average of all evaluator scores) */
  overallScore: number
  /** Whether all evaluators passed */
  passed: boolean
  /** Execution latency in milliseconds */
  latencyMs: number
  /** Error message if execution failed */
  error?: string
}

/**
 * Result of running an entire test suite
 */
export type SuiteResult<TInput = unknown, TOutput = unknown> = {
  /** Suite name */
  suiteName: string
  /** When the suite was run */
  timestamp: Date
  /** Model used for the evaluation */
  model: string
  /** Provider used for tracking */
  provider: string
  /** Results for each test case */
  results: TestResult<TInput, TOutput>[]
  /** Aggregate statistics */
  summary: {
    total: number
    passed: number
    failed: number
    errored: number
    avgScore: number
    avgLatencyMs: number
    /** Average score per evaluator */
    scoresByEvaluator: Record<string, number>
  }
  /** Link to view results in provider UI */
  url?: string
}

/**
 * Configuration for test execution
 */
export type ExecutorConfig = {
  /** Backend URL for API calls */
  backendUrl: string
  /** Model to use */
  model: string
  /** Request timeout in ms */
  timeoutMs: number
  /** Optional temperature */
  temperature?: number
  /**
   * Source tags for trace differentiation.
   * These tags are sent via X-Evaluation-Source header to identify
   * evaluation traces vs production traces in observability systems.
   *
   * Default values by executor:
   * - singleTurnExecutor: ['evaluation', 'behavioral']
   * - multiTurnExecutor: ['evaluation', 'quality']
   *
   * Production traces default to: ['production', 'chat']
   */
  sourceTags?: string[]
  /** Additional executor-specific config */
  [key: string]: unknown
}

/**
 * Message in a conversation
 */
export type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

/**
 * Tool call in a message
 */
export type ToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * Tool invocation record
 */
export type ToolInvocation = {
  turn: number
  callId: string
  tool: string
  arguments: Record<string, unknown>
  result: string
  latencyMs: number
  error?: string
}

// =============================================================================
// TRACE TYPES (for evaluating production data)
// =============================================================================

/**
 * A production trace from observability data
 *
 * Represents a real request/response captured in production.
 * Used for offline evaluation (no re-execution needed).
 */
export type Trace = {
  /** Unique trace ID from the provider */
  id: string
  /** When the trace was captured */
  timestamp: Date
  /** Model used */
  model: string
  /** User input (question/messages) */
  input: {
    messages: Message[]
    question?: string
  }
  /** Model output */
  output: {
    content: string
    toolCalls?: Array<{
      name: string
      arguments: string
      result?: string
    }>
  }
  /** Execution latency in ms */
  latencyMs: number
  /** Token usage */
  tokens?: {
    input: number
    output: number
    total: number
  }
  /** Additional metadata from provider */
  metadata?: Record<string, unknown>
  /** Error if the trace represents a failed request */
  error?: string
}

/**
 * Options for sampling traces from a provider
 */
export type TraceSampleOptions = {
  /** Maximum number of traces to fetch */
  limit?: number
  /** Only traces after this date */
  since?: Date
  /** Only traces before this date */
  until?: Date
  /** Filter by model */
  model?: string
  /** Filter by tags/labels (include only these) */
  tags?: string[]
  /** Exclude traces with these tags (e.g., ['evaluation'] to exclude test runs) */
  excludeTags?: string[]
  /** Only traces with errors */
  errorsOnly?: boolean
  /** Random sampling (vs most recent) */
  random?: boolean
  /** Provider-specific filters */
  filter?: Record<string, unknown>
}
