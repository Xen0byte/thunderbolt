/**
 * Executor Interface
 *
 * Defines the contract for test executors that run tests against the model.
 */

import type { ExecutorConfig } from './types'

/**
 * Result from executing a test
 */
export type ExecutionResult<TOutput> = {
  /** Output from the model */
  output: TOutput
  /** Execution time in milliseconds */
  latencyMs: number
  /** Error message if execution failed */
  error?: string
}

/**
 * Executor interface
 */
export type Executor<TInput, TOutput> = {
  /** Executor name */
  readonly name: string
  /** Executor description */
  readonly description: string

  /**
   * Execute a test with the given input
   */
  execute(input: TInput, config: ExecutorConfig): Promise<ExecutionResult<TOutput>>
}

/**
 * Configuration for defining an executor
 */
export type ExecutorDefinition<TInput, TOutput> = {
  name: string
  description: string
  execute: (input: TInput, config: ExecutorConfig) => Promise<ExecutionResult<TOutput>>
}

/**
 * Create an executor
 */
export const defineExecutor = <TInput, TOutput>(
  definition: ExecutorDefinition<TInput, TOutput>,
): Executor<TInput, TOutput> => ({
  name: definition.name,
  description: definition.description,
  execute: definition.execute,
})
